import math


def _dot(a, b):
    return sum(x * y for x, y in zip(a, b))


def _norm(a):
    return math.sqrt(_dot(a, a))


def cosine_similarity(a, b):
    lengths = _norm(a) * _norm(b)
    if lengths == 0:
        return 0.0
    return _dot(a, b) / lengths


def exact_search(items, query, k):
    scored = [{"id": item["id"], "score": cosine_similarity(item["vector"], query)} for item in items]
    scored.sort(key=lambda entry: (-entry["score"], entry["id"]))
    return [entry["id"] for entry in scored[:k]]


def _rank_centroids(centroids, vector):
    scores = [cosine_similarity(centroid, vector) for centroid in centroids]
    return sorted(range(len(centroids)), key=lambda index: (-scores[index], index))


class IvfIndex:
    def __init__(self, centroids):
        self._centroids = centroids
        self._lists = [[] for _ in centroids]

    def add(self, item_id, vector):
        nearest = _rank_centroids(self._centroids, vector)[0]
        self._lists[nearest].append({"id": item_id, "vector": vector})

    def list_sizes(self):
        return [len(items) for items in self._lists]

    def search(self, query, k, nprobe):
        probed = _rank_centroids(self._centroids, query)[:nprobe]
        candidates = [item for index in probed for item in self._lists[index]]
        return exact_search(candidates, query, k)


if __name__ == "__main__":
    items = [
        {"id": "cats", "vector": [0.9, 0.1, 0]},
        {"id": "dogs", "vector": [0.7, 0.3, 0]},
        {"id": "taxes", "vector": [0, 0.1, 0.9]},
    ]
    print(exact_search(items, [1, 0, 0], k=2))
