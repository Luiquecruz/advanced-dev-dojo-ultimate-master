class GraphError(Exception):
    """Raised for a duplicate node, an edge to an unknown node or a lookup of an unknown node."""


class PropertyGraph:
    """In-memory property graph with an adjacency index of outgoing and incoming edges per node id."""

    def __init__(self):
        self.nodes = {}
        self.edges = []

    def add_node(self, node):
        # TODO: reject a duplicate id with a GraphError and prepare the adjacency index for the node
        self.nodes[node["id"]] = node
        return node

    def add_edge(self, edge):
        # TODO: reject an edge whose endpoint does not exist, then index it as outgoing of "from" and incoming of "to"
        self.edges.append(edge)
        return edge

    def get_node(self, node_id):
        return self.nodes.get(node_id)

    def find_nodes(self, label, properties=None):
        # TODO: nodes with this label whose properties equal every given property
        return [node for node in self.nodes.values() if node["label"] == label]

    def neighbors(self, node_id, direction="out", types=None):
        # TODO: read the adjacency index instead of scanning every edge; support direction ("out", "in", "both") and types
        return [{"node": self.nodes[edge["to"]], "edge": edge} for edge in self.edges if edge["from"] == node_id]


def nodes_within_hops(graph, start_id, max_depth, direction="out", types=None):
    # TODO: breadth-first search up to max_depth hops; every node once, at its smallest depth, never the start
    raise NotImplementedError


def shortest_path(graph, start_id, target_id, max_depth, direction="out", types=None):
    # TODO: breadth-first search remembering how each node was reached, then walk back from the target
    raise NotImplementedError


def follow_pattern(graph, start_ids, steps):
    # TODO: follow one edge type and direction per step, keeping distinct nodes in discovery order
    raise NotImplementedError


def teams_affected_by(graph, node_id, max_depth):
    # TODO: services depending on the node within max_depth DEPENDS_ON hops, then the teams that OWN them, names sorted
    raise NotImplementedError
