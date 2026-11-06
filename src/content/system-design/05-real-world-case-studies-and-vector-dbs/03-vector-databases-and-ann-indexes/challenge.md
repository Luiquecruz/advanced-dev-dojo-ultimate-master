Implement exact nearest-neighbor search and a small IVF index, the two ends of the recall vs latency trade-off. Vectors are plain arrays of numbers of the same length.

```ts
interface VectorItem { id: string; vector: number[] }

export function cosineSimilarity(a: number[], b: number[]): number
export function exactSearch(items: VectorItem[], query: number[], k: number): string[]
export function createIvfIndex(centroids: number[][]): {
  add(id: string, vector: number[]): void;
  listSizes(): number[];
  search(query: number[], k: number, nprobe: number): string[];
}
```

- `cosineSimilarity(a, b)` returns `a·b / (‖a‖ · ‖b‖)`: `1` for the same direction, `0` for orthogonal vectors, `-1` for opposite ones, and the same value when either vector is scaled by a positive number. When either vector has length zero it returns `0`.
- `exactSearch(items, query, k)` compares the query with **every** item by cosine similarity and returns the ids of the `k` most similar, most similar first. Equal similarities are ordered by id ascending (`a.id < b.id`). When `k` is larger than the number of items it returns every id.
- `createIvfIndex(centroids)` starts with one empty list per centroid, in the given order (a real index learns the centroids with k-means; here they are given).
  - `add(id, vector)` stores the vector in the list of the centroid with the highest cosine similarity to it (the lowest centroid index wins a tie).
  - `listSizes()` returns how many vectors each list holds, in centroid order.
  - `search(query, k, nprobe)` ranks the centroids by cosine similarity to the query (lowest index first on a tie), searches **only** the vectors in the first `nprobe` lists, and returns ids with the same ordering rules as `exactSearch`. With `nprobe` equal to the number of centroids the result is the exact one.

Ranking by a raw dot product is not enough: a long vector must not outrank one that points in the query's exact direction.
