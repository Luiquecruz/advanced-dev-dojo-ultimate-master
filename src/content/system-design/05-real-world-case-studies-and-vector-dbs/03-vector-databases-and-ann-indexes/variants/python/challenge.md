Implement exact nearest-neighbor search and a small IVF index, the two ends of the recall vs latency trade-off. Vectors are plain lists of numbers of the same length, and an item is a dict `{"id": "cats", "vector": [0.9, 0.1, 0]}`.

```python
def cosine_similarity(a: list[float], b: list[float]) -> float: ...
def exact_search(items: list[dict], query: list[float], k: int) -> list[str]: ...

class IvfIndex:
    def __init__(self, centroids: list[list[float]]): ...
    def add(self, item_id: str, vector: list[float]) -> None: ...
    def list_sizes(self) -> list[int]: ...
    def search(self, query: list[float], k: int, nprobe: int) -> list[str]: ...
```

The tests pass `k` and `nprobe` by keyword.

- `cosine_similarity(a, b)` returns `a·b / (‖a‖ · ‖b‖)`: `1` for the same direction, `0` for orthogonal vectors, `-1` for opposite ones, and the same value when either vector is scaled by a positive number. When either vector has length zero it returns `0`.
- `exact_search(items, query, k)` compares the query with **every** item by cosine similarity and returns the ids of the `k` most similar, most similar first. Equal similarities are ordered by id ascending (`"a"` before `"b"`). When `k` is larger than the number of items it returns every id.
- `IvfIndex(centroids)` starts with one empty list per centroid, in the given order (a real index learns the centroids with k-means; here they are given).
  - `add(item_id, vector)` stores the vector in the list of the centroid with the highest cosine similarity to it (the lowest centroid index wins a tie).
  - `list_sizes()` returns how many vectors each list holds, in centroid order.
  - `search(query, k, nprobe)` ranks the centroids by cosine similarity to the query (lowest index first on a tie), searches **only** the vectors in the first `nprobe` lists, and returns ids with the same ordering rules as `exact_search`. With `nprobe` equal to the number of centroids the result is the exact one.

Ranking by a raw dot product is not enough: a long vector must not outrank one that points in the query's exact direction.
