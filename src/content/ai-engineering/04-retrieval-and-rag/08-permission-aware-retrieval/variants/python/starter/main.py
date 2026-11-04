from dojo_ai import cosine_similarity, embed


def can_read(principal, document):
    # TODO: same tenant, and the user is listed in allowedUsers or shares a group with allowedGroups; deny otherwise
    return True


class SecureIndex:
    """Multi-tenant vector index that only ranks documents the principal can read."""

    def __init__(self, embedder):
        self._embedder = embedder
        self._documents = {}

    def upsert(self, document):
        # TODO: reuse the stored vector when the text did not change, embed otherwise
        self._documents[document["id"]] = {**document, "vector": self._embedder([document["text"]])[0]}

    def remove(self, document_id):
        # TODO: delete the document
        return False

    def count(self):
        return len(self._documents)

    def search(self, principal, query, *, top_k=3, min_score=None):
        # TODO: keep only the documents the principal can read BEFORE ranking
        [query_vector] = self._embedder([query])
        results = [{"id": document["id"], "text": document["text"], "score": cosine_similarity(query_vector, document["vector"])} for document in self._documents.values()]
        kept = [result for result in results if min_score is None or result["score"] >= min_score]
        return sorted(kept, key=lambda result: result["score"], reverse=True)[:top_k]


def create_secure_index(embedder=None):
    return SecureIndex(embed if embedder is None else embedder)


async def answer_question(model, index, principal, question, *, top_k=3, min_score=0.1):
    # TODO: search as the principal, skip the model when nothing is readable, send numbered passages and the question
    raise NotImplementedError
