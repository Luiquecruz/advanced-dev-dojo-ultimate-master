class GraphError(Exception):
    """Raised for a duplicate node, an edge to an unknown node or a lookup of an unknown node."""


class PropertyGraph:
    """In-memory property graph with an adjacency index of outgoing and incoming edges per node id."""

    def __init__(self):
        self.nodes = {}
        self.outgoing = {}
        self.incoming = {}

    def add_node(self, node):
        if node["id"] in self.nodes:
            raise GraphError(f'Node "{node["id"]}" already exists')
        self.nodes[node["id"]] = node
        self.outgoing[node["id"]] = []
        self.incoming[node["id"]] = []
        return node

    def add_edge(self, edge):
        for endpoint in (edge["from"], edge["to"]):
            if endpoint not in self.nodes:
                raise GraphError(f'Edge {edge["type"]} references unknown node "{endpoint}"')
        self.outgoing[edge["from"]].append(edge)
        self.incoming[edge["to"]].append(edge)
        return edge

    def get_node(self, node_id):
        return self.nodes.get(node_id)

    def find_nodes(self, label, properties=None):
        expected = properties or {}
        return [
            node
            for node in self.nodes.values()
            if node["label"] == label and all(key in node["properties"] and node["properties"][key] == value for key, value in expected.items())
        ]

    def neighbors(self, node_id, direction="out", types=None):
        if node_id not in self.nodes:
            raise GraphError(f'Unknown node "{node_id}"')
        result = []
        if direction in ("out", "both"):
            result.extend({"node": self.nodes[edge["to"]], "edge": edge} for edge in self.outgoing[node_id])
        if direction in ("in", "both"):
            result.extend({"node": self.nodes[edge["from"]], "edge": edge} for edge in self.incoming[node_id])
        if types is None:
            return result
        return [neighbor for neighbor in result if neighbor["edge"]["type"] in types]


def nodes_within_hops(graph, start_id, max_depth, direction="out", types=None):
    visited = {start_id}
    reached = []
    frontier = [start_id]
    depth = 1
    while depth <= max_depth and frontier:
        next_frontier = []
        for current_id in frontier:
            for neighbor in graph.neighbors(current_id, direction=direction, types=types):
                node = neighbor["node"]
                if node["id"] not in visited:
                    visited.add(node["id"])
                    reached.append({"node": node, "depth": depth})
                    next_frontier.append(node["id"])
        frontier = next_frontier
        depth += 1
    return reached


def shortest_path(graph, start_id, target_id, max_depth, direction="out", types=None):
    if graph.get_node(start_id) is None or graph.get_node(target_id) is None:
        return None
    if start_id == target_id:
        return {"nodes": [start_id], "edges": []}
    came_from = {}
    visited = {start_id}
    frontier = [start_id]
    depth = 1
    while depth <= max_depth and frontier:
        next_frontier = []
        for current_id in frontier:
            for neighbor in graph.neighbors(current_id, direction=direction, types=types):
                node_id = neighbor["node"]["id"]
                if node_id in visited:
                    continue
                visited.add(node_id)
                came_from[node_id] = (current_id, neighbor["edge"])
                if node_id == target_id:
                    return reconstruct(came_from, start_id, target_id)
                next_frontier.append(node_id)
        frontier = next_frontier
        depth += 1
    return None


def reconstruct(came_from, start_id, target_id):
    nodes = [target_id]
    edges = []
    current = target_id
    while current != start_id:
        previous, edge = came_from[current]
        edges.insert(0, edge)
        nodes.insert(0, previous)
        current = previous
    return {"nodes": nodes, "edges": edges}


def follow_pattern(graph, start_ids, steps):
    frontier = [graph.get_node(node_id) for node_id in start_ids if graph.get_node(node_id) is not None]
    for step in steps:
        next_frontier = {}
        for current in frontier:
            for neighbor in graph.neighbors(current["id"], direction=step["direction"], types=[step["type"]]):
                next_frontier.setdefault(neighbor["node"]["id"], neighbor["node"])
        frontier = list(next_frontier.values())
    return frontier


def teams_affected_by(graph, node_id, max_depth):
    dependents = nodes_within_hops(graph, node_id, max_depth, direction="in", types=["DEPENDS_ON"])
    services = [reached["node"]["id"] for reached in dependents if reached["node"]["label"] == "Service"]
    teams = follow_pattern(graph, services, [{"type": "OWNS", "direction": "in"}])
    return sorted(str(team["properties"]["name"]) for team in teams)
