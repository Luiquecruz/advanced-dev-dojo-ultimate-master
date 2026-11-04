import asyncio
import inspect
import math
import re

STOPWORDS = {"a", "an", "and", "are", "as", "at", "be", "by", "can", "do", "for", "from", "how", "i", "in", "is", "it", "my", "of", "on", "or", "that", "the", "this", "to", "was", "what", "when", "where", "which", "who", "why", "with"}


def tokenize(text):
    words = re.findall(r"[^\W_]+", text.lower())
    return [re.sub(r"(ing|ed|es|s)$", "", word) or word for word in words if word not in STOPWORDS]


def unique_tokens(text):
    return list(dict.fromkeys(tokenize(text)))


class Bm25Index:
    """BM25 keyword index with statistics precomputed at construction."""

    def __init__(self, documents, k1, b):
        self._documents = documents
        self._k1 = k1
        self._b = b
        self._term_counts = []
        self._lengths = []
        self._document_frequency = {}
        for document in documents:
            tokens = tokenize(document["text"])
            counts = {}
            for token in tokens:
                counts[token] = counts.get(token, 0) + 1
            self._term_counts.append(counts)
            self._lengths.append(len(tokens))
            for token in counts:
                self._document_frequency[token] = self._document_frequency.get(token, 0) + 1
        self._average_length = sum(self._lengths) / max(len(documents), 1)

    def _inverse_document_frequency(self, token):
        containing = self._document_frequency.get(token, 0)
        return math.log(1 + (len(self._documents) - containing + 0.5) / (containing + 0.5))

    def _score_at(self, query_tokens, index):
        length_normalization = 1 - self._b + self._b * self._lengths[index] / self._average_length
        total = 0
        for token in query_tokens:
            frequency = self._term_counts[index].get(token, 0)
            total += self._inverse_document_frequency(token) * frequency * (self._k1 + 1) / (frequency + self._k1 * length_normalization)
        return total

    def idf(self, term):
        return self._inverse_document_frequency(tokenize(term)[0])

    def score(self, query, document_id):
        index = next(position for position, document in enumerate(self._documents) if document["id"] == document_id)
        return self._score_at(unique_tokens(query), index)

    def search(self, query, top_k=10):
        query_tokens = unique_tokens(query)
        results = [{"id": document["id"], "score": self._score_at(query_tokens, index)} for index, document in enumerate(self._documents)]
        matching = [result for result in results if result["score"] > 0]
        return sorted(matching, key=lambda result: result["score"], reverse=True)[:top_k]


def create_bm25_index(documents, *, k1=1.2, b=0.75):
    return Bm25Index(documents, k1, b)


def reciprocal_rank_fusion(rankings, *, k=60, top_k=None):
    scores = {}
    for ranking in rankings:
        seen = set()
        for position, document_id in enumerate(ranking):
            if document_id in seen:
                continue
            seen.add(document_id)
            scores[document_id] = scores.get(document_id, 0) + 1 / (k + position + 1)
    fused = sorted(({"id": document_id, "score": score} for document_id, score in scores.items()), key=lambda result: result["score"], reverse=True)
    return fused if top_k is None else fused[:top_k]


async def call_retriever(retriever, query, limit):
    ranking = retriever(query, limit)
    return await ranking if inspect.isawaitable(ranking) else ranking


async def hybrid_search(query, retrievers, *, candidates=20, top_k=5, k=60):
    outcomes = await asyncio.gather(*(call_retriever(retriever, query, candidates) for retriever in retrievers), return_exceptions=True)
    rankings = [outcome for outcome in outcomes if not isinstance(outcome, BaseException)]
    if not rankings:
        raise ExceptionGroup("Every retriever failed", [outcome for outcome in outcomes if isinstance(outcome, Exception)])
    return reciprocal_rank_fusion(rankings, k=k, top_k=top_k)
