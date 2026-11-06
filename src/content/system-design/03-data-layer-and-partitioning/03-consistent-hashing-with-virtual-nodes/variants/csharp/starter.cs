// Top-level statements: Run executes these lines and prints the results; the tests ignore them.
var ring = new HashRing(virtualNodes: 100);
foreach (var name in new[] { "cache-a", "cache-b", "cache-c" })
{
    ring.AddNode(name);
}
Console.WriteLine($"user:42 is owned by {ring.NodeFor("user:42")}, replicas: {string.Join(", ", ring.NodesFor("user:42", 2))}");

public class HashRing
{
    private readonly int _virtualNodes;
    private readonly List<string> _nodes = [];

    public HashRing(int virtualNodes)
    {
        _virtualNodes = virtualNodes;
    }

    /// <summary>FNV-1a over the UTF-16 code units of text, then the MurmurHash3 final mix: an unsigned 32-bit integer.</summary>
    public static uint Hash32(string text)
    {
        unchecked
        {
            var hash = 0x811c9dc5u;
            foreach (var character in text)
            {
                hash ^= character;
                hash *= 0x01000193u;
            }
            hash ^= hash >> 16;
            hash *= 0x85ebca6bu;
            hash ^= hash >> 13;
            hash *= 0xc2b2ae35u;
            hash ^= hash >> 16;
            return hash;
        }
    }

    public void AddNode(string name)
    {
        // TODO: place _virtualNodes positions at Hash32($"{name}#{index}"), kept sorted by position
        if (!_nodes.Contains(name))
        {
            _nodes.Add(name);
        }
    }

    public void RemoveNode(string name)
    {
        // TODO: remove every virtual node of this physical node
        _nodes.Remove(name);
    }

    public string? NodeFor(string key)
    {
        // TODO: replace the modulo with the first virtual node clockwise (binary search, wrapping)
        if (_nodes.Count == 0)
        {
            return null;
        }
        return _nodes[(int)(Hash32(key) % (uint)_nodes.Count)];
    }

    public IReadOnlyList<string> NodesFor(string key, int count)
    {
        // TODO: walk clockwise and collect count distinct physical nodes
        var first = NodeFor(key);
        return first is null || count < 1 ? [] : [first];
    }
}
