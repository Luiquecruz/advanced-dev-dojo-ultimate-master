A migration runner receives a dependency graph: each key is a migration and its array lists the migrations it **depends on**.

```ts
type DependencyGraph = Record<string, string[]>;
```

A node may appear only inside a dependency array (it has no key): it is still a migration with no dependencies.

1. `CycleError` (given) is thrown with `cycle`, the path of the cycle following the "depends on" edges, starting and ending with the same node (`['a', 'b', 'c', 'a']` means `a` depends on `b`, `b` on `c`, `c` on `a`). Its message is `Dependency cycle: a -> b -> c -> a`. A node that depends on itself gives `['a', 'a']`.
2. `topologicalSort(graph): string[]` returns every node exactly once, each one after all of its dependencies. Throws `CycleError` when the graph has a cycle. It must be `O(V + E)`: a graph of 20 000 migrations is sorted in a fraction of a second.
3. `executionWaves(graph): string[][]` groups the nodes into waves that can run in parallel: wave 0 holds the nodes without dependencies, and each later wave holds the nodes whose dependencies are all in earlier waves (a node is in the first wave possible). Each wave is sorted alphabetically. Throws `CycleError` when the graph has a cycle (reusing `topologicalSort` to detect it is fine).
