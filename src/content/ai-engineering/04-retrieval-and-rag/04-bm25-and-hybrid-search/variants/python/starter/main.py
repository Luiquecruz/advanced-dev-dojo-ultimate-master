import re

STOPWORDS = {"a", "an", "and", "are", "as", "at", "be", "by", "can", "do", "for", "from", "how", "i", "in", "is", "it", "my", "of", "on", "or", "that", "the", "this", "to", "was", "what", "when", "where", "which", "who", "why", "with"}


def tokenize(text):
    words = re.findall(r"[^\W_]+", text.lower())
    return [re.sub(r"(ing|ed|es|s)$", "", word) or word for word in words if word not in STOPWORDS]


class Bm25Index:
    """BM25 keyword index with statistics precomputed at construction."""

    def __init__(self, documents, k1, b):
        self._documents = documents
        self._k1 = k1
        self._b = b
        # TODO: precompute term counts per document, document lengths, the average length and document frequencies

    def idf(self, term):
        # TODO: ln(1 + (N - n + 0.5) / (n + 0.5)) for the first token of term
        raise NotImplementedError

    def score(self, query, document_id):
        # TODO: sum idf x saturated, length-normalized term frequency over the unique query tokens
        raise NotImplementedError

    def search(self, query, top_k=10):
        # TODO: score every document, keep scores above 0, sort from highest to lowest, take top_k
        raise NotImplementedError


def create_bm25_index(documents, *, k1=1.2, b=0.75):
    return Bm25Index(documents, k1, b)


def reciprocal_rank_fusion(rankings, *, k=60, top_k=None):
    # TODO: add 1 / (k + rank) for the first position of each id in each ranking, then sort
    raise NotImplementedError


async def hybrid_search(query, retrievers, *, candidates=20, top_k=5, k=60):
    # TODO: ask every retriever for `candidates` ids in parallel, skip the ones that fail (raise if all fail), fuse with reciprocal_rank_fusion
    raise NotImplementedError
