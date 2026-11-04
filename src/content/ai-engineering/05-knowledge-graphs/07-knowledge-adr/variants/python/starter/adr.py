ADR = {
    "id": 5,
    # TODO: a short title naming the decision
    "title": "",
    # TODO: accept the decision
    "status": "proposed",
    "layer": "context",
    # TODO: the forces from the briefing: question types, sources and teams, compliance, name variants, freshness, budget
    "context": "",
    # TODO: one sentence starting with "We will", naming the representation, the extraction safeguards and how each question type is answered
    "decision": "",
    # TODO: at least two {"option": ..., "reason": ...} you considered and rejected, each reason citing a fact from the briefing
    "alternatives": [],
    # TODO: what the team gains and what it pays or must watch
    "consequences": {"positive": [], "negative": []},
}

KNOWLEDGE_PLAN = {
    # TODO: "property-graph", "rdf" or "vector-only"
    "representation": "vector-only",
    # TODO: classes and relations ({"name", "domain", "range"}) that answer the competency questions
    "ontology": {
        "classes": [],
        "relations": [],
    },
    # TODO: which safeguards the briefing requires
    "extraction": {"validateAgainstOntology": False, "entityResolution": False, "provenance": False, "logRejected": False},
    # TODO: local "graph-traversal" or "vector-search"; global "community-summaries" or "none"; maxHops for traversal
    "retrieval": {"local": "vector-search", "global": "none", "maxHops": 1},
    # TODO: how many full community summary rebuilds per month
    "summaryRebuildsPerMonth": 0,
    # TODO: documents per month x extraction cost per document + rebuilds per month x cost per rebuild
    "projectedMonthlyUsd": 0,
    # TODO: the governed metric the briefing names, with its owner and definition
    "semanticLayer": {"metrics": []},
}
