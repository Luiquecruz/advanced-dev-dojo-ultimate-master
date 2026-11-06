# Map: Knowledge Graphs and Ontologies

Module 04 retrieved passages that look like the question. Some questions are about **connections** instead: "which products are affected if this supplier fails?", "which teams depend on this database?", "what are the main risks across everything we know?". This module answers: **how do we represent knowledge so a model can answer questions that span many facts and many sources, consistently and with evidence?**

## The question and the layer

This module belongs to **layer 2, context**: what the model sees on each call. Retrieval (module 04) fills the context with passages; this module fills it with **structured facts**: entities, typed relations, paths between them and summaries of whole regions of a graph. It also introduces a cross-team concern that reaches into governance (module 13): a shared vocabulary that people, pipelines and agents all write to.

| You decide | Options | The lesson |
| --- | --- | --- |
| How facts are stored and traversed | property graph, adjacency index, breadth-first traversal | 02 |
| What every fact must satisfy | ontology: classes, inheritance, domain, range, cardinality | 03 |
| How facts get in | model extraction, validation, entity resolution, provenance | 04 |
| How whole-corpus questions are answered | communities, summaries, local vs global search | 05 |
| Which standard family fits | RDF, OWL, SHACL, SPARQL vs Cypher and GQL; the semantic layer | 06 |
| What the knowledge layer of a product looks like | the knowledge ADR | 07 |

## Prerequisites

- **Data structures:** maps, sets, queues and breadth-first search. The Node.js track and any algorithms course cover them; lesson 02 rebuilds what you need.
- **Module 01:** calling a model through a thin layer and handling refusals.
- **Module 02:** structured outputs: extraction and community reports are JSON you must validate and re-ask for.
- **Module 04:** chunking and vector search, so you can tell when plain RAG is enough and when a graph adds value.

## The path

1. **Graphs as data structures.** You build a property graph with an adjacency index, depth-limited breadth-first traversal, shortest paths as evidence, and a multi-hop dependency question.
2. **Ontologies.** You write a closed-world validator: inheritance, domain, range and cardinality, every violation reported with a clear message.
3. **Extracting a knowledge graph.** You turn documents into a graph with the fake model: schema-guided JSON extraction, re-asking on broken output, per-item validation with a rejected log, entity resolution and provenance.
4. **GraphRAG.** You detect communities deterministically, summarize them with a fallback, route questions to local or global search, and answer global questions with map-reduce over rated points.
5. **RDF and the semantic layer** (quiz). Triples and global identifiers, OWL inference vs SHACL validation, SPARQL vs Cypher and ISO GQL, and governed metrics for agents.
6. **The knowledge ADR.** You decide the knowledge layer of a supply-chain assistant: ontology from competency questions, safeguards, retrieval modes, rebuild schedule within budget and a governed metric.

## The thread through the module

Each lesson removes one way knowledge goes wrong. Facts scattered in passages cannot be joined (02). Facts without rules drift between writers (03). Facts from a model are malformed, invented or duplicated unless checked (04). Questions about everything cannot be answered from ten chunks (05). Metrics defined in many places disagree (06). The ADR collects those answers for one product.

## Is a graph worth it?

Ontologies and knowledge graphs are worth their cost for **regulated domains** (facts must be traceable), **multi-team data** (several writers need one vocabulary) and **agent interoperability** (agents exchanging facts must mean the same thing). For a single small app with one writer and lookup questions, they are over-engineering: plain RAG and typed code win. The module teaches both sides of that call.

Knowledge graphs are an `established` technique, and GraphRAG is widely offered by graph databases and RAG frameworks; temporal knowledge graphs for agent memory are `emerging` and appear in module 06. Standards for graph query languages and RDF keep evolving, so check the standards bodies for the current versions.

## When to choose it

Take this module after module 04, when your questions start to need joins across documents, when several teams or agents write shared facts, or when someone asks where an answer came from. If you only answer lookups from one team's documents, read this map and the ADR briefing, record why a graph is not needed, and move on.
