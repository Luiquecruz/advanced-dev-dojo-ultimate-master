from bisect import bisect_left
from operator import itemgetter


class LsmStore:
    def __init__(self, *, memtable_limit):
        self._memtable_limit = memtable_limit
        self._memtable = {}
        self._tables = []

    def put(self, key, value):
        self._write(key, value)

    def delete(self, key):
        self._write(key, None)

    def get(self, key):
        if key in self._memtable:
            return self._memtable[key]
        for table in reversed(self._tables):
            entry = _find_entry(table, key)
            if entry is not None:
                return entry[1]
        return None

    def sstable_count(self):
        return len(self._tables)

    def sstables(self):
        return [list(table) for table in self._tables]

    def compact(self):
        newest = {}
        for table in self._tables:
            newest.update(table)
        merged = sorted((key, value) for key, value in newest.items() if value is not None)
        self._tables = [merged] if merged else []

    def _write(self, key, value):
        self._memtable[key] = value
        if len(self._memtable) < self._memtable_limit:
            return
        self._tables.append(sorted(self._memtable.items()))
        self._memtable = {}


def _find_entry(table, key):
    index = bisect_left(table, key, key=itemgetter(0))
    if index < len(table) and table[index][0] == key:
        return table[index]
    return None


if __name__ == "__main__":
    store = LsmStore(memtable_limit=2)
    store.put("user:2", "Alan")
    store.put("user:1", "Ada")
    store.delete("user:2")
    print(store.sstables(), store.get("user:1"), store.get("user:2"))
