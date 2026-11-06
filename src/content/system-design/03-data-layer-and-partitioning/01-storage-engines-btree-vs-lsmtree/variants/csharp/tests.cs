using Dojo;

public static class LsmStoreTests
{
    private static void TablesEqual(Entry[][] expected, IReadOnlyList<IReadOnlyList<Entry>> actual)
    {
        Assert.Equal(expected.Length, actual.Count, "number of SSTables");
        for (var index = 0; index < expected.Length; index++)
        {
            Assert.SequenceEqual(expected[index], actual[index], $"SSTable {index}");
        }
    }

    [Test("a full MemTable flushes into an SSTable sorted by key, and reads find keys in both")]
    public static void FlushesASortedSSTable()
    {
        var store = new LsmStore(memtableLimit: 3);
        store.Put("cherry", "red");
        store.Put("apple", "green");
        store.Put("apple", "yellow");
        Assert.Equal(0, store.SSTableCount, "SSTable count");
        Assert.Equal("yellow", store.Get("apple"));
        store.Put("banana", "yellow");
        Assert.Equal(1, store.SSTableCount, "SSTable count");
        TablesEqual([[new("apple", "yellow"), new("banana", "yellow"), new("cherry", "red")]], store.SSTables());
        store.Put("date", "brown");
        Assert.Equal("red", store.Get("cherry"));
        Assert.Equal("brown", store.Get("date"));
        Assert.Null(store.Get("fig"));
    }

    [Test("the newest write wins across the MemTable and several SSTables, deletes included")]
    public static void NewestWriteWins()
    {
        var store = new LsmStore(memtableLimit: 2);
        store.Put("a", "v1");
        store.Put("b", "b1");
        store.Put("a", "v2");
        store.Put("c", "c1");
        Assert.Equal(2, store.SSTableCount, "SSTable count");
        Assert.Equal("v2", store.Get("a"));
        store.Put("a", "v3");
        Assert.Equal("v3", store.Get("a"));
        Assert.Equal("b1", store.Get("b"));
        store.Delete("b");
        Assert.Equal(3, store.SSTableCount, "SSTable count");
        store.Put("b", "b2");
        Assert.Equal("b2", store.Get("b"));
        Assert.Equal("v3", store.Get("a"));
    }

    // beginner mistake: deleting only from the MemTable, so the older SSTable value comes back
    [Test("a delete after a flush writes a tombstone that hides the older SSTable value")]
    public static void DeleteWritesATombstone()
    {
        var store = new LsmStore(memtableLimit: 2);
        store.Put("session:1", "ada");
        store.Put("session:2", "alan");
        store.Delete("session:1");
        Assert.Null(store.Get("session:1"));
        store.Put("session:3", "grace");
        Assert.Equal(2, store.SSTableCount, "SSTable count");
        Assert.SequenceEqual([new Entry("session:1", null), new Entry("session:3", "grace")], store.SSTables()[1]);
        Assert.Null(store.Get("session:1"));
        Assert.Equal("alan", store.Get("session:2"));
    }

    [Test("compact merges every SSTable into one with the newest values and no tombstones")]
    public static void CompactMergesEverySSTable()
    {
        var store = new LsmStore(memtableLimit: 2);
        store.Put("b", "b1");
        store.Put("a", "a1");
        store.Put("b", "b2");
        store.Delete("a");
        store.Put("c", "c1");
        store.Put("d", "d1");
        store.Put("e", "e1");
        Assert.Equal(3, store.SSTableCount, "SSTable count");
        store.Compact();
        Assert.Equal(1, store.SSTableCount, "SSTable count");
        TablesEqual([[new("b", "b2"), new("c", "c1"), new("d", "d1")]], store.SSTables());
        Assert.Null(store.Get("a"));
        Assert.Equal("e1", store.Get("e"));
        store.Delete("b");
        store.Delete("c");
        store.Delete("d");
        store.Compact();
        TablesEqual([[new("e", "e1")]], store.SSTables());
        store.Delete("e");
        store.Delete("x");
        store.Compact();
        Assert.Equal(0, store.SSTableCount, "SSTable count");
        Assert.Null(store.Get("e"));
    }
}
