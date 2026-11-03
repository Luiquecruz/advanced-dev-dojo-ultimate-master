# Extracting a Knowledge Graph

Hand-building a knowledge graph does not scale past a few hundred facts. Models are good at reading text and naming who did what to whom, so the common way to build a graph today is **LLM extraction**: the model reads each document and returns entities and relations as JSON. The model is the easy part. The engineering is everything around it: telling the model the vocabulary, surviving broken output, rejecting what does not fit the ontology, merging duplicates and remembering where each fact came from.

## The pipeline

```text
document -> extract (schema in prompt) -> parse / re-ask -> validate against ontology
         -> resolve entities -> merge with provenance -> graph
                     \-> rejected log            \-> failed documents
```

Every arrow can fail. A good pipeline never stops on one bad document: it records the failure and moves on.

## Schema-guided extraction

Without guidance a model invents its own vocabulary: `employer`, `works at`, `is employed by`, `CEO of`. Put the ontology in the prompt: the allowed entity types, the allowed relations with their source and target types, and the exact JSON shape.

```json
{
  "entities": [{ "name": "Acme Corp", "type": "Organization", "aliases": ["Acme"] }],
  "relations": [{ "source": "Ana Souza", "type": "worksFor", "target": "Acme Corp" }]
}
```

Ask for **aliases**: the other spellings in the same text ("Acme", "the company") help entity resolution later. Ask for the JSON response format when the provider offers one. Structured outputs reduce broken JSON, but they do not guarantee that the content fits your ontology.

## Parse, then re-ask

Model output arrives in many broken shapes: wrapped in prose and a code fence, truncated, with a trailing comma, with single quotes. Repair only what is safe: taking the text between the first `{` and the last `}` recovers the fenced version. For the rest, **re-ask** once: send the original messages, the bad reply as an assistant message and a short correction ("the reply was not valid JSON; reply with the JSON object only"). Cap the attempts. A **refusal** is not a format error: re-asking the same request will not change the answer, so record it as a failed document.

## Validate against the ontology

Parsed is not correct. Validate each item and **keep the valid ones** instead of discarding the whole document:

- entity types that are not classes (`City` when the ontology has no `City`);
- relations that are not in the ontology (`locatedIn`);
- relations whose endpoints were not extracted or were rejected;
- domain and range mismatches (a `Product` that `worksFor` an organization).

Log every rejected item with its document and a reason. The log is a dataset: if half the rejections are `locatedIn`, either the prompt is unclear or the ontology is missing a relation people actually need.

## Entity resolution

The same thing appears under many names: "Acme Corp.", "ACME Corporation", "Acme". Without **entity resolution** the graph has three companies, and every traversal misses two thirds of the facts. Techniques, from cheapest to most expensive:

1. **Normalization:** lowercase, strip accents and punctuation, collapse spaces, drop legal suffixes (`Inc`, `Corp`, `GmbH`) and a leading "the". Catches most spelling variants.
2. **Aliases:** keep every surface form seen for an entity and match new mentions against all of them.
3. **Type as a guard:** "Acme" the product and "Acme" the company are different nodes. Resolve within the same type only.
4. **Fuzzy and semantic similarity:** edit distance or embeddings for typos and abbreviations, usually with **blocking** (only compare candidates sharing a key) to avoid comparing everything with everything.
5. **Model or human review** for ambiguous pairs ("J. Smith" and "John Smith"), with the decision stored so it is made once.

False merges are worse than missed merges: merging two different people silently corrupts every answer about both. Start strict and loosen with evidence.

## Provenance

Store, for every entity and relation, the **sources** that asserted it (document id, and in production the chunk, the extraction run and the model version). Provenance lets you cite answers, count how many documents support a fact, delete everything that came from a retracted document and re-run extraction when the prompt improves. In regulated domains it is not optional.

## Cost and scale

Extraction calls the model once per chunk, which for a large corpus is the biggest cost of a graph project. Use a small model where evals allow, extract incrementally (only new or changed documents), and cache results by document hash and prompt version.

## Pitfalls

- No ontology in the prompt, so the vocabulary drifts.
- Treating parsed JSON as valid data.
- Dropping a whole document because one relation was wrong.
- Merging by exact name only, or merging across types.
- No provenance, so a wrong fact cannot be traced or removed.
- Retrying refusals.

> **Status as of October 2026:** most providers offer JSON or schema-constrained output modes. Libraries such as LangChain's graph transformers, LlamaIndex property graph extractors, the Neo4j LLM Knowledge Graph Builder and Microsoft GraphRAG's indexing pipeline package this flow; dedicated entity resolution tools (Splink, Senzing, dedupe) handle large-scale matching.

## When to choose it

Extract a graph with a model when the facts you need are buried in unstructured text (contracts, reports, tickets, papers) and questions need connections across documents. When the data already exists in structured systems (a CRM, an HR database), map it directly into the graph: it is cheaper and exact. Keep a human review step for high-stakes facts, and measure extraction precision and recall on a labeled sample before trusting the graph.
