# Graphs and Topological Sort

A graph is a set of **nodes** connected by **edges**. A tree is a special graph (one parent per node, no cycles); a general graph allows anything: many parents, cycles, disconnected parts. Backends meet graphs constantly, often without naming them:

| Problem | Nodes | Edges |
| --- | --- | --- |
| Run database migrations in a valid order | migrations | "requires" |
| Monorepo builds (Turborepo, Nx), CI pipelines, Airflow DAGs | packages, tasks | "depends on" |
| Starting services in a container stack | services | `depends_on` |
| Role inheritance in authorization | roles | "inherits from" |
| Follower feeds, recommendations | users | "follows" |

## Representing a graph

The usual in-memory form is an **adjacency list**: each node maps to the nodes it points to.

```ts
const tasks: Record<string, string[]> = {
  'add-orders': ['create-users'],
  'add-order-index': ['add-orders'],
  'seed-admin': ['create-users'],
  'create-users': [],
};
```

Here an edge `a → b` means "`a` depends on `b`". Write that convention down: half of all graph bugs come from reading edges in the wrong direction. A `Map<string, string[]>` works the same and avoids prototype keys; an adjacency **matrix** (`V × V` booleans) only pays off for small, dense graphs.

## Traversal: BFS and DFS

Both visit every reachable node once, in `O(V + E)`:

- **Breadth-first** (a queue) visits by distance: "users within two follows", shortest path in unweighted graphs.
- **Depth-first** (a stack, or recursion) follows one path to the end before backtracking: reachability, cycle detection, topological order.

Unlike a tree, a graph can reach the same node twice, so every traversal keeps a `visited` set. Forgetting it on a graph with a cycle is an infinite loop.

## Topological sort

A topological order lists every node **after all of its dependencies**. It exists only for a **DAG** (directed acyclic graph). Two classic algorithms:

**DFS post-order.** Visit a node's dependencies first, then append the node. Track three states per node: unvisited, *visiting* (on the current path) and *done*. Meeting a *visiting* node means you walked back into the current path: that is a cycle, and the path from that node to here is the cycle itself.

```ts
function visit(node: string) {
  if (state.get(node) === 'done') return;
  if (state.get(node) === 'visiting') throw new CycleError([...path.slice(path.indexOf(node)), node]);
  state.set(node, 'visiting');
  path.push(node);
  for (const dependency of graph[node] ?? []) visit(dependency);
  path.pop();
  state.set(node, 'done');
  order.push(node);
}
```

**Kahn's algorithm.** Count each node's unmet dependencies. Start with the nodes at zero, and every time one finishes, decrement the count of the nodes that depend on it. Processing the zero-count nodes level by level gives **waves**: groups of tasks that can run in parallel because nothing inside a wave depends on anything else in it. If nodes remain with a non-zero count when no zero-count node is left, the graph has a cycle.

```txt
wave 0: create-users
wave 1: add-orders, seed-admin
wave 2: add-order-index
```

This is exactly how build tools parallelize: each wave starts when the previous one finishes (smarter schedulers start a task as soon as its own dependencies finish).

## Pitfalls

- **Nodes that only appear as dependencies.** `create-users` might not have its own key. Collect nodes from both keys and values.
- **Useless cycle errors.** "Cycle detected" with no path forces someone to debug by hand. Report the path: `a -> b -> c -> a`.
- **Nondeterministic order.** Several valid orders exist. If the output is committed, logged or compared in tests, break ties deterministically (sort each wave).
- **Recursion depth.** The DFS recursion is as deep as the longest dependency chain. Real dependency graphs are shallow; a generated chain of 50 000 nodes needs an iterative version.
- **Quadratic scheduling.** "Scan every task to find one whose dependencies are done, repeat" is `O(V²)`. Kahn's algorithm with a dependents map is `O(V + E)`.

## Graph databases and libraries

For graphs that live in the database (social networks, fraud rings, permissions across organizations), recursive SQL queries or a graph database (Neo4j) avoid loading everything into memory. For in-memory work, libraries such as `graphology` or `toposort` exist, but a topological sort is short enough that owning it, with good cycle errors, is common.

## When to choose it

Model a problem as a graph when items have **dependencies or relationships** in several directions and order or reachability matters. Use topological sort for anything with "must run after" rules (migrations, plugin loading, pipeline steps, service startup), and waves when independent work can run in parallel. Keep the graph explicit (a declared `dependsOn`) instead of encoding order in file names once the number of items grows past what a human can order by hand.

## Working with AI

State the edge direction, whether cycles are possible, and what the output must look like (deterministic order, parallel groups, cycle path in the error). Review generated code for:

- A `visited` set on every traversal.
- Cycle detection that distinguishes "on the current path" from "already finished" (a single visited set misreports diamonds as cycles).
- Dependency-only nodes included in the output.
- `O(V + E)` scheduling instead of repeated scans.
- Deterministic tie-breaking when the order is observable.
