import math
import re

from dojo_ai import cosine_similarity, embed

STOPWORDS = {"a", "an", "and", "are", "as", "at", "be", "by", "can", "do", "for", "from", "how", "i", "in", "is", "it", "my", "of", "on", "or", "that", "the", "this", "to", "was", "what", "when", "where", "which", "who", "why", "with"}


def tokenize(text):
    words = re.findall(r"[^\W_]+", text.lower())
    return [re.sub(r"(ing|ed|es|s)$", "", word) or word for word in words if word not in STOPWORDS]


def create_bm25_retriever(documents, k1=1.2, b=0.75):
    tokens = [tokenize(document["text"]) for document in documents]
    average_length = sum(len(document_tokens) for document_tokens in tokens) / len(documents)

    def idf(token):
        containing = len([document_tokens for document_tokens in tokens if token in document_tokens])
        return math.log(1 + (len(documents) - containing + 0.5) / (containing + 0.5))

    def retrieve(query, limit):
        query_tokens = list(dict.fromkeys(tokenize(query)))
        results = []
        for document, document_tokens in zip(documents, tokens):
            normalization = 1 - b + b * len(document_tokens) / average_length
            score = 0
            for token in query_tokens:
                frequency = document_tokens.count(token)
                score += idf(token) * frequency * (k1 + 1) / (frequency + k1 * normalization)
            results.append({"id": document["id"], "score": score})
        matching = [result for result in results if result["score"] > 0]
        return [result["id"] for result in sorted(matching, key=lambda result: result["score"], reverse=True)[:limit]]

    return retrieve


def create_vector_retriever(documents):
    vectors = embed([document["text"] for document in documents])

    def retrieve(query, limit):
        query_vector = embed(query)
        results = [{"id": document["id"], "score": cosine_similarity(query_vector, vector)} for document, vector in zip(documents, vectors)]
        return [result["id"] for result in sorted(results, key=lambda result: result["score"], reverse=True)[:limit]]

    return retrieve


def create_hybrid_retriever(retrievers, candidates=20, rank_constant=60):
    def retrieve(query, limit):
        scores = {}
        for retriever in retrievers:
            for position, document_id in enumerate(retriever(query, candidates)):
                scores[document_id] = scores.get(document_id, 0) + 1 / (rank_constant + position + 1)
        return [document_id for document_id, _ in sorted(scores.items(), key=lambda entry: entry[1], reverse=True)[:limit]]

    return retrieve
