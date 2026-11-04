Give the class three dicts: `nodes` (id to node), `outgoing` and `incoming` (id to a list of edges). `add_node` creates the two empty lists; `add_edge` appends the edge to `outgoing[edge["from"]]` and `incoming[edge["to"]]` after checking both endpoints exist. `neighbors` then reads one or both lists and maps each edge to the node at its other end.
---
For `nodes_within_hops`, keep a `visited` set that starts with the start id and a `frontier` list. Loop `depth` from 1 to `max_depth` while the frontier is not empty: for each id in the frontier, for each neighbor not yet visited, mark it, record `{"node": node, "depth": depth}` and append it to the next frontier.
---
`shortest_path` is the same loop plus a `came_from` dict from node id to `(previous, edge)`, written when a node is first visited. When you visit the target, walk `came_from` from the target back to the start, inserting each `previous` at the front of `nodes` and each `edge` at the front of `edges`.
---
`follow_pattern` keeps a dict from id to node per step (dicts keep insertion order, and `setdefault` keeps the first). `teams_affected_by` is `nodes_within_hops(graph, node_id, max_depth, direction="in", types=["DEPENDS_ON"])`, filtered to services, passed to `follow_pattern` with one step `{"type": "OWNS", "direction": "in"}`, then mapped to names and sorted.
