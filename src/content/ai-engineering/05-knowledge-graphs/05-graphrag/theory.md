# GraphRAG

Plain RAG answers **local** questions well: "what does Acme supply?" retrieves the chunks that mention Acme. It fails on **global** questions about the whole corpus: "what are the main supply risks across our catalog?" No chunk contains that answer, top-k retrieval returns ten arbitrary passages, and the model summarizes those ten. **GraphRAG**, introduced by Microsoft Research ("From Local to Global: A Graph RAG Approach to Query-Focused Summarization"), answers both kinds by building an entity graph, grouping it into communities and summarizing each community ahead of time.

## The indexing pipeline

1. **Chunk** the corpus into text units.
2. **Extract** entities, relations (and optionally claims) from each chunk with a model (lesson 04), and merge duplicates by name, combining their descriptions.
3. **Detect communities**: groups of entities more densely connected to each other than to the rest of the graph.
4. **Summarize each community** with a model into a report: a title, a summary and key findings about its entities and relations. Communities are hierarchical: reports for large communities are built from the reports of their sub-communities.
5. **Embed** entity descriptions, chunks and reports for search.

Indexing is the expensive part: a model call per chunk for extraction, plus one per community. It runs once (and incrementally on change); queries then reuse it.

## Community detection

A community is a cluster in the graph: Acme, its parts and the products using them form one; Globex and the plastics another. Algorithms:

- **Connected components:** groups with any path between them. Too coarse: one bridge edge merges two unrelated topics.
- **Label propagation:** every node starts with its own label and repeatedly adopts the label most common among its neighbors, until nothing changes. Simple and fast; a fixed visiting order and tie-break make it deterministic. Weighting each edge by `1 + shared neighbors` makes edges inside dense groups count more than bridges.
- **Louvain and Leiden:** optimize *modularity* (more edges inside communities than chance would predict) and produce a hierarchy of levels. GraphRAG uses **hierarchical Leiden**, which also guarantees that communities are internally connected.

The algorithm matters less than the property you need: dense, connected, stable groups whose summaries cover the corpus.

## Community reports

Each report is generated from the community's **own** entities and relations, never the whole graph, so the prompt stays small and the summary stays focused. Treat report generation like any extraction: request JSON, validate it, retry once, and fall back to a deterministic report (the main entities by degree) instead of failing the whole index.

## Query modes

**Local search** answers questions about specific entities:

1. Find the entities the question is about (by name match or embedding similarity of entity descriptions).
2. **Fan out** to their neighbors within a hop limit and collect entities, relations, the chunks that mention them and their community reports.
3. Rank and trim to the context budget, then answer with one call.

**Global search** answers questions about the whole corpus with **map-reduce** over community reports:

1. **Map:** split the reports into batches. For each batch, ask the model for the points that help answer the question, each **rated 0-100** for importance. Batches can run in parallel.
2. **Filter:** drop points rated 0 and unusable batches, sort by score and keep the top points that fit the budget.
3. **Reduce:** one final call writes the answer from those points. If no point survives, say there is not enough evidence instead of inventing an answer.

The community **level** is a trade-off: lower levels have more, more detailed reports (thorough answers, more calls); higher levels have fewer, broader ones (cheaper, coarser).

**Routing** decides which mode a question needs. A cheap rule works surprisingly often: if the question names an entity, go local; otherwise go global. Production systems add a classifier or let the model choose, and hybrids exist (GraphRAG's DRIFT search starts global and drills down locally).

```ts
const route = routeQuestion(question, graph);
const result = route.mode === 'local'
  ? await answerLocal(model, question, graph, route.entityIds)
  : await answerGlobal(model, question, reports);
```

## Costs and pitfalls

- **Indexing cost:** extraction and summaries for a large corpus can cost far more than embedding it. Measure on a sample before committing.
- **Staleness:** reports describe the graph at indexing time; changed documents need re-extraction and re-summarization of affected communities.
- **Global search fan-out:** one question can trigger dozens of map calls. Cap the batches or use a higher community level.
- **Extraction quality bounds everything:** missed entities never appear in any community.
- **Using it for local questions only:** if users only ask lookups, plain RAG or graph expansion is cheaper.

Microsoft's GraphRAG is an open-source Python library with global, local, DRIFT and basic search modes, and a fast indexing option that replaces model extraction with cheaper NLP extraction. LazyGraphRAG defers summarization to query time to cut indexing cost. Graph databases and frameworks ship their own variants; the term covers many designs, so ask which parts (graph, communities, summaries, map-reduce) a product actually implements.

## When to choose it

Choose GraphRAG when users ask global, sensemaking questions over a large private corpus (themes, risks, trends across thousands of documents) and the answers justify an expensive indexing step. For entity lookups and multi-hop questions, a knowledge graph with traversal or graph expansion over plain RAG is enough. For a corpus that changes hourly, the cost of keeping summaries fresh may rule it out; evaluate a lazy variant or long-context summarization of a sample first.
