class LsmStore:
    def __init__(self, *, memtable_limit):
        self._memtable_limit = memtable_limit
        self._memtable = {}
        self._tables = []

    def put(self, key, value):
        self._memtable[key] = value
        self._flush_if_full()

    def delete(self, key):
        # TODO: write a tombstone instead of forgetting the key
        self._memtable.pop(key, None)

    def get(self, key):
        value = self._memtable.get(key)
        if value is not None:
            return value
        # TODO: search the SSTables from newest to oldest and stop at the first entry, tombstones included
        return None

    def sstable_count(self):
        return len(self._tables)

    def sstables(self):
        return self._tables

    def compact(self):
        # TODO: merge every SSTable into one, newest entry per key, without tombstones
        pass

    def _flush_if_full(self):
        # TODO: when the MemTable holds memtable_limit keys, append it as a sorted SSTable and start a new MemTable
        pass


if __name__ == "__main__":
    store = LsmStore(memtable_limit=2)
    store.put("user:2", "Alan")
    store.put("user:1", "Ada")
    store.delete("user:2")
    print(store.sstables(), store.get("user:1"), store.get("user:2"))
