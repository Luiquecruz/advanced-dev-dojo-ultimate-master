Keep two maps: cell id → set of driver ids (what `nearby` and `countIn` read) and driver id → current cell id (what lets you move or remove a driver without searching every cell).
---
In `upsert`, look up the driver's previous cell first and delete the driver from that set before adding them to the new one. `remove` is the same "leave the cell" step, returning whether a previous cell existed.
---
For `nearby`, compute the center `row` and `col` with `Math.floor`, then loop `r` from `row - rings` to `row + rings` and `c` from `col - rings` to `col + rings`, collect every driver of `` `${r}:${c}` `` and finish with `.sort()`.
