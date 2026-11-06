Replace the list of names with a list of virtual nodes, `(position, node)` tuples kept sorted by position, plus a `set` of physical names. `add_node` appends `virtual_nodes` entries at `hash32(f"{name}#{index}")` and sorts the list by position; `remove_node` keeps only the entries whose node is another name.
---
Write one helper that returns the index of the first virtual node whose position is `>= hash32(key)`: `bisect.bisect_left(ring, key_hash, key=lambda virtual_node: virtual_node[0])` is that lower bound. When it returns `len(ring)` (no position is that large), use index `0`: that is the wrap-around. `node_for` is then the node of `ring[index]`.
---
`nodes_for` starts at that same index and reads `ring[(start + step) % len(ring)]` for each step, appending its node only when it is not already in the result. Stop when you have `min(count, len(members))` nodes or after `len(ring)` steps.
