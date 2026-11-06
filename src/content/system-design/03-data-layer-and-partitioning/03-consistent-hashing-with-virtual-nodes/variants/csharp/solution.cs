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
    private readonly HashSet<string> _members = [];
    private List<VirtualNode> _ring = [];

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
        if (!_members.Add(name))
        {
            return;
        }
        for (var index = 0; index < _virtualNodes; index++)
        {
            _ring.Add(new VirtualNode(Hash32($"{name}#{index}"), name));
        }
        _ring = [.. _ring.OrderBy(virtualNode => virtualNode.Position)];
    }

    public void RemoveNode(string name)
    {
        if (_members.Remove(name))
        {
            _ring.RemoveAll(virtualNode => virtualNode.Node == name);
        }
    }

    public string? NodeFor(string key) => _ring.Count == 0 ? null : _ring[FirstIndexAtOrAfter(Hash32(key))].Node;

    public IReadOnlyList<string> NodesFor(string key, int count)
    {
        var replicas = new List<string>();
        if (_ring.Count == 0)
        {
            return replicas;
        }
        var wanted = Math.Min(count, _members.Count);
        var start = FirstIndexAtOrAfter(Hash32(key));
        for (var step = 0; step < _ring.Count && replicas.Count < wanted; step++)
        {
            var node = _ring[(start + step) % _ring.Count].Node;
            if (!replicas.Contains(node))
            {
                replicas.Add(node);
            }
        }
        return replicas;
    }

    private int FirstIndexAtOrAfter(uint position)
    {
        var low = 0;
        var high = _ring.Count;
        while (low < high)
        {
            var middle = (low + high) / 2;
            if (_ring[middle].Position < position)
            {
                low = middle + 1;
            }
            else
            {
                high = middle;
            }
        }
        return low == _ring.Count ? 0 : low;
    }

    private record VirtualNode(uint Position, string Node);
}
