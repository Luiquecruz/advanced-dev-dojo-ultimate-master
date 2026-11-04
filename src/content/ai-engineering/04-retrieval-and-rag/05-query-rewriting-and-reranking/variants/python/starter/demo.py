import asyncio

from dojo_ai import create_model
from dojo_ai.testing import fake_model, respond

from corpus import PASSAGES
from main import generate_queries, hyde_query, rerank
from vector import create_vector_search

search = create_vector_search(PASSAGES)
model = create_model()


def ids_of(passages):
    return ", ".join(passage["id"] for passage in passages)


async def main():
    question = "money back?"
    fake_model.reply(
        respond.json({"queries": ["refund policy for annual plans", "how long do refunds take to reach the card", "Money back?"]}),
        respond.text("Refunds for annual plans are paid within 30 days of purchase and reach the original card within 5 to 10 business days."),
    )

    print(f"Question: \"{question}\"")
    print(f"  plain search: {ids_of(search(question, 3))}")
    queries = await generate_queries(model, question)
    print(f"  multi-query:  {' | '.join(f'\"{query}\"' for query in queries)}")
    pooled = {}
    for query in queries:
        for passage in search(query, 3):
            pooled[passage["id"]] = passage
    print(f"  pooled candidates: {', '.join(pooled)}")
    hyde = await hyde_query(model, question)
    print(f"  HyDE search:  {ids_of(search(hyde, 3))}")

    candidates = list(pooled.values())
    fake_model.reply(
        respond.malformed_json({"scores": [{"id": "billing-refund-timing", "score": 9}, {"id": "billing-refund-window", "score": 8}, {"id": "billing-seats", "score": 2}]}),
        respond.json({"scores": [{"id": "billing-refund-timing", "score": 9}, {"id": "billing-refund-window", "score": 8}, {"id": "billing-seats", "score": "n/a"}, {"id": "invented-doc", "score": 10}]}),
        respond.error(503),
    )
    for attempt in ["malformed reply", "partial scores", "provider down"]:
        reranking = await rerank(model, question, candidates, top_k=3)
        order = ", ".join(result["id"] if result["score"] is None else f"{result['id']} ({result['score']})" for result in reranking["results"])
        print(f"  rerank, {attempt}: {'reranked' if reranking['reranked'] else 'kept retrieval order'} -> {order}")


if __name__ == "__main__":
    asyncio.run(main())
