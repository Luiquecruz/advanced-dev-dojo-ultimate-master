from dojo_ai import cosine_similarity, embed


def can_read(principal, document):
    if principal["tenantId"] != document["tenantId"]:
        return False
    return principal["userId"] in document.get("allowedUsers", []) or any(group in principal["groups"] for group in document["allowedGroups"])


class SecureIndex:
    """Multi-tenant vector index that only ranks documents the principal can read."""

    def __init__(self, embedder):
        self._embedder = embedder
        self._documents = {}

    def upsert(self, document):
        existing = self._documents.get(document["id"])
        if existing is not None and existing["text"] == document["text"]:
            vector = existing["vector"]
        else:
            vector = self._embedder([document["text"]])[0]
        self._documents[document["id"]] = {**document, "vector": vector}

    def remove(self, document_id):
        return self._documents.pop(document_id, None) is not None

    def count(self):
        return len(self._documents)

    def search(self, principal, query, *, top_k=3, min_score=None):
        readable = [document for document in self._documents.values() if can_read(principal, document)]
        if not readable:
            return []
        [query_vector] = self._embedder([query])
        results = [{"id": document["id"], "text": document["text"], "score": cosine_similarity(query_vector, document["vector"])} for document in readable]
        kept = [result for result in results if min_score is None or result["score"] >= min_score]
        return sorted(kept, key=lambda result: result["score"], reverse=True)[:top_k]


def create_secure_index(embedder=None):
    return SecureIndex(embed if embedder is None else embedder)


async def answer_question(model, index, principal, question, *, top_k=3, min_score=0.1):
    passages = index.search(principal, question, top_k=top_k, min_score=min_score)
    if not passages:
        return {"answer": None, "sourceIds": []}
    context = "\n\n".join(f"[{position + 1}] {passage['text']}" for position, passage in enumerate(passages))
    response = await model.generate({
        "messages": [
            {"role": "system", "content": "Answer using only the numbered sources and cite them as [n]. If they do not answer the question, say so."},
            {"role": "user", "content": f"Sources:\n\n{context}\n\nQuestion: {question}"},
        ],
    })
    return {"answer": response["text"], "sourceIds": [passage["id"] for passage in passages]}
