Build an in-memory **property graph** with an adjacency index, traverse it breadth first with depth limits, reconstruct shortest paths and answer a multi-hop question: "this database is down, which teams are affected?"

A node is a dict `{"id", "label", "properties"}` (`"properties"` is a dict such as `{"name": "Ana", "onCall": True}`). An edge is a dict `{"from", "to", "type"}`, directed from `"from"` to `"to"`, with optional `"properties"`. Edges are returned as the same dicts that were added.

## 1. `GraphError` and `PropertyGraph`

`GraphError` is an exception class (a subclass of `Exception`). `PropertyGraph` is a class with:

- `add_node(node)`: stores the node. A node whose `"id"` already exists raises a `GraphError` whose message contains the id.
- `add_edge(edge)`: stores the edge. When `"from"` or `"to"` is not a stored node, raise a `GraphError` whose message contains the missing id.
- `get_node(node_id)`: the node, or `None`.
- `find_nodes(label, properties=None)`: nodes with that label whose properties equal every given property, in insertion order.
- `neighbors(node_id, direction="out", types=None)`: a list of `{"node": ..., "edge": ...}` dicts.
  - `"out"`: one entry per edge leaving the node, `"node"` being the edge's `"to"`.
  - `"in"`: one entry per edge arriving at the node, `"node"` being the edge's `"from"`.
  - `"both"`: the `"out"` entries, then the `"in"` entries.
  - Entries keep the order edges were added. When `types` is given, keep only edges whose `"type"` is in it.
  - An unknown `node_id` raises a `GraphError`.
  - Keep an adjacency index (outgoing and incoming edges per node id) instead of scanning every edge.

## 2. `nodes_within_hops(graph, start_id, max_depth, direction="out", types=None)`

Breadth-first search from `start_id`, following `neighbors(node_id, direction=direction, types=types)`. Return `{"node", "depth"}` for every node reached within `max_depth` hops, each node once at its smallest depth, in discovery order (depth 1 first, then depth 2...). The start node is never included. Cycles must not loop forever; `max_depth` `0` returns an empty list.

## 3. `shortest_path(graph, start_id, target_id, max_depth, direction="out", types=None)`

Return the path with the fewest hops as `{"nodes", "edges"}`: `"nodes"` from `start_id` to `target_id`, and `edges[i]` the stored edge between `nodes[i]` and `nodes[i + 1]` (it keeps its own direction, also when it was walked backwards with `"both"` or `"in"`). Return `{"nodes": [start_id], "edges": []}` when start and target are the same, and `None` when the target is unknown, unreachable or more than `max_depth` hops away.

## 4. `follow_pattern(graph, start_ids, steps)`

Each step is a dict `{"type", "direction"}` with direction `"out"` or `"in"`. Starting from the nodes `start_ids`, follow edges of that type and direction for each step in order. Return the nodes reached after the last step, distinct, in discovery order. An empty `steps` list returns the start nodes.

## 5. `teams_affected_by(graph, node_id, max_depth)`

In the graph, teams (`"label": "Team"`) `OWNS` services (`"label": "Service"`), and services `DEPENDS_ON` services or databases. Return the `"name"` property of every team that owns a service depending on `node_id` directly or through other services, within `max_depth` `DEPENDS_ON` hops, sorted alphabetically and without duplicates.

The tests build small graphs with cycles, alternative paths and random edges, and compare your results with a reference breadth-first search.
