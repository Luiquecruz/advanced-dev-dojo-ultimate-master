# Vector Databases & ANN Indexes

AI applications search by meaning: "find the support articles closest to this question", "find products like this photo". Both questions become geometry once text and images are turned into vectors, and the database problem becomes finding the nearest vectors among millions without comparing against every one. This lesson covers the similarity metrics, why exact search does not scale, and the approximate indexes (HNSW, IVF, DiskANN) that vector databases are built on.

You need: Back-of-the-Envelope Estimation, Storage Engines: B-Trees vs LSM Trees, and Database Replication & Sharding.

## Embeddings and similarity

An **embedding model** turns a piece of content into a vector of a few hundred to a few thousand numbers, placed so that similar meanings end up close together. Three metrics compare two vectors `a` and `b` of dimension `d`:

| Metric | Formula | Notes |
| --- | --- | --- |
| Dot product | `Σ aᵢ·bᵢ` | grows with the vectors' length, not only their direction |
| Cosine similarity | `a·b / (‖a‖·‖b‖)` | direction only, from `-1` to `1` |
| Euclidean (L2) distance | `√Σ (aᵢ − bᵢ)²` | smaller is closer |

When every vector is normalized to length 1, the three agree on the ranking, and the dot product is the cheapest to compute. When they are not normalized, a raw dot product favors long vectors: a vector with a large length (norm) can outrank a shorter one that points in exactly the query's direction. Use the metric the embedding model was trained for, and normalize when that metric is cosine.

## Exact k-NN and its cost

**Exact k-nearest-neighbor** search compares the query with every stored vector and keeps the best `k`: `O(N·d)` per query. With 10,000,000 vectors of 1,536 dimensions, one query is about 15,000,000,000 multiply-adds, and the vectors alone take about 61 GB as 4-byte floats. Exact search is perfect for small collections, for evaluation and for a final re-ranking step; on a large collection under real traffic it burns CPU and memory bandwidth on every request.

## Approximate nearest neighbor: recall vs latency

An **approximate nearest neighbor (ANN)** index looks at a small part of the collection and returns the nearest vectors *it finds*. Its quality is **recall**: the fraction of the true top `k` that it returns. Every ANN index exposes knobs that trade recall for latency, and a new index changes query results, unlike a B-tree. Measure recall against exact search on a sample of real queries before tuning anything else.

## HNSW

**HNSW** (Hierarchical Navigable Small World) builds a layered graph. Every vector is a node in the bottom layer, linked to its close neighbors; a random, shrinking subset of nodes also appears in each higher layer, so the top layers are sparse "highways". A search starts at an entry point in the top layer, moves greedily to the neighbor closest to the query until no neighbor is closer, then drops one layer and repeats. In the bottom layer it keeps a candidate list and returns the best `k`.

- `M`: the maximum number of links per node in each layer. More links improve recall and cost memory.
- `efConstruction`: the candidate list size while building. Higher gives a better graph and a slower build.
- `efSearch`: the candidate list size while querying. Higher gives better recall and slower queries.

pgvector names them `m`, `ef_construction` and `hnsw.ef_search`. HNSW has an excellent speed-recall trade-off and needs no training step, but the graph should stay in memory next to the vectors for fast queries, and builds are slower than IVF.

## IVF and IVFFlat

An **inverted file (IVF)** index first runs k-means on a sample to find centroids. Each centroid owns a **list**: the vectors closer to it than to any other centroid, a Voronoi cell of the space. A query compares itself with the centroids only, then searches the `nprobe` nearest lists exhaustively. "Flat" means the lists keep full vectors. In pgvector the number of lists is `lists` and `nprobe` is `ivfflat.probes`; setting probes to the number of lists is exact search again. IVF builds faster and uses less memory than HNSW, but a vector near a cell border may sit in a list that was not probed, which is the recall it gives up. Centroids are computed from the data at build time, so the index should be built after the table holds representative data.

## DiskANN and quantization

When the vectors do not fit in RAM, **DiskANN** stores a graph index (its Vamana graph) and the full vectors on an SSD and navigates with compressed vectors kept in memory, so a single machine can serve collections far larger than its RAM. **Quantization** compresses vectors: scalar quantization stores each number in fewer bits, product quantization encodes groups of dimensions as small codebook ids, and binary quantization keeps one bit per dimension. Compressed vectors make the candidate search cheaper, and a re-ranking step with the original vectors recovers most of the lost accuracy.

## Retrieval in RAG

**Retrieval-augmented generation (RAG)** splits documents into chunks, embeds each chunk and stores it in a vector index. At question time the application embeds the question, retrieves the top `k` chunks by similarity and puts them in the model's prompt. The model only sees what retrieval returns, so recall translates directly into answer quality, and latency adds directly to the response time.

## Common mistakes

- **Brute-force exact k-NN in production.** It works in the prototype and grows linearly with every vector added; at millions of vectors each query scans gigabytes. Use an ANN index and keep exact search for evaluation and re-ranking.
- **Scoring with a raw dot product when the model expects cosine.** Unless the vectors are normalized, long vectors beat better-aligned short ones; normalize them or score with cosine.
- **Tuning for latency without measuring recall.** Lowering `efSearch` or `nprobe` always looks faster; compare with exact results on real queries.

## In practice

Estimate memory first: vectors × dimensions × bytes per number, plus the graph for HNSW. Start with HNSW when the index fits in memory, IVF when build time or memory is tight, and a disk-based graph or quantization when it does not fit. Keep a set of queries with exact answers and track recall@k next to p99 latency on every change.

## Check yourself

1. Why can a raw dot product rank a long vector that points somewhat away from the query above a short one that points in its exact direction?
2. In an IVF index, why can the true nearest neighbor be missing from the results, and which setting brings it back?
3. Which HNSW parameter changes recall at query time without rebuilding the index?
