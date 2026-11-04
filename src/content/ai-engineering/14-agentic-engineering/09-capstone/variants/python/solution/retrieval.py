from dojo_ai import cosine_similarity, embed


class Retriever:
    """Semantic search over help documents: `search(query, *, top_k=3, min_score=0.1)` returns `{"id", "title", "text", "score"}` hits."""

    def __init__(self, documents):
        self.documents = documents
        self.vectors = embed([f"{document['title']}\n{document['text']}" for document in documents])

    def search(self, query, *, top_k=3, min_score=0.1):
        query_vector = embed(query)
        hits = [
            {"id": document["id"], "title": document["title"], "text": document["text"], "score": cosine_similarity(query_vector, vector)}
            for document, vector in zip(self.documents, self.vectors)
        ]
        ranked = sorted((hit for hit in hits if hit["score"] >= min_score), key=lambda hit: (-hit["score"], hit["id"]))
        return ranked[:top_k]


def create_retriever(documents):
    return Retriever(documents)
