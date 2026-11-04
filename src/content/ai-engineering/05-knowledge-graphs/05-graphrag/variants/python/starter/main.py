def detect_communities(graph, max_iterations=20):
    # TODO: weighted label propagation over undirected neighbors, visiting ids in sorted order; group, sort and number the communities
    return [{"id": f"community-{index + 1}", "members": [entity["id"]]} for index, entity in enumerate(graph["entities"])]


async def summarize_communities(model, graph, communities):
    # TODO: one JSON report per community from its own entities and relations; one retry, then a fallback report built from the graph
    raise NotImplementedError


def route_question(question, graph):
    # TODO: local with the ids of every entity named in the question (whole words, any case), otherwise global
    return {"mode": "global"}


async def answer_local(model, question, graph, entity_ids, hops=1):
    # TODO: collect the neighborhood within hops, put its entities and relations in the prompt, answer with one call
    raise NotImplementedError


async def answer_global(model, question, reports, batch_size=2, max_points=5):
    # TODO: map each batch of reports to rated points, keep the best max_points by score, reduce them into one answer
    raise NotImplementedError
