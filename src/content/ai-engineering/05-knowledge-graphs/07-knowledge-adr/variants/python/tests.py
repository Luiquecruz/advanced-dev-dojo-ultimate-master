import re

DOCUMENTS_PER_MONTH = 8700
EXTRACTION_USD_PER_DOCUMENT = 0.004
REBUILD_USD = 45
INDEXING_BUDGET_USD = 250
COMPETENCY_PATHS = [
    {"question": "Which products are affected if a supplier fails?", "from": "supplier", "to": "product", "hops": 2},
    {"question": "Which regulations apply to products containing a part from a supplier?", "from": "supplier", "to": "regulation", "hops": 3},
]


def shortest_hops(start, target):
    relations = mod.KNOWLEDGE_PLAN["ontology"]["relations"]
    distances = {start: 0}
    frontier = [start]
    while frontier:
        next_frontier = []
        for current in frontier:
            for relation in relations:
                reached = relation["range"].lower()
                if relation["domain"].lower() == current and reached not in distances:
                    distances[reached] = distances[current] + 1
                    next_frontier.append(reached)
        frontier = next_frontier
    return distances.get(target)


def projected_cost():
    return DOCUMENTS_PER_MONTH * EXTRACTION_USD_PER_DOCUMENT + mod.KNOWLEDGE_PLAN["summaryRebuildsPerMonth"] * REBUILD_USD


@test('the ADR is an accepted context-layer decision whose context names multi-hop and global questions, traceability and the budget, with a "We will" decision')
def _():
    adr = mod.ADR
    assert isinstance(adr["id"], int) and not isinstance(adr["id"], bool) and adr["id"] > 0
    assert adr["status"] == "accepted"
    assert adr["layer"] == "context"
    assert len(adr["title"].strip()) >= 10
    assert len(adr["context"].strip()) >= 80
    assert re.search(r"multi-hop|hops?|affected|traversal", adr["context"], re.IGNORECASE)
    assert re.search(r"global|portfolio|across", adr["context"], re.IGNORECASE)
    assert re.search(r"trace|provenance|audit|compliance|source", adr["context"], re.IGNORECASE)
    assert re.search(r"cost|budget|\$", adr["context"], re.IGNORECASE)
    assert len(adr["decision"].strip()) >= 40
    assert re.match(r"we will\b", adr["decision"].strip(), re.IGNORECASE)


@test("rejects plain vector RAG among at least two distinct alternatives, and lists positive and negative consequences")
def _():
    adr = mod.ADR
    assert isinstance(adr["alternatives"], list)
    assert len(adr["alternatives"]) >= 2
    for alternative in adr["alternatives"]:
        assert len(alternative["option"].strip()) >= 3
        assert len(alternative["reason"].strip()) >= 20
    options = [alternative["option"].strip().lower() for alternative in adr["alternatives"]]
    assert len(set(options)) == len(options)
    assert any(re.search(r"vector|plain rag|embedding", option) for option in options)
    for side in ["positive", "negative"]:
        items = adr["consequences"][side]
        assert isinstance(items, list)
        assert len(items) >= 1
        for item in items:
            assert len(item.strip()) >= 15


@test("the plan uses a graph representation and an ontology whose relations only reference declared classes")
def _():
    plan = mod.KNOWLEDGE_PLAN
    assert plan["representation"] in ["property-graph", "rdf"]
    classes = [name.lower() for name in plan["ontology"]["classes"]]
    for name in ["supplier", "part", "product", "regulation"]:
        assert name in classes, name
    assert len(set(classes)) == len(classes)
    relations = plan["ontology"]["relations"]
    assert len(relations) >= 3
    for relation in relations:
        assert len(relation["name"].strip()) >= 2
        assert relation["domain"].lower() in classes, relation["domain"]
        assert relation["range"].lower() in classes, relation["range"]


@test("every competency question has a directed path in the ontology, and graph traversal reaches it within maxHops")
def _():
    retrieval = mod.KNOWLEDGE_PLAN["retrieval"]
    assert retrieval["local"] == "graph-traversal"
    for path in COMPETENCY_PATHS:
        hops = shortest_hops(path["from"], path["to"])
        assert hops is not None, path["question"]
        assert hops <= retrieval["maxHops"], path["question"]
    assert retrieval["maxHops"] <= 4


@test("extraction validates against the ontology, resolves entity names, keeps provenance and logs rejected facts, as the briefing requires")
def _():
    assert mod.KNOWLEDGE_PLAN["extraction"] == {"validateAgainstOntology": True, "entityResolution": True, "provenance": True, "logRejected": True}


@test("global questions use community summaries rebuilt often enough for 7-day freshness, and the projected cost fits the indexing budget")
def _():
    plan = mod.KNOWLEDGE_PLAN
    assert plan["retrieval"]["global"] == "community-summaries"
    assert plan["summaryRebuildsPerMonth"] >= 4
    expected = projected_cost()
    projected = plan["projectedMonthlyUsd"]
    assert isinstance(projected, (int, float)) and not isinstance(projected, bool)
    assert abs(projected - expected) <= expected * 0.1
    assert expected <= INDEXING_BUDGET_USD
    assert projected <= INDEXING_BUDGET_USD


@test("revenue at risk is a governed semantic layer metric owned by finance, with its 12-month definition")
def _():
    metrics = mod.KNOWLEDGE_PLAN["semanticLayer"]["metrics"]
    revenue_at_risk = next((metric for metric in metrics if re.search(r"revenue at risk", metric["name"], re.IGNORECASE)), None)
    assert revenue_at_risk is not None
    assert re.search(r"finance", revenue_at_risk["owner"], re.IGNORECASE)
    assert len(revenue_at_risk["definition"].strip()) >= 20
    assert re.search(r"12|twelve", revenue_at_risk["definition"], re.IGNORECASE)
    assert re.search(r"high risk|high-risk", revenue_at_risk["definition"], re.IGNORECASE)
