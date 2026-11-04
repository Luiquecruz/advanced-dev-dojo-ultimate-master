def node(node_id, label="Thing", properties=None):
    return {"id": node_id, "label": label, "properties": {"name": node_id, **(properties or {})}}


def graph_of(ids, edges, labels=None):
    graph = mod.PropertyGraph()
    for node_id in ids:
        graph.add_node(node(node_id, (labels or {}).get(node_id, "Thing")))
    for source, edge_type, target in edges:
        graph.add_edge({"from": source, "type": edge_type, "to": target})
    return graph


def organization():
    labels = {
        "payments": "Team", "checkout": "Team", "growth": "Team", "search": "Team",
        "payments-api": "Service", "invoices-worker": "Service", "checkout-web": "Service", "recommendations": "Service", "search-api": "Service",
        "payments-db": "Database", "cache": "Database",
    }
    return graph_of(list(labels), [
        ("payments", "OWNS", "payments-api"),
        ("payments", "OWNS", "invoices-worker"),
        ("checkout", "OWNS", "checkout-web"),
        ("growth", "OWNS", "recommendations"),
        ("search", "OWNS", "search-api"),
        ("payments-api", "DEPENDS_ON", "payments-db"),
        ("invoices-worker", "DEPENDS_ON", "payments-db"),
        ("checkout-web", "DEPENDS_ON", "payments-api"),
        ("recommendations", "DEPENDS_ON", "checkout-web"),
        ("search-api", "DEPENDS_ON", "cache"),
        ("checkout-web", "CALLS", "search-api"),
    ], labels)


def create_random(seed):
    state = float(seed)

    def random():
        nonlocal state
        state = (state * 1103515245 + 12345) % 2147483648
        return state / 2147483648

    return random


def neighbor_ids(neighbors):
    return [neighbor["node"]["id"] for neighbor in neighbors]


def node_ids(nodes):
    return [found["id"] for found in nodes]


def summary(reached):
    return [f"{entry['node']['id']}@{entry['depth']}" for entry in reached]


@test("stores nodes and typed directed edges, rejecting duplicate ids and edges to unknown nodes with a GraphError")
async def _():
    graph = mod.PropertyGraph()
    graph.add_node(node("ana", "Person", {"onCall": True}))
    graph.add_node(node("bruno", "Person", {"onCall": False}))
    graph.add_node(node("payments", "Team"))
    assert graph.get_node("ana") == node("ana", "Person", {"onCall": True})
    assert graph.get_node("nobody") is None
    duplicate = await capture_error(lambda: graph.add_node(node("ana", "Person")))
    assert isinstance(duplicate, mod.GraphError)
    assert "ana" in str(duplicate)
    dangling = await capture_error(lambda: graph.add_edge({"from": "ana", "to": "ghost-team", "type": "MEMBER_OF"}))
    assert isinstance(dangling, mod.GraphError)
    assert "ghost-team" in str(dangling)
    assert graph.neighbors("ana") == []
    assert node_ids(graph.find_nodes("Person")) == ["ana", "bruno"]
    assert node_ids(graph.find_nodes("Person", {"onCall": True})) == ["ana"]
    assert graph.find_nodes("Team", {"onCall": True}) == []


@test("neighbors follows outgoing, incoming or both directions in insertion order and filters by edge type")
async def _():
    graph = organization()
    assert neighbor_ids(graph.neighbors("checkout-web")) == ["payments-api", "search-api"]
    assert neighbor_ids(graph.neighbors("checkout-web", direction="out")) == ["payments-api", "search-api"]
    assert neighbor_ids(graph.neighbors("checkout-web", direction="in")) == ["checkout", "recommendations"]
    assert neighbor_ids(graph.neighbors("checkout-web", direction="both")) == ["payments-api", "search-api", "checkout", "recommendations"]
    assert neighbor_ids(graph.neighbors("checkout-web", direction="both", types=["DEPENDS_ON"])) == ["payments-api", "recommendations"]
    assert neighbor_ids(graph.neighbors("payments-db", direction="in")) == ["payments-api", "invoices-worker"]
    first = graph.neighbors("payments", types=["OWNS"])[0]
    assert first["edge"] == {"from": "payments", "type": "OWNS", "to": "payments-api"}
    assert isinstance(await capture_error(lambda: graph.neighbors("ghost")), mod.GraphError)


@test("nodes_within_hops returns each reachable node once at its smallest depth, stops at the depth limit and survives cycles")
def _():
    graph = graph_of(["a", "b", "c", "d", "e", "f"], [
        ("a", "LINKS", "b"),
        ("a", "LINKS", "c"),
        ("b", "LINKS", "d"),
        ("c", "LINKS", "d"),
        ("d", "LINKS", "a"),
        ("d", "LINKS", "e"),
        ("e", "LINKS", "f"),
        ("f", "OTHER", "b"),
    ])
    assert summary(mod.nodes_within_hops(graph, "a", 1)) == ["b@1", "c@1"]
    assert summary(mod.nodes_within_hops(graph, "a", 2)) == ["b@1", "c@1", "d@2"]
    assert summary(mod.nodes_within_hops(graph, "a", 10)) == ["b@1", "c@1", "d@2", "e@3", "f@4"]
    assert summary(mod.nodes_within_hops(graph, "a", 0)) == []
    assert summary(mod.nodes_within_hops(graph, "d", 2, direction="in", types=["LINKS"])) == ["b@1", "c@1", "a@2"]
    assert summary(mod.nodes_within_hops(graph, "f", 1, direction="both")) == ["b@1", "e@1"]


