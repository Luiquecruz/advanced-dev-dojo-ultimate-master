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
    private static readonly Comparer<Entry> ByKey = Comparer<Entry>.Create((left, right) => string.CompareOrdinal(left.Key, right.Key));

    private readonly int _memtableLimit;
    private Dictionary<string, string?> _memtable = [];
    private List<Entry[]> _tables = [];

    public LsmStore(int memtableLimit)
    {
        _memtableLimit = memtableLimit;
    }

    public int SSTableCount => _tables.Count;

    public void Put(string key, string value) => Write(key, value);

    public void Delete(string key) => Write(key, null);

    public string? Get(string key)
    {
        if (_memtable.TryGetValue(key, out var value))
        {
            return value;
        }
        for (var index = _tables.Count - 1; index >= 0; index--)
        {
            var table = _tables[index];
            var position = Array.BinarySearch(table, new Entry(key, null), ByKey);
            if (position >= 0)
            {
                return table[position].Value;
            }
        }
        return null;
    }

    public IReadOnlyList<IReadOnlyList<Entry>> SSTables() => _tables.Select(table => table.ToArray()).ToList();

    public void Compact()
    {
        var newest = new Dictionary<string, string?>();
        foreach (var table in _tables)
        {
            foreach (var entry in table)
            {
                newest[entry.Key] = entry.Value;
            }
        }
        var merged = SortedByKey(newest.Where(pair => pair.Value is not null));
        _tables = merged.Length == 0 ? [] : [merged];
    }

    private void Write(string key, string? value)
    {
        _memtable[key] = value;
        if (_memtable.Count < _memtableLimit)
        {
            return;
        }
        _tables.Add(SortedByKey(_memtable));
        _memtable = [];
    }

    private static Entry[] SortedByKey(IEnumerable<KeyValuePair<string, string?>> pairs)
    {
        var entries = pairs.Select(pair => new Entry(pair.Key, pair.Value)).ToArray();
        Array.Sort(entries, ByKey);
        return entries;
    }
}
