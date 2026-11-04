from dojo_ai import cosine_similarity, embed


def create_vector_retriever(documents):
    vectors = embed([document["text"] for document in documents])

    def retrieve(query, limit):
        query_vector = embed(query)
        results = [{"id": document["id"], "score": cosine_similarity(query_vector, vector)} for document, vector in zip(documents, vectors)]
        matching = [result for result in results if result["score"] > 0]
        return [result["id"] for result in sorted(matching, key=lambda result: result["score"], reverse=True)[:limit]]

    return retrieve
