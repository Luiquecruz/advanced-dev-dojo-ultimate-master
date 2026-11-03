Give the class three maps: `nodes` (id to node), `outgoing` and `incoming` (id to a list of edges). `addNode` creates the two empty lists; `addEdge` pushes the edge to `outgoing.get(from)` and `incoming.get(to)` after checking both endpoints exist. `neighbors` then reads one or both lists and maps each edge to the node at its other end.
---
For `nodesWithinHops`, keep a `visited` set that starts with the start id and a `frontier` list. Loop `depth` from 1 to `maxDepth` while the frontier is not empty: for each id in the frontier, for each neighbor not yet visited, mark it, record `{ node, depth }` and push it to the next frontier.
---
`shortestPath` is the same loop plus a `cameFrom` map from node id to `{ previous, edge }`, written when a node is first visited. When you visit the target, walk `cameFrom` from the target back to the start, prepending each `previous` to `nodes` and each `edge` to `edges`.
---
`followPattern` keeps a `Map` from id to node per step (it deduplicates and keeps insertion order). `teamsAffectedBy` is `nodesWithinHops(graph, nodeId, maxDepth, { direction: 'in', types: ['DEPENDS_ON'] })`, filtered to services, passed to `followPattern` with one step `{ type: 'OWNS', direction: 'in' }`, then mapped to names and sorted.
