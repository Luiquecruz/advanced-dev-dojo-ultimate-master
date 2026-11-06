Build a small spatial index for nearby drivers. It uses a **square** grid in degrees, a teaching simplification of H3: real H3 uses hexagons on a sphere, but the mechanism is the same (a point becomes a cell id, a query reads a cell and the rings around it).

```ts
interface GridIndexOptions { cellSizeDegrees: number }

interface GridIndex {
  cellOf(lat: number, lon: number): string;
  upsert(driverId: string, lat: number, lon: number): void;
  remove(driverId: string): boolean;
  countIn(cellId: string): number;
  nearby(lat: number, lon: number, rings: number): string[];
}

export function createGridIndex(options: GridIndexOptions): GridIndex
```

- `cellOf(lat, lon)` returns `` `${row}:${col}` `` with `row = Math.floor(lat / cellSizeDegrees)` and `col = Math.floor(lon / cellSizeDegrees)`. Negative coordinates floor down: with a cell size of `1`, `cellOf(-0.5, -0.5)` is `'-1:-1'`.
- `upsert(driverId, lat, lon)` records the driver's position. A driver that is already indexed **moves**: it leaves its previous cell and is found only in the new one.
- `remove(driverId)` takes the driver out of the index and returns `true`, or returns `false` when the driver is not indexed.
- `countIn(cellId)` returns how many drivers are currently in that cell (the supply of the cell), `0` for an empty or unknown cell.
- `nearby(lat, lon, rings)` returns the ids of the drivers in the cell of `(lat, lon)` and in every cell within `rings` steps of it, counting diagonal neighbors: rows `row - rings` to `row + rings` and columns `col - rings` to `col + rings`, so `rings = 0` is the cell alone and `rings = 1` is a 3 × 3 block. Ids are returned sorted with the default `Array.prototype.sort()` order, each id once.

Each call to `createGridIndex` starts empty. There is no wrap-around at the poles or at the antimeridian: column `-180` is not a neighbor of column `179`.
