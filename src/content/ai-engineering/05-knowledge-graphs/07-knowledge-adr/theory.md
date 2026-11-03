# Checkpoint: the Knowledge ADR

This module moved from data structures to decisions: property graphs and traversal, ontologies and validation, model extraction with entity resolution, GraphRAG for global questions, and the RDF and semantic layer landscape. The checkpoint turns it into the fifth entry of your portfolio: an **Architecture Decision Record** for the knowledge part of the context layer, plus a **knowledge plan** a teammate could build.

A knowledge ADR is rarely "we use a graph database". It answers: which questions need which representation, what vocabulary everyone writes to, how extracted facts are kept honest, how each kind of question is answered, how fresh the derived data stays and what it costs.

## The decision checklist

1. **Questions first.** List the competency questions and classify them:
   - *lookups* ("what is the refund window?"): plain RAG is enough;
   - *multi-hop* ("which products are affected if this supplier fails?"): a graph with traversal, or graph expansion after retrieval;
   - *global* ("what are the main risks across the portfolio?"): pre-computed summaries such as GraphRAG communities, or map-reduce over documents;
   - *metrics* ("what is the revenue at risk?"): a governed definition in the semantic layer, never a number the model computes.
2. **Representation.** If no question needs connections, stop: a graph is over-engineering. Otherwise choose a property graph for application-internal traversal, or RDF when data is exchanged across organizations or built on public vocabularies.
3. **Vocabulary.** Derive the ontology from the questions: each question is a path of relations between classes, and the longest path sets the traversal depth. Several writers (teams, pipelines, agents) are the strongest reason for an explicit ontology.
4. **Extraction safeguards.** Validation against the ontology, entity resolution, provenance and a rejected log. Regulated domains need all four; a prototype might skip resolution and pay for it later.
5. **Freshness and cost.** Extraction runs per new or changed document; summaries need periodic rebuilds. The freshness requirement sets the minimum rebuild rate, the budget sets the maximum.

| Option | Buys | Costs |
| --- | --- | --- |
| Plain vector RAG | simplest, cheapest indexing | no multi-hop joins, weak on global questions |
| Graph expansion over RAG | connected facts with little modeling | needs an entity graph and extraction |
| Ontology-guided knowledge graph | consistent facts across writers, auditability | ontology ownership, extraction cost |
| GraphRAG communities | global questions over large corpora | expensive indexing, summaries go stale |
| RDF with OWL and SHACL | cross-organization integration, standards | heavier stack, fewer application developers know it |
| Semantic layer | one definition per metric for every consumer | definitions need owners and maintenance |

## Writing the ADR well

- **Context** lists the forces with numbers: question types, sources and volume, who writes, compliance rules, freshness, budget.
- **Decision** is one "We will" sentence covering representation, safeguards, local and global retrieval and governed metrics.
- **Alternatives** are the proposals you will hear again ("just use vector search", "let's do full OWL", "rebuild daily"), each with the fact that rules it out.
- **Consequences** include the bill you sign up for: the ontology becomes a shared contract with an owner, summaries are days old, resolution mistakes need a review queue.

## Example: an internal service catalog

```ts
export const knowledgePlan = {
  representation: 'property-graph',
  ontology: {
    classes: ['Team', 'Service', 'Database'],
    relations: [
      { name: 'owns', domain: 'Team', range: 'Service' },
      { name: 'dependsOn', domain: 'Service', range: 'Database' },
    ],
  },
  extraction: { validateAgainstOntology: true, entityResolution: false, provenance: true, logRejected: true },
  retrieval: { local: 'graph-traversal', global: 'none', maxHops: 2 },
};
```

Ownership and dependencies come from deployment manifests with stable ids, so entity resolution is unnecessary; nobody asks portfolio-wide questions, so there are no community summaries. Each "no" is a decision too, recorded with its reason.

## Pitfalls

- Choosing GraphRAG or a graph database before listing the questions.
- An ontology modeled from a whiteboard instead of from competency questions.
- Extraction without provenance in a regulated domain.
- A rebuild schedule that ignores either freshness or budget.
- Metrics computed by the assistant instead of read from their owner's definition.

> **Status as of October 2026:** graph-based retrieval is offered by most graph databases and RAG frameworks, and semantic layers increasingly expose metrics to agents through APIs and MCP servers. Indexing costs fall with cheaper small models and lazy summarization variants, so re-check the cost side of this ADR when prices change.

## When to choose it

Write a knowledge ADR when a feature first needs answers that connect facts across sources, when several teams or agents start writing shared facts, or when compliance asks where an answer came from. Revisit it when question types change (global questions appear), when volume or freshness requirements move the cost, or when a partner asks to exchange data, which can tip the representation toward RDF.
