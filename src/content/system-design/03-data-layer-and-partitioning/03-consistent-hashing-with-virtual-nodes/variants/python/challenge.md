Build a consistent hash ring with virtual nodes. The starter gives you the hash function; keep it as it is, because the tests place nodes and keys with it.

```python
def hash32(text: str) -> int: ...  # given: FNV-1a plus the MurmurHash3 final mix, an unsigned 32-bit integer

class HashRing:
    def __init__(self, *, virtual_nodes: int): ...
    def add_node(self, name: str) -> None: ...
    def remove_node(self, name: str) -> None: ...
    def node_for(self, key: str) -> str | None: ...
    def nodes_for(self, key: str, count: int) -> list[str]: ...
```

The tests create the ring with a keyword argument: `HashRing(virtual_nodes=100)`.

- `add_node(name)` places `virtual_nodes` positions on the ring for that physical node. Virtual node number `index` (from `0` to `virtual_nodes - 1`) has the label `f"{name}#{index}"` and sits at `hash32(label)`. Adding a node that is already on the ring changes nothing.
- `remove_node(name)` removes every virtual node of that physical node. Removing an unknown node changes nothing.
- `node_for(key)` hashes the key with `hash32(key)` and returns the physical node of the **first virtual node clockwise**: the one with the smallest position greater than or equal to the key's hash, or, when no position is that large, the one with the smallest position on the ring (the ring wraps). It returns `None` on an empty ring.
- `nodes_for(key, count)` returns the replicas of a key: starting at the virtual node `node_for` would pick and walking clockwise (wrapping), it collects **distinct physical nodes** in the order met, skipping virtual nodes of a node already collected, until it has `count` of them or every physical node is in the list (a `count` larger than the number of nodes returns them all). The first entry equals `node_for(key)`; an empty ring returns `[]`.

Lookups run thousands of times in the tests, so keep the positions sorted and search them with binary search (the `bisect` module).
