import asyncio

from corpus import PASSAGES
from main import create_bm25_index, hybrid_search
from vector import create_vector_retriever

bm25 = create_bm25_index(PASSAGES)
vector_retriever = create_vector_retriever(PASSAGES)


def keyword_retriever(query, limit):
    return [result["id"] for result in bm25.search(query, limit)]


async def compare(query):
    print(f"\n\"{query}\"")
    print(f"  BM25:   {', '.join(keyword_retriever(query, 3)) or '(nothing)'}")
    print(f"  vector: {', '.join(vector_retriever(query, 3)) or '(nothing)'}")
    fused = await hybrid_search(query, [keyword_retriever, vector_retriever], top_k=3)
    print(f"  hybrid: {', '.join(f'{result['id']} ({result['score']:.4f})' for result in fused)}")


async def offline(query, limit):
    raise ConnectionError("keyword index offline")


async def main():
    print(f"idf(\"plan\") = {bm25.idf('plan'):.3f}  (common word)")
    print(f"idf(\"4012\") = {bm25.idf('4012'):.3f}  (rare code)")
    await compare("error E-4012 when verifying forwarding")
    await compare("How long do refunds take to reach my card?")
    await compare("two-factor login for agents")
    degraded = await hybrid_search("single sign-on", [offline, vector_retriever], top_k=2)
    print(f"\nKeyword index offline, hybrid still answers from vectors: {', '.join(result['id'] for result in degraded)}")


if __name__ == "__main__":
    asyncio.run(main())
