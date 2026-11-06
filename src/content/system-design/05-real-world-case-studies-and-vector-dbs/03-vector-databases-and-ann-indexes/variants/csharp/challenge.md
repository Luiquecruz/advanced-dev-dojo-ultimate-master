Implement exact nearest-neighbor search and a small IVF index, the two ends of the recall vs latency trade-off. Vectors are `double[]` arrays of the same length, and an item is a record, `new VectorItem("cats", [0.9, 0.1, 0])`.

```csharp
public record VectorItem(string Id, double[] Vector);

public static class VectorSearch
{
    public static double CosineSimilarity(double[] a, double[] b);
    public static IReadOnlyList<string> ExactSearch(IEnumerable<VectorItem> items, double[] query, int k);
}

public class IvfIndex
{
    public IvfIndex(double[][] centroids);
    public void Add(string id, double[] vector);
    public IReadOnlyList<int> ListSizes();
    public IReadOnlyList<string> Search(double[] query, int k, int nprobe);
}
```

The tests pass `k` and `nprobe` by name.

- `CosineSimilarity(a, b)` returns `a·b / (‖a‖ · ‖b‖)`: `1` for the same direction, `0` for orthogonal vectors, `-1` for opposite ones, and the same value when either vector is scaled by a positive number. When either vector has length zero it returns `0`.
- `ExactSearch(items, query, k)` compares the query with **every** item by cosine similarity and returns the ids of the `k` most similar, most similar first. Equal similarities are ordered by id ascending with an ordinal comparison (`"a"` before `"b"`). When `k` is larger than the number of items it returns every id.
- `new IvfIndex(centroids)` starts with one empty list per centroid, in the given order (a real index learns the centroids with k-means; here they are given).
  - `Add(id, vector)` stores the vector in the list of the centroid with the highest cosine similarity to it (the lowest centroid index wins a tie).
  - `ListSizes()` returns how many vectors each list holds, in centroid order.
  - `Search(query, k, nprobe)` ranks the centroids by cosine similarity to the query (lowest index first on a tie), searches **only** the vectors in the first `nprobe` lists, and returns ids with the same ordering rules as `ExactSearch`. With `nprobe` equal to the number of centroids the result is the exact one.

Ranking by a raw dot product is not enough: a long vector must not outrank one that points in the query's exact direction.
