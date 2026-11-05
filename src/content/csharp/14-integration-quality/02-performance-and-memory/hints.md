In `Parse`, `int comma = line.IndexOf(',');` gives the split point (-1 when there is none). `line[..comma].Trim()` and `line[(comma + 1)..].Trim()` are new spans over the same characters, so nothing is copied until `sku.ToString()`.
---
In `SumQuantities`, keep a `ReadOnlySpan<char> rest = text;` and loop while it is not empty: find the next `'\n'`, take the line before it, and move `rest` past it (or to `ReadOnlySpan<char>.Empty` on the last line). `Trim()` removes a trailing `'\r'` too, so `line.Trim().IsEmpty` detects blank lines on both line-ending styles.
---
In `Compute`, write `byte[] buffer = pool.Rent(BufferSize);` and then `try { ... } finally { pool.Return(buffer); }`. Inside the loop, `int read = input.Read(buffer, 0, BufferSize);` says how many bytes are fresh; add up `buffer.AsSpan(0, read)`, never `buffer` itself, because its `Length` can be larger and the rest holds old data.
