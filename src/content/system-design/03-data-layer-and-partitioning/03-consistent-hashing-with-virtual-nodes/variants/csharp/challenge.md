Build a consistent hash ring with virtual nodes. The starter gives you the hash function; keep it as it is, because the tests place nodes and keys with it.

```csharp
public class HashRing
{
    public static uint Hash32(string text); // given: FNV-1a plus the MurmurHash3 final mix, an unsigned 32-bit integer

    public HashRing(int virtualNodes);
    public void AddNode(string name);
    public void RemoveNode(string name);
    public string? NodeFor(string key);
    public IReadOnlyList<string> NodesFor(string key, int count);
}
```

The tests create the ring with a named argument: `new HashRing(virtualNodes: 100)`.

- `AddNode(name)` places `virtualNodes` positions on the ring for that physical node. Virtual node number `index` (from `0` to `virtualNodes - 1`) has the label `$"{name}#{index}"` and sits at `Hash32(label)`. Adding a node that is already on the ring changes nothing.
- `RemoveNode(name)` removes every virtual node of that physical node. Removing an unknown node changes nothing.
- `NodeFor(key)` hashes the key with `Hash32(key)` and returns the physical node of the **first virtual node clockwise**: the one with the smallest position greater than or equal to the key's hash, or, when no position is that large, the one with the smallest position on the ring (the ring wraps). It returns `null` on an empty ring.
- `NodesFor(key, count)` returns the replicas of a key: starting at the virtual node `NodeFor` would pick and walking clockwise (wrapping), it collects **distinct physical nodes** in the order met, skipping virtual nodes of a node already collected, until it has `count` of them or every physical node is in the list (a `count` larger than the number of nodes returns them all). The first entry equals `NodeFor(key)`; an empty ring returns an empty list.

Lookups run thousands of times in the tests, so keep the positions sorted and search them with binary search.
