Keep two dicts: cell id → set of driver ids (what `nearby` and `count_in` read) and driver id → current cell id (what lets you move or remove a driver without searching every cell).
---
In `upsert`, look up the driver's previous cell first and discard the driver from that set before adding them to the new one. `remove` is the same "leave the cell" step, returning whether a previous cell existed: `pop(driver_id, None)` on the driver → cell dict gives you the old cell and forgets it in one call.
---
For `nearby`, compute the center `row` and `col` with `math.floor`, then loop `r` over `range(row - rings, row + rings + 1)` and `c` over `range(col - rings, col + rings + 1)`, collect every driver of `f"{r}:{c}"` and finish with `sorted()`.
