Use one internal `_write(key, value)` for both operations: `put` passes the value and `delete` passes `None`. A tombstone is just an entry whose value is `None`, so it flushes, sorts and shadows older entries exactly like a value.
---
Flushing is `sorted(self._memtable.items())` appended to the SSTable list, followed by a fresh `{}`. The keys of a dict are unique, so sorting the `(key, value)` tuples orders them by key and never compares the values. Check `len(self._memtable) >= memtable_limit` right after the write.
---
In `get`, use `key in self._memtable` (not the value) to decide whether the MemTable answers, because a tombstone is stored as `None`. Then loop over `reversed(self._tables)` and return on the first entry found for the key, whatever its value.
---
For `compact`, replay the SSTables oldest first into one dict so later entries overwrite earlier ones (`newest.update(table)` accepts a list of pairs), then drop the `None` values, sort, and keep `[merged]`, or `[]` when it is empty.
