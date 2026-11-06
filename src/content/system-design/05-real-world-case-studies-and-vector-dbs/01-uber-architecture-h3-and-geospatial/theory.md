# Uber Architecture: H3 & Geospatial Indexing

A ride-hailing request is a geometry question asked constantly: which available drivers are near this rider right now? The answer has to come back fast while every driver keeps moving and reporting new positions. This lesson looks at H3, the open-source hexagonal grid Uber built to analyze and optimize its marketplace, and at how the same idea (turn space into keys) lets you shard, cache and stream location data with the tools from earlier modules. It ends with DOMA, the way Uber's engineering blog describes organizing its microservices into domains and layers.

You need: Storage Engines: B-Trees vs LSM Trees, Consistent Hashing with Virtual Nodes, Message Queues & Event Streams, and Caching Patterns & Stampede Mitigation.

## Why a bounding box does not scale

The first design most people write stores `lat` and `lon` columns and asks for a box around the rider:

```sql
SELECT driver_id FROM drivers
WHERE lat BETWEEN 37.76 AND 37.79 AND lon BETWEEN -122.43 AND -122.40;
```

A B-tree orders rows by one key. An index on `lat` narrows the search to a latitude band that circles the whole planet, so the query still visits every driver at that latitude on every continent and filters by `lon` afterwards. A composite index `(lat, lon)` has the same problem: only the first column's range is used to seek. Two separate indexes produce two large candidate sets to intersect. Meanwhile each driver's position changes every few seconds, so the same index is rewritten constantly. At city scale it works; at global scale the reads touch far more rows than they return and the writes fight the reads.

## Cells: turning space into keys

A **grid system** divides the Earth into cells and gives each cell an identifier. Indexing a point means computing the cell that contains it, which is pure arithmetic and needs no database. "Drivers near the rider" becomes "drivers in the rider's cell and the cells around it": a small, fixed set of exact-match lookups (`cell = ?`) instead of a range scan.

Once a location is a key, every tool you already know applies:

- **Sharding**: partition drivers by cell id (or by a coarser parent cell so a city stays together) on a consistent hash ring.
- **Caching**: the list of drivers in a cell is a cache entry with a short TTL; a burst of riders in one neighborhood reads the same few keys.
- **Streaming**: location updates are events keyed by a coarse cell, so one partition sees every update for a region in order.

## H3: hexagons in a hierarchy

H3 is the grid system Uber built and open-sourced for analyzing and optimizing its marketplace, including pricing and dispatch. Its main design choices:

- **Hexagons.** A square has two kinds of neighbors: four that share an edge and four that share only a corner, at a different distance. A hexagon has six neighbors, all at the same distance from its center. That makes "within k steps" a good approximation of a circle and keeps analysis simple as people move between cells.
- **Resolutions.** H3 has 16 resolutions, from 0 (coarsest) to 15 (finest). Each finer resolution has cells with about one seventh of the area of the coarser one. Hexagons do not split exactly into seven smaller hexagons, so a child is only approximately contained in its parent; cell boundaries at a single resolution are exact.
- **Integer ids.** A cell id is a 64-bit integer. Finding the parent at a coarser resolution is a few bitwise operations, and geographically close cells tend to have numerically close ids. Ids fit naturally as shard keys, cache keys and join keys.
- **Neighbors.** `gridDisk(cell, k)` returns every cell within grid distance `k` (the k-ring): 7 cells for `k = 1`, 19 for `k = 2` (fewer next to a pentagon). A nearby-drivers query reads those cells and then ranks the candidates by real distance or estimated arrival time.
- **Pentagons.** A sphere cannot be tiled with hexagons only, so every resolution has exactly 12 pentagons, placed over water by the grid's orientation.

## Locations as a stream, supply and demand per cell

In a design like this, driver apps publish their position periodically to a stream such as Kafka, keyed by a coarse parent cell, so each driver's updates arrive in order on one partition while the driver stays in that area. Consumers keep two views up to date: the current cell of each driver (for dispatch) and counts per cell (for analysis). Uber's H3 article describes calculating surge pricing by measuring supply and demand in hexagons: when part of a city has more demand than supply, pricing adjusts in response. Because the counts are aggregated per cell id, they can be computed in parallel per partition and compared across a city without custom geometry.

The index must *move* a driver, not just add one: an update removes the driver from the previous cell before adding them to the new one. Otherwise a driver appears in every cell they drove through, and both dispatch and the supply counts are wrong.

## DOMA: organizing the services

Uber's engineering blog describes **Domain-Oriented Microservice Architecture (DOMA)** as its way to keep a very large set of microservices understandable:

- **Domains**: a collection of one or more microservices tied to one logical area of functionality, such as map search, fares or matching riders and drivers.
- **Layers**: domains are grouped into layers (infrastructure, business, product, presentation, edge), and a layer only depends on the layers beneath it, so the lower a domain sits, the more services depend on it and the larger the blast radius of its failures.
- **Gateways**: each domain exposes a single entry point, so callers depend on one interface while the services behind it change.
- **Extensions**: other teams add logic or data through defined extension points instead of changing the domain's core code.

## Common mistakes

- **Latitude/longitude bounding-box scans at global scale.** A B-tree seeks on one column, so the box query walks a latitude band around the planet and filters the rest. Use a grid cell id as the key and read a fixed set of neighbor cells.
- **Adding a driver to the new cell without removing them from the old one.** Stale entries make the driver appear in several places and inflate the supply of cells they left.
- **Picking one resolution for every question.** Fine cells suit dispatch; coarse cells suit city-wide supply and demand. Use the parent id rather than storing a second copy of the data.

## In practice

Index points into cells at write time and store the cell id next to the coordinates. Query the k-ring of cells, then rank the small candidate set by exact distance. Shard and partition by a coarse parent cell so one city's traffic stays together, and watch for hot cells (an airport, a stadium) the same way you watch for hot keys.

## Check yourself

1. Why does a `(lat, lon)` composite index still scan far more rows than a "drivers in these 7 cells" query?
2. Why do hexagons approximate a radius better than squares, and how many cells are within grid distance 2 of a hexagon?
3. A driver keeps appearing in a cell they left ten minutes ago. Which step of the location update is missing?
