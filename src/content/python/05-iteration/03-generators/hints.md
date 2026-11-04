Replace "append to a result list" with `yield`. In `read_blocks`, `yield block` where the starter appends it, start a **new** list for the next block (clearing the yielded one would empty it for the caller too), and after the loop yield the last block if it holds any lines.
---
In `take`, the order of "yield" and "check the count" decides how much is read. If you pull an item and only then notice you already have enough, that item is gone from a shared iterator. Yield the item first, then stop as soon as you have yielded `count` items. Handle `count <= 0` before the loop.
---
`id_sequence` is a `while True:` loop around one `yield`. Keep the counter in a local variable of the generator, never at module level, so each call starts at `1`. An endless generator is safe because the caller decides how many items to pull.
