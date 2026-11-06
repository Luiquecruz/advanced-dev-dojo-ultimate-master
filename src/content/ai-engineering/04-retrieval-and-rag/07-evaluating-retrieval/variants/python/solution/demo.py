import asyncio

from corpus import PASSAGES
from golden import GOLDEN_SET
from main import compare_retrievers, evaluate_retriever
from retrievers import create_bm25_retriever, create_hybrid_retriever, create_vector_retriever


def percent(value):
    return f"{value * 100:.1f}%".rjust(7)


async def main():
    bm25 = create_bm25_retriever(PASSAGES)
    vector = create_vector_retriever(PASSAGES)
    hybrid = create_hybrid_retriever([bm25, vector])

    print(f"Retrieval eval report: {len(GOLDEN_SET)} golden queries, {len(PASSAGES)} passages, k = 3\n")
    print("retriever      recall@3      MRR   nDCG@3")
    for row in await compare_retrievers({"BM25 only": bm25, "vector only": vector, "hybrid": hybrid}, GOLDEN_SET, k=3):
        print(f"{row['name'].ljust(12)} {percent(row['recallAtK'])}  {percent(row['mrr'])}  {percent(row['ndcgAtK'])}")
    print("\nConstela Mission embeddings are lexical, so BM25 is hard to beat here: the point is to measure on your corpus, not to assume hybrid always wins.")

    report = await evaluate_retriever(hybrid, GOLDEN_SET, k=3)
    misses = [result for result in report["perQuery"] if result["recall"] < 1]
    print(f"\nHybrid queries that miss a relevant passage in the top 3 ({len(misses)}):")
    for miss in misses:
        print(f"  \"{miss['query']}\" -> {', '.join(miss['retrieved'])} (recall {percent(miss['recall']).strip()})")


if __name__ == "__main__":
    asyncio.run(main())
