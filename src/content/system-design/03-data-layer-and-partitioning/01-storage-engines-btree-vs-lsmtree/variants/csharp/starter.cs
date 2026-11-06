// Top-level statements: Run executes these lines and prints the results; the tests ignore them.
var store = new LsmStore(memtableLimit: 2);
store.Put("user:2", "Alan");
store.Put("user:1", "Ada");
store.Delete("user:2");
foreach (var table in store.SSTables())
{
    Console.WriteLine($"SSTable: {string.Join(", ", table)}");
}
Console.WriteLine($"user:1 = {store.Get("user:1") ?? "null"}, user:2 = {store.Get("user:2") ?? "null"}");

// A null Value is a tombstone: the key was deleted.
public record Entry(string Key, string? Value);

public class LsmStore
{
    private readonly int _memtableLimit;
    private Dictionary<string, string?> _memtable = [];
    private List<Entry[]> _tables = [];

    public LsmStore(int memtableLimit)
    {
        _memtableLimit = memtableLimit;
    }

    public int SSTableCount => _tables.Count;

    public void Put(string key, string value)
    {
        _memtable[key] = value;
        FlushIfFull();
    }

    public void Delete(string key)
    {
        // TODO: write a tombstone instead of forgetting the key
        _memtable.Remove(key);
    }

    public string? Get(string key)
    {
        if (_memtable.TryGetValue(key, out var value) && value is not null)
        {
            return value;
        }
        // TODO: search the SSTables from newest to oldest and stop at the first entry, tombstones included
        return null;
    }

    public IReadOnlyList<IReadOnlyList<Entry>> SSTables() => _tables.Select(table => table.ToArray()).ToList();

    public void Compact()
    {
        // TODO: merge every SSTable into one, newest entry per key, without tombstones
    }

    private void FlushIfFull()
    {
        // TODO: when the MemTable holds _memtableLimit keys, add it as an SSTable sorted by key and start a new MemTable
    }
}
