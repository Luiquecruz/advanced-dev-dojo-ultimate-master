Every stage keeps its `for` loop and swaps "append to a list" for `yield`. In `parse`, skip blank lines with `continue`, split with `str.partition(" ")` so a line without a space still unpacks, and build the error message from the line itself, for example with `{line!r}`.
---
`chunked` must hand out a chunk the moment it is full, not when the next item arrives, or the pipeline reads further than the chunk needs. `itertools.batched(items, size)` already does that; convert each tuple to a list.
---
`pipeline` becomes a generator when its body yields: put `yield from chunked(only_errors(parse(source)), size)` inside `try:` and call `source.close()` in `finally:`. Returning the stage chain directly gives the caller a generator whose `close()` never reaches `Source.close()`.
