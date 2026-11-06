# Vector Database Selection Guide

Once you know how ANN indexes work, the next question is where the vectors should live. The choices range from an extension inside the database you already run to a dedicated engine or a fully managed service, and the deciding factors are rarely raw speed: they are filters, freshness, consistency with the rest of your data and the cost of operating one more system. This lesson compares the main shapes and gives a decision path you can defend in a design review.

You need: Vector Databases & ANN Indexes, Database Replication & Sharding, CAP & PACELC Theorems, and Saga Pattern & Transactional Outbox.

## Four shapes of vector storage

- **An extension in your relational database: pgvector.** PostgreSQL gains a `vector` column type, distance operators and two ANN index types, HNSW and IVFFlat; without an index it runs exact search. Embeddings sit in the same rows as the data they describe, so they commit in the same transaction, join with other tables and filter with ordinary SQL `WHERE` clauses and B-tree indexes.
- **A dedicated vector engine: Qdrant, Weaviate.** Built around vector search, with filtering and ranking features designed in. Qdrant stores a *payload* with each point and builds payload indexes that both speed up filters and estimate how many points a filter matches, so its query planner can choose a search strategy; its filterable HNSW adds filter-aware links to the graph. Weaviate's hybrid search runs a keyword search (BM25, which scores documents by the query words they contain, rare words counting more) and a vector search in parallel, then merges the two ranked lists with a fusion algorithm such as Reciprocal Rank Fusion, which sums, for each result, `1 / (60 + rank)` over the lists, 60 being the usual constant.
- **A managed service: Pinecone.** You create serverless indexes and the provider runs them. Each index is divided into **namespaces**, and every read and write targets one namespace, a natural boundary for tenants. Pinecone's documentation describes separate write and read paths that scale independently, a request log that makes a write durable before indexing, data stored in object storage, and metadata filters applied before the best matches are chosen.
- **Vector search inside a distributed SQL database: TiDB.** TiDB adds a vector type and an HNSW vector index to a horizontally scaled, MySQL-compatible database; the vector index is served from TiFlash, its columnar replicas. It suits teams that already need distributed SQL and want vectors next to that data.

## Decision criteria

**Data size and dimensionality.** Estimate vectors × dimensions × bytes, plus the HNSW graph. A few million vectors usually fit in one PostgreSQL server's memory; hundreds of millions push you toward sharding, quantization or a service built for it.

**Filter selectivity: pre- vs post-filtering.** Real queries carry filters: this tenant, this language, in stock. *Post-filtering* runs the ANN search first and discards non-matching results; with a selective filter, few or none survive. pgvector's documentation gives the example: with HNSW's default candidate list of 40, a filter matching 10% of rows leaves about 4 results on average, which is why it offers iterative index scans that keep scanning until enough rows match. *Pre-filtering* restricts the candidates first: for a very selective filter, an ordinary index on the filter column plus exact search over the few matching rows is fast and exact. Filters in between are where filter-aware indexes (Qdrant's payload-aware HNSW, Pinecone's filtered search) earn their place. Partial indexes or partitions per tenant in PostgreSQL are another answer.

**Hybrid keyword and vector search.** Product codes, names and error messages need exact term matches that embeddings blur. If you need both, check for built-in hybrid search and fusion, or plan to run full-text and vector queries and merge them yourself.

**Update rate.** HNSW inserts are relatively expensive, because each new vector is linked into the graph. IVF centroids are computed at build time, so as the data drifts away from them recall drops and the index needs periodic rebuilds. A log-structured write path, such as Pinecone's request log feeding a MemTable, absorbs high write rates better.

**Operational cost of another system.** A separate store needs a sync pipeline (an outbox or change data capture feeding embeddings), backups, monitoring, access control and an on-call owner. Each one is work your team keeps doing.

**Consistency with transactional data.** In the same database, deleting a document deletes its embedding in the same transaction. With a separate store the copy is eventually consistent: a deleted or permission-revoked document can still be retrieved until the delete propagates, which in RAG means it can still reach a prompt.

## A decision path

1. Already on PostgreSQL, a few million vectors, filters you can express in SQL? Start with pgvector and HNSW.
2. Selective filters at large scale or hybrid ranking at the core of the product? Evaluate a dedicated engine.
3. No appetite to operate it, spiky traffic, many tenants? Evaluate a managed service with namespaces.
4. Already running distributed SQL? Check its built-in vector index before adding a system.

## Common mistakes

- **A dedicated vector cluster when pgvector suffices.** For a few million vectors in a product already on PostgreSQL, a second system adds a sync pipeline, eventual consistency and another on-call rotation for no measurable gain.
- **Post-filtering a selective filter.** The ANN search returns its top candidates and the filter throws most of them away, so users see too few results.
- **Forgetting that deletes must propagate.** A separate store keeps serving removed or restricted documents until the sync catches up.

## In practice

Write down the vector count, dimensions, filter selectivity, write rate and consistency needs before comparing products. Prototype with the real filters and measure recall and p99 latency on your own queries. Choose the simplest option that meets them, and revisit when the numbers, not the hype, change.

## Check yourself

1. Why can a query with a filter that matches 5% of rows return almost nothing from a post-filtered HNSW index, and what are two ways to fix it?
2. What extra components does a separate vector store add compared with pgvector inside the primary database?
3. Which requirement would justify a managed service with namespaces over a single pgvector table?
