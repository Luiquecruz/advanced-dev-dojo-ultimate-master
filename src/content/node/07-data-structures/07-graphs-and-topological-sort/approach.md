1. Fix the edge direction before coding: `graph[a]` lists what `a` depends on, so dependencies must appear earlier in the output.
2. Depth-first post-order gives that for free: visit dependencies, then append the node. Visiting from every key covers disconnected parts; dependency-only nodes are reached through the arrays.
3. Distinguish two kinds of "seen": a node on the current path (`visiting`) and a finished node (`done`). Only the first signals a cycle; the second happens in every diamond.
4. Keep the current path in a stack so the error can name the cycle precisely, from the repeated node back to itself.
5. For waves, switch to Kahn's view: count unmet dependencies per node and invert the edges into a dependents map, both in `O(V + E)`.
6. Peel the graph level by level: the zero-count nodes form a wave, finishing them decrements their dependents, and the new zeros form the next wave. Sort each wave so the output is deterministic.
7. Reuse `topologicalSort` for cycle detection so both functions report cycles the same way.
