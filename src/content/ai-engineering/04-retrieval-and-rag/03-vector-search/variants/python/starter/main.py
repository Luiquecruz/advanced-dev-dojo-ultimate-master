from dojo_ai import embed


def similarity(left, right):
    # TODO: dot product divided by the product of the two lengths; 0 when a length is 0; raise when dimensions differ
    raise NotImplementedError


def matches_filter(metadata, filter=None):
    # TODO: every filter key must exist in metadata and equal the value (or be one of the values when it is a list)
    raise NotImplementedError


class VectorIndex:
    """In-memory vector index over records embedded at ingestion."""

    def __init__(self, embedder):
        self._embedder = embedder
        self._records = {}

    def add(self, batch):
        # TODO: embed the whole batch in one call, reject vectors whose dimension differs from the index, upsert by id
        raise NotImplementedError

    def remove(self, record_id):
        return self._records.pop(record_id, None) is not None

    def count(self):
        return len(self._records)

    def search(self, query, *, top_k=3, filter=None, min_score=None):
        # TODO: embed the query, keep records that match the filter, score them, drop scores below min_score, sort and take top_k
        raise NotImplementedError


def create_vector_index(embedder=None):
    return VectorIndex(embed if embedder is None else embedder)
