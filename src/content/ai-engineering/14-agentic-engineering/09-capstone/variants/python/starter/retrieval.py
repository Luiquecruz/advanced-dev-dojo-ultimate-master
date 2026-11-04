from dojo_ai import cosine_similarity, embed


class Retriever:
    """Semantic search over help documents: `search(query, *, top_k=3, min_score=0.1)` returns `{"id", "title", "text", "score"}` hits."""

    def __init__(self, documents):
        self.documents = documents

    def search(self, query, *, top_k=3, min_score=0.1):
        # TODO: embed every document once ("<title>\n<text>"), then rank by cosine similarity to the query, drop scores below min_score, keep top_k
        return [{"id": document["id"], "title": document["title"], "text": document["text"], "score": 0} for document in self.documents[:top_k]]


def create_retriever(documents):
    return Retriever(documents)
