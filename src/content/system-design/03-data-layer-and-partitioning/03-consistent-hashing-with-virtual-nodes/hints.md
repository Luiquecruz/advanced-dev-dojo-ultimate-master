Replace the list of names with a sorted array of virtual nodes, `{ position, node }`, plus a `Set` of physical names. `addNode` pushes `virtualNodes` entries at ``hash32(`${name}#${index}`)`` and sorts by `position`; `removeNode` filters out every entry whose `node` is that name.
---
Write one helper that returns the index of the first virtual node whose `position >= hash32(key)`: a binary search for the lower bound. When it returns `ring.length` (no position is that large), use index `0`: that is the wrap-around. `nodeFor` is then `ring[index].node`.
---
`nodesFor` starts at that same index and steps `(start + step) % ring.length`, pushing a node only when it is not already in the result. Stop when you have `Math.min(count, members.size)` nodes or after `ring.length` steps.
