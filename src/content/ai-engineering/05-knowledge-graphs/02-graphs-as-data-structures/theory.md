# Graphs as Data Structures

Vector search finds text that *looks like* the question. Some questions are about *connections* instead: "payments-db is down: which teams are affected?" The answer is in no single document. It sits in a chain of facts spread across many sources: a service depends on the database, another service depends on that one, a team owns each service. A **graph** stores those facts as data, so code can follow the chain hop by hop instead of hoping a retriever brings back every link.

## The property graph model

Most graph databases and most in-memory knowledge graphs use the **labeled property graph**:

- **Nodes** (vertices) have an id, a **label** that says what kind of thing they are (`Person`, `Team`, `Service`) and **properties** (`{ name: 'Ana', onCall: true }`).
- **Edges** (relationships) are **directed** and **typed**: `checkout-web -[DEPENDS_ON]-> payments-api`. They can carry properties too (`since`, `confidence`, `source`).

Direction carries meaning: `A DEPENDS_ON B` is not `B DEPENDS_ON A`. You can still walk an edge backwards ("who depends on B?"), so store both directions in the index even though the fact has one.

```ts
graph.addNode({ id: 'payments-api', label: 'Service', properties: { tier: 1 } });
graph.addEdge({ from: 'checkout-web', type: 'DEPENDS_ON', to: 'payments-api' });
```

Compare with tables: in SQL each hop is a join, and a question of unknown depth ("anything that depends on this, directly or not") needs a recursive query. A graph makes the hop the cheap, basic operation.

## The adjacency index

Scanning every edge to find a node's neighbors costs O(E) per hop; a multi-hop query over a large graph becomes hopeless. Instead keep an **adjacency index**: for each node id, the list of its **outgoing** edges and the list of its **incoming** edges. Finding neighbors is then a map lookup plus a walk over just that node's edges. Native graph databases call this *index-free adjacency*: each node points directly at its relationships.

Validate on write: an edge whose endpoint does not exist is a bug (or a bad extraction, lesson 04), and a duplicate node id silently merges two things. Reject both loudly.

## Traversal: breadth first, with a depth limit

**Breadth-first search (BFS)** visits nodes in rings: all neighbors at one hop, then all at two hops, and so on. That gives two guarantees you want:

- every node is first reached at its **smallest depth**;
- the first time you reach the target, you used the **fewest hops**.

Depth-first search finds *a* path, not the shortest one, and can wander deep into an irrelevant branch.

Real graphs have **cycles** (A depends on B, B calls A) and **supernodes** (a `Country` node connected to millions of people). Two rules keep traversal safe:

1. A **visited set**: never expand a node twice, or a cycle loops forever.
2. A **depth limit**: the frontier grows roughly as *degree^depth*. Three hops over nodes with 100 neighbors each is a million nodes. Most useful questions need two to four hops; filter by **edge type** and **direction** at every step to keep the frontier small.

```ts
let frontier = [startId];
for (let depth = 1; depth <= maxDepth && frontier.length > 0; depth++) {
  const next = [];
  for (const id of frontier) {
    for (const { node } of graph.neighbors(id, { direction: 'in', types: ['DEPENDS_ON'] })) {
      if (!visited.has(node.id)) { visited.add(node.id); next.push(node.id); }
    }
  }
  frontier = next;
}
```

## Path reconstruction

To return the path, not just "reachable", remember **how** each node was first reached: a map from node id to `{ previous, edge }`. When BFS reaches the target, walk the map backwards to the start and reverse. The path's edges are the evidence: you can show the user *why* two things are connected, and cite the source of each edge.

## Multi-hop questions as patterns

Many questions are a fixed **pattern** of hops: "teams that own services depending on X" is *in DEPENDS_ON*, then *in OWNS*. Following a pattern means: start with a set of nodes, follow one edge type and direction per step, deduplicate, repeat. Query languages express exactly this: Cypher writes `(t:Team)-[:OWNS]->(:Service)-[:DEPENDS_ON*1..3]->(d {name: 'payments-db'})`. The variable-length part (`*1..3`) is a depth-limited traversal.

## Graphs in AI systems

Graphs complement vector search rather than replacing it:

- **Graph expansion after retrieval:** vector search finds the entry entities, then a one- or two-hop expansion brings in connected facts the text never mentioned together.
- **Multi-hop questions** that need joins across documents.
- **Explainable answers:** a path is a citation chain.
- **Agent tools:** a `neighbors` or `shortestPath` tool lets an agent explore with bounded cost instead of reading everything.

## Pitfalls

- Edges without direction or type ("related to"), which make every traversal noisy.
- Unbounded traversals that hit a supernode.
- No visited set, so cycles never end.
- Scanning all edges per hop instead of indexing adjacency.
- Answering from the graph without keeping each fact's source.

GQL is the ISO standard query language for property graphs, and SQL has a property graph query extension (SQL/PGQ). Graph engines include Neo4j, Amazon Neptune, Memgraph and the Apache AGE extension for PostgreSQL. In-memory libraries (graphology in JavaScript, NetworkX in Python) suit graphs that fit in memory.

## When to choose it

Model data as a graph when the questions are about relationships of variable depth: dependencies, ownership, supply chains, fraud rings, access paths. Start in memory or in your relational database (recursive queries, SQL/PGQ) while the graph is small; move to a graph database when traversals dominate the workload or the graph outgrows memory. If every question is answered by one document or one row, a graph adds modeling cost for nothing: plain search or SQL is the better tool.
