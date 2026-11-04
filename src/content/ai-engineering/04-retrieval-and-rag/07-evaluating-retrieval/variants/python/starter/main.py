def recall_at_k(retrieved, relevant, k):
    # TODO: share of relevant ids among the first k unique retrieved ids; raise when relevant is empty
    raise NotImplementedError


def reciprocal_rank(retrieved, relevant):
    # TODO: 1 / position of the first relevant id among the unique retrieved ids, or 0
    raise NotImplementedError


def ndcg_at_k(retrieved, relevance, k):
    # TODO: DCG of the first k unique ids divided by the DCG of the ideal ordering of the grades
    raise NotImplementedError


async def evaluate_retriever(retrieve, golden_set, *, k=5):
    # TODO: call retrieve(query, k) for each golden item (await it when it returns an awaitable), score it, and average the three metrics
    raise NotImplementedError


async def compare_retrievers(retrievers, golden_set, *, k=5):
    # TODO: evaluate every retriever and return {"name", "k", "recallAtK", "mrr", "ndcgAtK"} rows sorted by nDCG, best first
    raise NotImplementedError
