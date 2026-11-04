import inspect
import math


def unique(ids):
    return list(dict.fromkeys(ids))


def mean(values):
    return sum(values) / len(values)


def relevant_ids(relevance):
    return [document_id for document_id, grade in relevance.items() if grade > 0]


def recall_at_k(retrieved, relevant, k):
    if not relevant:
        raise ValueError("A golden item needs at least one relevant id")
    top = set(unique(retrieved)[:k])
    return len([document_id for document_id in relevant if document_id in top]) / len(relevant)


def reciprocal_rank(retrieved, relevant):
    for position, document_id in enumerate(unique(retrieved)):
        if document_id in relevant:
            return 1 / (position + 1)
    return 0


def discounted_gain(grades):
    return sum((2 ** grade - 1) / math.log2(index + 2) for index, grade in enumerate(grades))


def ndcg_at_k(retrieved, relevance, k):
    ideal = discounted_gain(sorted((grade for grade in relevance.values() if grade > 0), reverse=True)[:k])
    if ideal == 0:
        return 0
    return discounted_gain([relevance.get(document_id, 0) for document_id in unique(retrieved)[:k]]) / ideal


async def evaluate_retriever(retrieve, golden_set, *, k=5):
    per_query = []
    for item in golden_set:
        retrieved = retrieve(item["query"], k)
        if inspect.isawaitable(retrieved):
            retrieved = await retrieved
        relevant = relevant_ids(item["relevance"])
        per_query.append({
            "query": item["query"],
            "retrieved": retrieved,
            "recall": recall_at_k(retrieved, relevant, k),
            "reciprocalRank": reciprocal_rank(retrieved, relevant),
            "ndcg": ndcg_at_k(retrieved, item["relevance"], k),
        })
    return {
        "k": k,
        "recallAtK": mean([result["recall"] for result in per_query]),
        "mrr": mean([result["reciprocalRank"] for result in per_query]),
        "ndcgAtK": mean([result["ndcg"] for result in per_query]),
        "perQuery": per_query,
    }


async def compare_retrievers(retrievers, golden_set, *, k=5):
    rows = []
    for name, retrieve in retrievers.items():
        report = await evaluate_retriever(retrieve, golden_set, k=k)
        rows.append({"name": name, "k": report["k"], "recallAtK": report["recallAtK"], "mrr": report["mrr"], "ndcgAtK": report["ndcgAtK"]})
    return sorted(rows, key=lambda row: row["ndcgAtK"], reverse=True)
