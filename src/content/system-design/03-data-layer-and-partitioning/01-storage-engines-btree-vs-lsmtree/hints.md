Use one internal `write(key, value)` for both operations: `put` passes the value and `delete` passes `null`. A tombstone is just an entry whose value is `null`, so it flushes, sorts and shadows older entries exactly like a value.
---
Flushing is `[...memtable.entries()].sort(...)` compared by key, pushed onto the SSTable list, followed by a fresh `Map`. Check `memtable.size >= memtableLimit` right after the write.
---
In `get`, use `memtable.has(key)` (not the value) to decide whether the MemTable answers, because a tombstone is stored as `null`. Then loop the SSTables from the last index down to `0` and return on the first entry found: `entry[1] ?? undefined`.
---
For `compact`, replay the SSTables oldest first into a `Map` so later entries overwrite earlier ones, then drop the `null` values, sort, and keep `[merged]` or `[]` when it is empty.
