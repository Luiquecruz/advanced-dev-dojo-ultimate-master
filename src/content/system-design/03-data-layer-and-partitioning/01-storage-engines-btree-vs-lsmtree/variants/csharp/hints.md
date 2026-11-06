Use one private `Write(string key, string? value)` for both operations: `Put` passes the value and `Delete` passes `null`. A tombstone is just an entry whose value is `null`, so it flushes, sorts and shadows older entries exactly like a value.
---
Flushing turns the MemTable into an `Entry[]` sorted by key, `_memtable.Select(pair => new Entry(pair.Key, pair.Value)).OrderBy(entry => entry.Key, StringComparer.Ordinal).ToArray()`, adds it to the SSTable list and replaces the MemTable with a new dictionary. The keys of a dictionary are unique, so writing a key again never adds one. Check `_memtable.Count >= _memtableLimit` right after the write.
---
In `Get`, use `_memtable.TryGetValue(key, out var value)` and return `value` whenever the key is there, even when it is `null`, because a tombstone is stored as `null`. Then loop over the SSTables from the last index down to `0` and return on the first entry found for the key, whatever its value.
---
For `Compact`, replay the SSTables oldest first into one `Dictionary<string, string?>` so later entries overwrite earlier ones, then drop the `null` values, sort by key, and keep a list with that one array, or an empty list when it is empty.
