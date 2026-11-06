using Dojo;

public static class HashRingTests
{
    private static readonly string[] Four = ["node-1", "node-2", "node-3", "node-4"];

    private static List<string> Keys(int count, string prefix = "key-") => [.. Enumerable.Range(0, count).Select(index => $"{prefix}{index}")];

    private static HashRing RingOf(IEnumerable<string> names, int virtualNodes)
    {
        var ring = new HashRing(virtualNodes: virtualNodes);
        foreach (var name in names)
        {
            ring.AddNode(name);
        }
        return ring;
    }

    /// <summary>A slow ring that is easy to check by eye: every virtual node in a sorted list, scanned from the start.</summary>
    private sealed class ReferenceRing
    {
        private readonly List<(uint Position, string Node)> _positions;

        public ReferenceRing(IEnumerable<string> names, int virtualNodes)
        {
            _positions = [.. names
                .SelectMany(node => Enumerable.Range(0, virtualNodes).Select(index => (Position: HashRing.Hash32($"{node}#{index}"), Node: node)))
                .OrderBy(virtualNode => virtualNode.Position)];
        }

        public string Owner(string key) => _positions[StartOf(key)].Node;

        public List<string> Replicas(string key, int count)
        {
            var found = new List<string>();
            var start = StartOf(key);
            for (var step = 0; step < _positions.Count && found.Count < count; step++)
            {
                var node = _positions[(start + step) % _positions.Count].Node;
                if (!found.Contains(node))
                {
                    found.Add(node);
                }
            }
            return found;
        }

        private int StartOf(string key)
        {
            var hash = HashRing.Hash32(key);
            var index = _positions.FindIndex(virtualNode => virtualNode.Position >= hash);
            return index == -1 ? 0 : index;
        }
    }

    [Test("a key belongs to the first virtual node clockwise, and the ring wraps around")]
    public static void OwnerIsTheFirstVirtualNodeClockwise()
    {
        Assert.Null(new HashRing(virtualNodes: 10).NodeFor("anything"));
        var ring = RingOf(Four, 10);
        var reference = new ReferenceRing(Four, 10);
        foreach (var key in Keys(300))
        {
            Assert.Equal(reference.Owner(key), ring.NodeFor(key), $"owner of {key}");
        }
        ring.AddNode("node-1");
        Assert.Equal(reference.Owner("key-7"), ring.NodeFor("key-7"), "owner of key-7 after adding node-1 again");
    }

    // beginner mistake: hash(key) % N, which remaps almost every key when a node joins
    [Test("adding a fifth node moves well under half of the keys, and only to the new node")]
    public static void AddingANodeMovesFewKeysToIt()
    {
        var ring = RingOf(Four, 100);
        var before = Keys(1000).ToDictionary(key => key, key => ring.NodeFor(key));
        ring.AddNode("node-5");
        var moved = Keys(1000).Where(key => ring.NodeFor(key) != before[key]).ToList();
        Assert.True(moved.Count > 0, "no key moved to node-5");
        Assert.True(moved.Count < 350, $"{moved.Count} of 1000 keys moved");
        Assert.SequenceEqual([], moved.Where(key => ring.NodeFor(key) != "node-5"), "keys that moved to an old node");
    }

    [Test("removing a node moves only its own keys, and they spread over the other nodes")]
    public static void RemovingANodeMovesOnlyItsKeys()
    {
        var ring = RingOf(Four, 100);
        ring.AddNode("node-2");
        var before = Keys(1000).ToDictionary(key => key, key => ring.NodeFor(key));
        ring.RemoveNode("node-2");
        ring.RemoveNode("node-9");
        var receivers = new HashSet<string?>();
        foreach (var key in Keys(1000))
        {
            var owner = ring.NodeFor(key);
            Assert.NotEqual("node-2", owner, $"owner of {key}");
            if (before[key] == "node-2")
            {
                receivers.Add(owner);
            }
            else
            {
                Assert.Equal(before[key], owner, $"owner of {key}");
            }
        }
        Assert.SequenceEqual(["node-1", "node-3", "node-4"], receivers.Order(StringComparer.Ordinal), "nodes that received the keys of node-2");
    }

    [Test("100 virtual nodes per node balance 10,000 keys far better than one position per node")]
    public static void VirtualNodesBalanceTheKeys()
    {
        static double[] Shares(int virtualNodes)
        {
            var ring = RingOf(Four, virtualNodes);
            var counts = new Dictionary<string, int>();
            foreach (var key in Keys(10000, "user:"))
            {
                var owner = ring.NodeFor(key) ?? "no node";
                counts[owner] = counts.GetValueOrDefault(owner) + 1;
            }
            return [.. Four.Select(node => counts.GetValueOrDefault(node) / 10000.0)];
        }
        var single = Shares(1);
        var many = Shares(100);
        Assert.True(single.Max() > 0.4, $"largest share with one position per node: {single.Max()}");
        foreach (var share in many)
        {
            Assert.True(share > 0.18, $"share with 100 virtual nodes: {share}");
            Assert.True(share < 0.32, $"share with 100 virtual nodes: {share}");
        }
    }

    [Test("replicas are distinct physical nodes met clockwise, starting with the owner")]
    public static void ReplicasAreDistinctNodesClockwise()
    {
        var ring = RingOf(Four, 50);
        var reference = new ReferenceRing(Four, 50);
        foreach (var key in Keys(200))
        {
            var replicas = ring.NodesFor(key, 3);
            Assert.SequenceEqual(reference.Replicas(key, 3), replicas, $"replicas of {key}");
            Assert.Equal(3, replicas.Distinct().Count(), $"distinct replicas of {key}");
            Assert.Equal(ring.NodeFor(key), replicas[0], $"first replica of {key}");
        }
        Assert.SequenceEqual(Four, ring.NodesFor("key-1", 10).Order(StringComparer.Ordinal));
        Assert.SequenceEqual([], new HashRing(virtualNodes: 5).NodesFor("key-1", 2));
    }
}
