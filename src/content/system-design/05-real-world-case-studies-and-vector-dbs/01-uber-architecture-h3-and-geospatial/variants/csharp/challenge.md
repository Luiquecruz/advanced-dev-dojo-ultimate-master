Build a small spatial index for nearby drivers. It uses a **square** grid in degrees, a teaching simplification of H3: real H3 uses hexagons on a sphere, but the mechanism is the same (a point becomes a cell id, a query reads a cell and the rings around it).

```csharp
public class GridIndex
{
    public GridIndex(double cellSizeDegrees);
    public string CellOf(double lat, double lon);
    public void Upsert(string driverId, double lat, double lon);
    public bool Remove(string driverId);
    public int CountIn(string cellId);
    public IReadOnlyList<string> Nearby(double lat, double lon, int rings);
}
```

The tests create the index with `new GridIndex(cellSizeDegrees: ...)` and pass `rings` by name.

- `CellOf(lat, lon)` returns `$"{row}:{col}"` with `row = (long)Math.Floor(lat / cellSizeDegrees)` and `col = (long)Math.Floor(lon / cellSizeDegrees)`, formatted with the invariant culture. Negative coordinates floor down: with a cell size of `1`, `CellOf(-0.5, -0.5)` is `"-1:-1"`.
- `Upsert(driverId, lat, lon)` records the driver's position. A driver that is already indexed **moves**: it leaves its previous cell and is found only in the new one.
- `Remove(driverId)` takes the driver out of the index and returns `true`, or returns `false` when the driver is not indexed.
- `CountIn(cellId)` returns how many drivers are currently in that cell (the supply of the cell), `0` for an empty or unknown cell.
- `Nearby(lat, lon, rings)` returns the ids of the drivers in the cell of `(lat, lon)` and in every cell within `rings` steps of it, counting diagonal neighbors: rows `row - rings` to `row + rings` and columns `col - rings` to `col + rings`, so `rings: 0` is the cell alone and `rings: 1` is a 3 × 3 block. Ids are sorted with `StringComparer.Ordinal`, each id once.

Each `new GridIndex(...)` starts empty. There is no wrap-around at the poles or at the antimeridian: column `-180` is not a neighbor of column `179`.
