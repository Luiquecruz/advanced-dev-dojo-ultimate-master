from main import PropertyGraph, follow_pattern, nodes_within_hops, shortest_path, teams_affected_by


def build_organization():
    graph = PropertyGraph()
    people = [
        {"id": "ana", "name": "Ana", "onCall": True},
        {"id": "bruno", "name": "Bruno", "onCall": False},
        {"id": "chen", "name": "Chen", "onCall": True},
        {"id": "dara", "name": "Dara", "onCall": True},
    ]
    for person in people:
        graph.add_node({"id": person["id"], "label": "Person", "properties": {"name": person["name"], "onCall": person["onCall"]}})
    for team_id, name in [("payments-team", "Payments"), ("checkout-team", "Checkout"), ("growth-team", "Growth")]:
        graph.add_node({"id": team_id, "label": "Team", "properties": {"name": name}})
    for service_id in ["payments-api", "checkout-web", "invoices-worker", "recommendations"]:
        graph.add_node({"id": service_id, "label": "Service", "properties": {"name": service_id}})
    graph.add_node({"id": "payments-db", "label": "Database", "properties": {"name": "payments-db", "engine": "postgres"}})

    for source, edge_type, target in [
        ("ana", "MEMBER_OF", "payments-team"),
        ("bruno", "MEMBER_OF", "payments-team"),
        ("chen", "MEMBER_OF", "checkout-team"),
        ("dara", "MEMBER_OF", "growth-team"),
        ("payments-team", "OWNS", "payments-api"),
        ("payments-team", "OWNS", "invoices-worker"),
        ("checkout-team", "OWNS", "checkout-web"),
        ("growth-team", "OWNS", "recommendations"),
        ("payments-api", "DEPENDS_ON", "payments-db"),
        ("invoices-worker", "DEPENDS_ON", "payments-db"),
        ("checkout-web", "DEPENDS_ON", "payments-api"),
        ("recommendations", "DEPENDS_ON", "checkout-web"),
    ]:
        graph.add_edge({"from": source, "to": target, "type": edge_type})
    return graph


def main():
    graph = build_organization()

    print("Question: payments-db is down. Which teams are affected, and who is on call?")
    for max_depth in [1, 2, 3]:
        print(f"  within {max_depth} DEPENDS_ON hop(s): {', '.join(teams_affected_by(graph, 'payments-db', max_depth))}")

    dependents = nodes_within_hops(graph, "payments-db", 2, direction="in", types=["DEPENDS_ON"])
    team_ids = [team["id"] for team in follow_pattern(graph, [reached["node"]["id"] for reached in dependents], [{"type": "OWNS", "direction": "in"}])]
    on_call = [person for person in follow_pattern(graph, team_ids, [{"type": "MEMBER_OF", "direction": "in"}]) if person["properties"]["onCall"] is True]
    print(f"  page within 2 hops: {', '.join(person['properties']['name'] for person in on_call)}")

    print("\nQuestion: how is Dara connected to payments-db?")
    path = shortest_path(graph, "dara", "payments-db", max_depth=6, direction="both")
    if path is None:
        print("  no path within 6 hops")
    else:
        steps = [f"{edge['from']} -[{edge['type']}]-> {edge['to']}" for edge in path["edges"]]
        print(f"  {len(path['edges'])} hops:\n    " + "\n    ".join(steps))
    within_three = shortest_path(graph, "dara", "payments-db", max_depth=3, direction="both")
    print(f"  within 3 hops only: {'no path' if within_three is None else 'found'}")


if __name__ == "__main__":
    main()
