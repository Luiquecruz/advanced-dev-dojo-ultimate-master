Keep two dictionaries: `_cells`, cell id → `HashSet<string>` of driver ids (what `Nearby` and `CountIn` read), and `_cellOfDriver`, driver id → current cell id (what lets you move or remove a driver without searching every cell).
---
In `Upsert`, look up the driver's previous cell first and remove the driver from that set before adding them to the new one. `Remove` is the same "leave the cell" step, returning whether a previous cell existed: `_cellOfDriver.Remove(driverId, out var previous)` gives you the old cell and forgets it in one call.
---
For `Nearby`, compute the center `row` and `col` with `(long)Math.Floor(...)`, then loop `r` from `row - rings` to `row + rings` and `c` from `col - rings` to `col + rings`, collect every driver of the cell `$"{r}:{c}"` and finish with `Sort(StringComparer.Ordinal)`. Build every id in one helper, `string.Create(CultureInfo.InvariantCulture, $"{row}:{col}")`, so `CellOf` and `Nearby` always agree.
