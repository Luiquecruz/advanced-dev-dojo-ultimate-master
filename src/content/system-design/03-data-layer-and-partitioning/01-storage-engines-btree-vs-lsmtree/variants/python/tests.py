@test("a full MemTable flushes into an SSTable sorted by key, and reads find keys in both")
def _():
    store = mod.LsmStore(memtable_limit=3)
    store.put("cherry", "red")
    store.put("apple", "green")
    store.put("apple", "yellow")
    assert store.sstable_count() == 0
    assert store.get("apple") == "yellow"
    store.put("banana", "yellow")
    assert store.sstable_count() == 1
    tables = store.sstables()
    assert tables == [[("apple", "yellow"), ("banana", "yellow"), ("cherry", "red")]]
    store.put("date", "brown")
    assert store.get("cherry") == "red"
    assert store.get("date") == "brown"
    assert store.get("fig") is None


@test("the newest write wins across the MemTable and several SSTables, deletes included")
def _():
    store = mod.LsmStore(memtable_limit=2)
    store.put("a", "v1")
    store.put("b", "b1")
    store.put("a", "v2")
    store.put("c", "c1")
    assert store.sstable_count() == 2
    assert store.get("a") == "v2"
    store.put("a", "v3")
    assert store.get("a") == "v3"
    assert store.get("b") == "b1"
    store.delete("b")
    assert store.sstable_count() == 3
    store.put("b", "b2")
    assert store.get("b") == "b2"
    assert store.get("a") == "v3"


# beginner mistake: deleting only from the MemTable, so the older SSTable value comes back
@test("a delete after a flush writes a tombstone that hides the older SSTable value")
def _():
    store = mod.LsmStore(memtable_limit=2)
    store.put("session:1", "ada")
    store.put("session:2", "alan")
    store.delete("session:1")
    assert store.get("session:1") is None
    store.put("session:3", "grace")
    assert store.sstable_count() == 2
    newest = store.sstables()[1]
    assert newest == [("session:1", None), ("session:3", "grace")]
    assert store.get("session:1") is None
    assert store.get("session:2") == "alan"


@test("compact merges every SSTable into one with the newest values and no tombstones")
def _():
    store = mod.LsmStore(memtable_limit=2)
    store.put("b", "b1")
    store.put("a", "a1")
    store.put("b", "b2")
    store.delete("a")
    store.put("c", "c1")
    store.put("d", "d1")
    store.put("e", "e1")
    assert store.sstable_count() == 3
    store.compact()
    assert store.sstable_count() == 1
    tables = store.sstables()
    assert tables == [[("b", "b2"), ("c", "c1"), ("d", "d1")]]
    assert store.get("a") is None
    assert store.get("e") == "e1"
    store.delete("b")
    store.delete("c")
    store.delete("d")
    store.compact()
    tables = store.sstables()
    assert tables == [[("e", "e1")]]
    store.delete("e")
    store.delete("x")
    store.compact()
    assert store.sstable_count() == 0
    assert store.get("e") is None
