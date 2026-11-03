1. Decide the storage first, because every operation depends on it: nodes by id, plus an adjacency index with the outgoing and the incoming edges of each node, so a hop costs a lookup instead of a scan over all edges.
2. Validate on write. A duplicate id or an edge to a missing node corrupts every later traversal, so reject both with a clear error that names the offending id.
3. Express direction once, in `neighbors`: outgoing edges lead to their `to` node, incoming edges lead to their `from` node, and a type filter narrows both. Every traversal reuses it.
4. Traverse breadth first, level by level. A visited set stops cycles and guarantees each node is recorded at its smallest depth; the level counter enforces the depth limit.
5. For paths, remember how each node was first reached. Breadth first means the first arrival at the target used the fewest hops; walking the remembered steps backwards rebuilds the path with the original edges as evidence.
6. Answer the multi-hop question by composition: a depth-limited traversal finds the dependents, a one-step pattern finds their owners, and deduplication plus sorting makes the answer stable.
