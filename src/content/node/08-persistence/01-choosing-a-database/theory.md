# Choosing a Database

A Node.js server is usually stateless: it keeps nothing important in memory, because it restarts, scales to several instances and crashes. The state lives in a database. Picking the database is one of the few backend decisions that is expensive to undo, so it is worth knowing the families and what each one is good at.

## The families

| Family | Examples | Data model | Strong at | Weak at |
| --- | --- | --- | --- | --- |
| Relational (SQL) | PostgreSQL, MySQL, SQLite, SQL Server | Tables with typed columns, foreign keys | Consistency, joins, ad hoc queries, transactions | Massive write fan-out without sharding work |
| Document | MongoDB, Firestore, DynamoDB (also key-value) | JSON-like documents grouped in collections | Nested aggregates read as a whole, flexible shape | Relations across documents, multi-document invariants |
| Key-value | Redis, Valkey, Memcached, Cloudflare KV | A key points to a value (string, hash, list, set) | Sub-millisecond reads, counters, sessions, caches, queues | Querying by anything except the key |
| Search | Elasticsearch, OpenSearch, Meilisearch, Typesense | Inverted index over documents | Full-text search, relevance, facets, typo tolerance | Being the source of truth |
| Vector | pgvector, Pinecone, Qdrant, Weaviate | Embeddings (arrays of floats) plus metadata | Similarity search for RAG and recommendations | Exact filtering and transactions on their own |

There are more (time series such as TimescaleDB, graph such as Neo4j, analytical columnar such as ClickHouse and DuckDB), but most products are built on a relational database plus one or two specialised stores.

## Relational by default

A relational database stores **normalized** data: each fact once, linked by keys. Constraints (`NOT NULL`, `UNIQUE`, `FOREIGN KEY`, `CHECK`) are enforced by the database for every client, and **ACID transactions** make multi-row changes all-or-nothing. SQL lets you ask questions you did not plan for when you designed the schema.

```ts
const { rows } = await db.query(
  'SELECT u.name, count(o.id) AS orders FROM users u LEFT JOIN orders o ON o.user_id = u.id GROUP BY u.name',
);
```

PostgreSQL in particular covers a lot of ground: `jsonb` columns for flexible fields, full-text search, `pgvector` for embeddings, row-level security. Starting with Postgres and adding a specialised store only when a measured need appears is the safest default.

## Document stores

A document database stores an **aggregate** (an order with its lines and shipping address) as one document. Reading it is one lookup, with no joins. The cost appears when the same data is shared: the customer's name copied into every order must be updated everywhere, and an invariant that spans two documents needs extra care. Document stores fit data that is naturally read and written as a whole, with access patterns known in advance.

DynamoDB and Firestore add another constraint: you design tables around the **queries** you will run, because you cannot join or filter freely later. That is a strength for predictable, huge workloads and a trap for a product that still changes every week.

## Key-value and caches

Redis keeps data in memory, so reads take microseconds. Typical jobs: caching expensive results (with a TTL), sessions, rate-limit counters, distributed locks, simple queues and pub/sub. Treat it as **derived** or **ephemeral** data unless you have configured persistence and understand its guarantees.

## Search and vector indexes

Search engines and vector databases are **secondary indexes**: you write to the primary database, then sync to the index (synchronously, with a queue, or with change data capture). If the index is lost, you rebuild it from the source of truth. Keeping them in sync is the hidden cost; before adding one, check whether Postgres full-text search or `pgvector` is enough.

## CAP and consistency in one paragraph

When a distributed database loses the network between nodes, it must choose between refusing some requests (consistency) and answering with possibly stale data (availability). Many managed databases let you choose per operation: strongly consistent reads cost more latency, eventually consistent reads are cheaper. Your frontend already lives with this: an optimistic update is eventual consistency.

## When to choose it

- **Relational (Postgres)**: the default for business data with relations, invariants and reporting. Choose it unless you can name the reason not to.
- **Document**: self-contained aggregates, flexible shapes, known access patterns; or a serverless platform where the managed document store is the natural fit.
- **Key-value**: caching, sessions, counters, rate limiting, queues. Next to a primary database, rarely instead of it.
- **Search / vector**: user-facing search or similarity, as an index fed from the source of truth.
- **SQLite**: single-instance apps, edge replicas (Turso, Cloudflare D1), tests and local tools.

Trade-offs to weigh: operational cost (managed services win), team familiarity, the queries you need tomorrow, and how many systems you must keep in sync.

## Working with AI

Ask the assistant to justify a database choice against your **access patterns**: list the main reads and writes, their frequency and the invariants ("an order total equals its lines"). When reviewing a proposal, check:

- Is there one clear **source of truth** for each piece of data?
- Are invariants enforced by the database (constraints, transactions) and not only in application code?
- Does every extra store (Redis, search, vector) come with a sync and rebuild story?
- Are the chosen queries supported efficiently (indexes, partition keys), or will they need full scans?
- Is the suggestion driven by hype ("use MongoDB because it is JSON") rather than by the data?
