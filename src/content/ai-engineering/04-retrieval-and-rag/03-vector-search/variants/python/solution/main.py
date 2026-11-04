import math

from dojo_ai import embed


def similarity(left, right):
    if len(left) != len(right):
        raise ValueError(f"Vectors have different dimensions: {len(left)} and {len(right)}")
    dot = 0.0
    left_squares = 0.0
    right_squares = 0.0
    for left_value, right_value in zip(left, right):
        dot += left_value * right_value
        left_squares += left_value * left_value
        right_squares += right_value * right_value
    norms = math.sqrt(left_squares) * math.sqrt(right_squares)
    return 0 if norms == 0 else dot / norms


def matches_filter(metadata, filter=None):
    for key, expected in (filter or {}).items():
        if key not in metadata:
            return False
        if isinstance(expected, list):
            if metadata[key] not in expected:
                return False
        elif metadata[key] != expected:
            return False
    return True


class VectorIndex:
    """In-memory vector index over records embedded at ingestion."""

    def __init__(self, embedder):
        self._embedder = embedder
        self._records = {}
        self._dimensions = None

    def add(self, batch):
        vectors = self._embedder([record["text"] for record in batch])
        expected = self._dimensions if self._dimensions is not None else (len(vectors[0]) if vectors else None)
        mismatch = next((vector for vector in vectors if len(vector) != expected), None)
        if mismatch is not None:
            raise ValueError(f"Embedding dimension mismatch: the index holds {expected}-dimension vectors, got {len(mismatch)}")
        self._dimensions = expected
        for record, vector in zip(batch, vectors):
            self._records[record["id"]] = {**record, "vector": vector}

    def remove(self, record_id):
        return self._records.pop(record_id, None) is not None

    def count(self):
        return len(self._records)

    def search(self, query, *, top_k=3, filter=None, min_score=None):
        [query_vector] = self._embedder([query])
        results = [
            {"id": record["id"], "text": record["text"], "metadata": record["metadata"], "score": similarity(query_vector, record["vector"])}
            for record in self._records.values()
            if matches_filter(record["metadata"], filter)
        ]
        kept = [result for result in results if min_score is None or result["score"] >= min_score]
        return sorted(kept, key=lambda result: result["score"], reverse=True)[:top_k]


def create_vector_index(embedder=None):
    return VectorIndex(embed if embedder is None else embedder)
