Build the write and read path of a tiny LSM tree in memory. There is no disk and no write-ahead log here: the MemTable is a dictionary, each SSTable is a sorted array, and the rules for flushing, tombstones and compaction are the real ones.

```csharp
public record Entry(string Key, string? Value); // a null Value is a tombstone

public class LsmStore
{
    public LsmStore(int memtableLimit);
    public void Put(string key, string value);
    public void Delete(string key);
    public string? Get(string key);
    public int SSTableCount { get; }
    public IReadOnlyList<IReadOnlyList<Entry>> SSTables();
    public void Compact();
}
```

The tests create the store with a named argument: `new LsmStore(memtableLimit: 3)`.

- `Put(key, value)` writes the value into the MemTable. `Delete(key)` writes a **tombstone** (`null`) into the MemTable; it never removes anything from an SSTable.
- After each `Put` or `Delete`, when the MemTable holds `memtableLimit` distinct keys or more, **flush** it: turn it into an SSTable, an array of `Entry` records sorted by key (compare keys with `string.CompareOrdinal`; tombstones included as `new Entry(key, null)`), append it to the list of SSTables and start an empty MemTable. Writing an existing MemTable key again replaces its value and does not add a key.
- `Get(key)` checks the MemTable first, then the SSTables from newest to oldest, and stops at the first entry for that key: a value is returned, a tombstone returns `null`. A key found nowhere returns `null`.
- `SSTableCount` is the number of SSTables. `SSTables()` returns a copy of them, oldest first, for example `[[new Entry("apple", "green"), new Entry("banana", null)]]`.
- `Compact()` merges every SSTable into a single SSTable sorted by key that keeps only the newest entry of each key and drops tombstones. When nothing is left (or there were no SSTables), there are zero SSTables afterwards. The MemTable is not touched.

The starter opens with a small demo in top-level statements; keep it working.
