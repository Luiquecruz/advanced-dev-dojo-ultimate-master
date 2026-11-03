Build an in-memory **property graph** with an adjacency index, traverse it breadth first with depth limits, reconstruct shortest paths and answer a multi-hop question: "this database is down, which teams are affected?"

A node is `{ id, label, properties }` (`properties` is an object such as `{ name: 'Ana', onCall: true }`). An edge is `{ from, to, type }`, directed from `from` to `to`, with optional `properties`. Edges are returned as the same objects that were added.

## 1. `GraphError` and `PropertyGraph`

`GraphError` is an error class with `name` `'GraphError'`. `PropertyGraph` is a class with:

- `addNode(node)`: stores the node. A node whose `id` already exists fails with a `GraphError` whose message contains the id.
- `addEdge(edge)`: stores the edge. When `from` or `to` is not a stored node, fail with a `GraphError` whose message contains the missing id.
- `getNode(id)`: the node, or `undefined`.
- `findNodes(label, properties = {})`: nodes with that label whose properties equal (`===`) every given property, in insertion order.
- `neighbors(id, { direction = 'out', types } = {})`: a list of `{ node, edge }`.
  - `'out'`: one entry per edge leaving the node, `node` being the edge's `to`.
  - `'in'`: one entry per edge arriving at the node, `node` being the edge's `from`.
  - `'both'`: the `'out'` entries, then the `'in'` entries.
  - Entries keep the order edges were added. When `types` is given, keep only edges whose `type` is in it.
  - An unknown `id` fails with a `GraphError`.
  - Keep an adjacency index (outgoing and incoming edges per node id) instead of scanning every edge.

## 2. `nodesWithinHops(graph, startId, maxDepth, options = {})`

Breadth-first search from `startId`, following `neighbors(id, options)`. Return `{ node, depth }` for every node reached within `maxDepth` hops, each node once at its smallest depth, in discovery order (depth 1 first, then depth 2...). The start node is never included. Cycles must not loop forever; `maxDepth` `0` returns an empty list.

## 3. `shortestPath(graph, startId, targetId, options)`

`options` holds `maxDepth` plus the optional `direction` and `types` used for `neighbors`. Return the path with the fewest hops as `{ nodes, edges }`: `nodes` from `startId` to `targetId`, and `edges[i]` the stored edge between `nodes[i]` and `nodes[i + 1]` (it keeps its own direction, also when it was walked backwards with `'both'` or `'in'`). Return `{ nodes: [startId], edges: [] }` when start and target are the same, and `null` when the target is unknown, unreachable or more than `maxDepth` hops away.

## 4. `followPattern(graph, startIds, steps)`

Each step is `{ type, direction }` with direction `'out'` or `'in'`. Starting from the nodes `startIds`, follow edges of that type and direction for each step in order. Return the nodes reached after the last step, distinct, in discovery order. An empty `steps` list returns the start nodes.

## 5. `teamsAffectedBy(graph, nodeId, maxDepth)`

In the graph, teams (`label: 'Team'`) `OWNS` services (`label: 'Service'`), and services `DEPENDS_ON` services or databases. Return the `name` property of every team that owns a service depending on `nodeId` directly or through other services, within `maxDepth` `DEPENDS_ON` hops, sorted alphabetically and without duplicates.

The tests build small graphs with cycles, alternative paths and random edges, and compare your results with a reference breadth-first search.
