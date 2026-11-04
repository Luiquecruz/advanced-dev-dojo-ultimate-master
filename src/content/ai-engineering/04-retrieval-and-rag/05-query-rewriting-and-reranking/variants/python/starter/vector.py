from dojo_ai import cosine_similarity, embed


def create_vector_search(documents):
    vectors = embed([document["text"] for document in documents])

    def search(query, limit):
        query_vector = embed(query)
        results = [{**document, "score": cosine_similarity(query_vector, vector)} for document, vector in zip(documents, vectors)]
        return sorted(results, key=lambda result: result["score"], reverse=True)[:limit]

    return search