@test("shortest_path returns the path with the fewest hops, reconstructed from the start, or None beyond the depth limit")
def _():
    graph = graph_of(["start", "long-1", "long-2", "long-3", "short-1", "goal", "island"], [
        ("start", "NEXT", "long-1"),
        ("long-1", "NEXT", "long-2"),
        ("long-2", "NEXT", "long-3"),
        ("long-3", "NEXT", "goal"),
        ("start", "NEXT", "short-1"),
        ("short-1", "NEXT", "goal"),
    ])
    path = mod.shortest_path(graph, "start", "goal", max_depth=5)
    assert path["nodes"] == ["start", "short-1", "goal"]
    assert path["edges"] == [
        {"from": "start", "type": "NEXT", "to": "short-1"},
        {"from": "short-1", "type": "NEXT", "to": "goal"},
    ]
    assert mod.shortest_path(graph, "start", "goal", max_depth=1) is None
    assert len(mod.shortest_path(graph, "start", "goal", max_depth=2)["nodes"]) == 3
    assert mod.shortest_path(graph, "start", "island", max_depth=10) is None
    assert mod.shortest_path(graph, "goal", "start", max_depth=10) is None
    assert mod.shortest_path(graph, "start", "start", max_depth=3) == {"nodes": ["start"], "edges": []}
    backwards = mod.shortest_path(graph, "goal", "start", max_depth=10, direction="both")
    assert backwards["nodes"] == ["goal", "short-1", "start"]
    assert backwards["edges"] == [
        {"from": "short-1", "type": "NEXT", "to": "goal"},
        {"from": "start", "type": "NEXT", "to": "short-1"},
    ]


@test("shortest_path matches a reference breadth-first distance on random graphs, and every returned path is made of real edges")
def _():
    for seed in range(1, 26):
        random = create_random(seed)
        ids = [f"n{index}" for index in range(12)]
        edges = []
        for _count in range(18):
            source = ids[int(random() * len(ids))]
            edge_type = "A" if random() < 0.5 else "B"
            target = ids[int(random() * len(ids))]
            edges.append((source, edge_type, target))
        graph = graph_of(ids, edges)
        distances = {"n0": 0}
        frontier = ["n0"]
        while frontier:
            next_frontier = []
            for current_id in frontier:
                for source, _type, target in edges:
                    if source == current_id and target not in distances:
                        distances[target] = distances[current_id] + 1
                        next_frontier.append(target)
            frontier = next_frontier
        for target in ids[1:]:
            path = mod.shortest_path(graph, "n0", target, max_depth=4)
            expected = distances.get(target)
            if expected is None or expected > 4:
                assert path is None, f"seed {seed}, target {target}"
                continue
            assert len(path["edges"]) == expected, f"seed {seed}, target {target}"
            assert path["nodes"][0] == "n0"
            assert path["nodes"][-1] == target
            for index, edge in enumerate(path["edges"]):
                assert edge["from"] == path["nodes"][index]
                assert edge["to"] == path["nodes"][index + 1]
                assert (edge["from"], edge["type"], edge["to"]) in edges


@test("follow_pattern answers a multi-hop question step by step, keeping distinct nodes in discovery order")
def _():
    graph = organization()
    assert node_ids(mod.follow_pattern(graph, ["payments-db"], [{"type": "DEPENDS_ON", "direction": "in"}])) == ["payments-api", "invoices-worker"]
    assert node_ids(mod.follow_pattern(graph, ["payments-db"], [
        {"type": "DEPENDS_ON", "direction": "in"},
        {"type": "OWNS", "direction": "in"},
    ])) == ["payments"]
    assert node_ids(mod.follow_pattern(graph, ["payments", "checkout"], [
        {"type": "OWNS", "direction": "out"},
        {"type": "DEPENDS_ON", "direction": "out"},
    ])) == ["payments-db", "payments-api"]
    assert node_ids(mod.follow_pattern(graph, ["cache"], [{"type": "OWNS", "direction": "in"}])) == []
    assert node_ids(mod.follow_pattern(graph, ["growth"], [])) == ["growth"]


@test("teams_affected_by finds the owners of every service that depends on a node within the hop limit, sorted and without duplicates")
def _():
    graph = organization()
    assert mod.teams_affected_by(graph, "payments-db", 1) == ["payments"]
    assert mod.teams_affected_by(graph, "payments-db", 2) == ["checkout", "payments"]
    assert mod.teams_affected_by(graph, "payments-db", 3) == ["checkout", "growth", "payments"]
    assert mod.teams_affected_by(graph, "payments-db", 10) == ["checkout", "growth", "payments"]
    assert mod.teams_affected_by(graph, "cache", 3) == ["search"]
    assert mod.teams_affected_by(graph, "recommendations", 3) == []
