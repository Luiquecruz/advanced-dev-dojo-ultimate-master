import math


def _dot(a, b):
    return sum(x * y for x, y in zip(a, b))


def cosine_similarity(a, b):
    # TODO: divide by the product of both lengths, and return 0 when either length is zero
    return _dot(a, b)


def exact_search(items, query, k):
    # TODO: break ties between equal similarities by id ascending
    scored = [{"id": item["id"], "score": cosine_similarity(item["vector"], query)} for item in items]
    scored.sort(key=lambda entry: -entry["score"])
    return [entry["id"] for entry in scored[:k]]


class IvfIndex:
    def __init__(self, centroids):
        self._centroids = centroids
        self._lists = [[] for _ in centroids]

    def add(self, item_id, vector):
        # TODO: store the vector in the list of its most similar centroid
        self._lists[0].append({"id": item_id, "vector": vector})

    def list_sizes(self):
        return [len(items) for items in self._lists]

    def search(self, query, k, nprobe):
        # TODO: rank the centroids by similarity to the query and search only the first nprobe lists
        candidates = [item for items in self._lists for item in items]
        return exact_search(candidates, query, k)


if __name__ == "__main__":
    items = [
        {"id": "cats", "vector": [0.9, 0.1, 0]},
        {"id": "dogs", "vector": [0.7, 0.3, 0]},
        {"id": "taxes", "vector": [0, 0.1, 0.9]},
    ]
    print(exact_search(items, [1, 0, 0], k=2))
