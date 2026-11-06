Build a small spatial index for nearby drivers. It uses a **square** grid in degrees, a teaching simplification of H3: real H3 uses hexagons on a sphere, but the mechanism is the same (a point becomes a cell id, a query reads a cell and the rings around it).

```python
class GridIndex:
    def __init__(self, cell_size_degrees: float): ...
    def cell_of(self, lat: float, lon: float) -> str: ...
    def upsert(self, driver_id: str, lat: float, lon: float) -> None: ...
    def remove(self, driver_id: str) -> bool: ...
    def count_in(self, cell_id: str) -> int: ...
    def nearby(self, lat: float, lon: float, rings: int) -> list[str]: ...
```

The tests create the index with `GridIndex(cell_size_degrees=...)` and pass `rings` by keyword.

- `cell_of(lat, lon)` returns `f"{row}:{col}"` with `row = math.floor(lat / cell_size_degrees)` and `col = math.floor(lon / cell_size_degrees)`. Negative coordinates floor down: with a cell size of `1`, `cell_of(-0.5, -0.5)` is `"-1:-1"`.
- `upsert(driver_id, lat, lon)` records the driver's position. A driver that is already indexed **moves**: it leaves its previous cell and is found only in the new one.
- `remove(driver_id)` takes the driver out of the index and returns `True`, or returns `False` when the driver is not indexed.
- `count_in(cell_id)` returns how many drivers are currently in that cell (the supply of the cell), `0` for an empty or unknown cell.
- `nearby(lat, lon, rings)` returns a list with the ids of the drivers in the cell of `(lat, lon)` and in every cell within `rings` steps of it, counting diagonal neighbors: rows `row - rings` to `row + rings` and columns `col - rings` to `col + rings`, so `rings=0` is the cell alone and `rings=1` is a 3 × 3 block. Ids are returned in `sorted()` order, each id once.

Each `GridIndex` starts empty. There is no wrap-around at the poles or at the antimeridian: column `-180` is not a neighbor of column `179`.
