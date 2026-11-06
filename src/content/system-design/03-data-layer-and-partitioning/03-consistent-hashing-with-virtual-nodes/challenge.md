Build a consistent hash ring with virtual nodes. The starter gives you the hash function; keep it as it is, because the tests place nodes and keys with it.

```ts
export function hash32(text: string): number // given: FNV-1a plus the MurmurHash3 final mix, an unsigned 32-bit integer

export function createHashRing(options: { virtualNodes: number }): {
  addNode(name: string): void;
  removeNode(name: string): void;
  nodeFor(key: string): string | undefined;
  nodesFor(key: string, count: number): string[];
}
```

- `addNode(name)` places `virtualNodes` positions on the ring for that physical node. Virtual node number `index` (from `0` to `virtualNodes - 1`) has the label `` `${name}#${index}` `` and sits at `hash32(label)`. Adding a node that is already on the ring changes nothing.
- `removeNode(name)` removes every virtual node of that physical node. Removing an unknown node changes nothing.
- `nodeFor(key)` hashes the key with `hash32(key)` and returns the physical node of the **first virtual node clockwise**: the one with the smallest position greater than or equal to the key's hash, or, when no position is that large, the one with the smallest position on the ring (the ring wraps). It returns `undefined` on an empty ring.
- `nodesFor(key, count)` returns the replicas of a key: starting at the virtual node `nodeFor` would pick and walking clockwise (wrapping), it collects **distinct physical nodes** in the order met, skipping virtual nodes of a node already collected, until it has `count` of them or every physical node is in the list (a `count` larger than the number of nodes returns them all). The first entry equals `nodeFor(key)`; an empty ring returns `[]`.

Lookups run thousands of times in the tests, so keep the positions sorted and search them with binary search.
