Build the write and read path of a tiny LSM tree in memory. There is no disk and no write-ahead log here: the MemTable is a map, each SSTable is a sorted array, and the rules for flushing, tombstones and compaction are the real ones.

```ts
type Entry = [key: string, value: string | null]; // null is a tombstone

export function createLsmStore(options: { memtableLimit: number }): {
  put(key: string, value: string): void;
  delete(key: string): void;
  get(key: string): string | undefined;
  sstableCount(): number;
  sstables(): Entry[][];
  compact(): void;
}
```

- `put(key, value)` writes the value into the MemTable. `delete(key)` writes a **tombstone** (`null`) into the MemTable; it never removes anything from an SSTable.
- After each `put` or `delete`, when the MemTable holds `memtableLimit` distinct keys or more, **flush** it: turn it into an SSTable, an array of `[key, value]` entries sorted by key (tombstones included as `[key, null]`), append it to the list of SSTables and start an empty MemTable. Writing an existing MemTable key again replaces its value and does not add a key.
- `get(key)` checks the MemTable first, then the SSTables from newest to oldest, and stops at the first entry for that key: a value is returned, a tombstone returns `undefined`. A key found nowhere returns `undefined`.
- `sstableCount()` returns the number of SSTables. `sstables()` returns a copy of them, oldest first, so a caller cannot change the store through it.
- `compact()` merges every SSTable into a single SSTable sorted by key that keeps only the newest entry of each key and drops tombstones. When nothing is left (or there were no SSTables), there are zero SSTables afterwards. The MemTable is not touched.

The starter also prints a small demo; keep it working.

Keys are plain ASCII text, so ordering them by character code gives the same order in every language.
