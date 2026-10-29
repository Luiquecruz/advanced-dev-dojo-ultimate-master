For `topologicalSort`, write a recursive `visit(node)` that visits every dependency of the node first and only then pushes the node into the result. Call it for every key of the graph; dependency-only nodes get visited through the arrays.
---
Keep a `Map` of states: `'visiting'` while a node's dependencies are being explored, `'done'` once it is in the result. Reaching a `'done'` node again is normal (a diamond); reaching a `'visiting'` node means a cycle. Keep the current path in an array (`push` on enter, `pop` on leave) so you can build the cycle with `[...path.slice(path.indexOf(node)), node]`.
---
For `executionWaves`, call `topologicalSort(graph)` first: it throws on cycles and gives you the full list of nodes. Then build `remaining` (number of distinct dependencies per node) and `dependents` (dependency to the nodes that need it, filled with `push`).
---
The first wave is every node with `remaining === 0`, sorted. For each node of the current wave, decrement `remaining` of its dependents; those that reach 0 form the next wave. Sort it and repeat until a wave is empty.
