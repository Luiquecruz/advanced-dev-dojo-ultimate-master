Build the write and read path of a tiny LSM tree in memory. There is no disk and no write-ahead log here: the MemTable is a dict, each SSTable is a sorted list, and the rules for flushing, tombstones and compaction are the real ones.

```python
# An SSTable entry is a (key, value) tuple; a value of None is a tombstone.

class LsmStore:
    def __init__(self, *, memtable_limit: int): ...
    def put(self, key: str, value: str) -> None: ...
    def delete(self, key: str) -> None: ...
    def get(self, key: str) -> str | None: ...
    def sstable_count(self) -> int: ...
    def sstables(self) -> list[list[tuple[str, str | None]]]: ...
    def compact(self) -> None: ...
```

The tests create the store with a keyword argument: `LsmStore(memtable_limit=3)`.

- `put(key, value)` writes the value into the MemTable. `delete(key)` writes a **tombstone** (`None`) into the MemTable; it never removes anything from an SSTable.
- After each `put` or `delete`, when the MemTable holds `memtable_limit` distinct keys or more, **flush** it: turn it into an SSTable, a list of `(key, value)` tuples sorted by key (tombstones included as `(key, None)`), append it to the list of SSTables and start an empty MemTable. Writing an existing MemTable key again replaces its value and does not add a key.
- `get(key)` checks the MemTable first, then the SSTables from newest to oldest, and stops at the first entry for that key: a value is returned, a tombstone returns `None`. A key found nowhere returns `None`.
- `sstable_count()` returns the number of SSTables. `sstables()` returns them oldest first, each a list of tuples, for example `[[("apple", "green"), ("banana", None)]]`.
- `compact()` merges every SSTable into a single SSTable sorted by key that keeps only the newest entry of each key and drops tombstones. When nothing is left (or there were no SSTables), there are zero SSTables afterwards. The MemTable is not touched.

The starter ends with a small demo under `if __name__ == "__main__":`; keep it working.

Keys are plain ASCII text, so ordering them by character code gives the same order in every language.
