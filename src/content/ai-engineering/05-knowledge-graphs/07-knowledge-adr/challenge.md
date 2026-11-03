Write the knowledge ADR for **Supply Atlas**, the supply-chain assistant of a home appliance manufacturer.

## Briefing

Supply Atlas answers questions from procurement, engineering, compliance and finance.

- **Competency questions:**
  1. "Which products are affected if supplier X fails?" (supplier → part → product)
  2. "Which regulations apply to products that contain a part from supplier X?" (supplier → part → product → regulation)
  3. "What are the main supply risks across the portfolio?" (a global question about the whole corpus)
  4. "What is the revenue at risk if supplier X fails?"
- **Sources:** 40 000 supplier contracts, audit reports and certificates (unstructured text). About **8 700** documents are new or changed **each month**. Procurement, engineering and compliance all contribute facts.
- **Compliance:** every fact shown to a user must be **traceable to its source document**; auditors ask why an answer was given. Facts that do not fit the shared vocabulary must be logged, not silently dropped.
- **Names:** supplier names appear in many spellings ("ACME Corp.", "Acme Corporation GmbH", "Acme").
- **Freshness:** answers to global questions may use summaries at most **7 days** old, so community summaries need at least **4** full rebuilds a month.
- **Costs:** extracting one document costs **$0.004**; one full rebuild of community summaries costs **$45**. The indexing budget is **$250 a month**.
- **Metrics:** finance owns **revenue at risk**: the trailing 12-month revenue of products that depend on a supplier rated high risk. Finance's dashboard already shows it.
- **Platform:** the platform team operates a property graph database. No partner or regulator exchange of graph data is required.

## Task

In `adr.ts`, export two constants.

**`adr`**, the record:

- `id`: a positive integer; `title`: at least 10 characters; `status`: `'accepted'`; `layer`: `'context'`.
- `context`: at least 80 characters; mentions the multi-hop questions, the global questions, traceability (compliance, provenance, audit or sources) and the cost or budget.
- `decision`: at least 40 characters, starts with `We will`.
- `alternatives`: at least two `{ option, reason }` entries with distinct `option` texts (at least 3 characters) and a `reason` of at least 20 characters. One option must be plain vector RAG (mention vector, embedding or plain RAG in the option).
- `consequences`: `{ positive, negative }`, each a list with at least one item of at least 15 characters.

**`knowledgePlan`**, the plan:

- `representation`: `'property-graph'`, `'rdf'` or `'vector-only'`.
- `ontology`: `{ classes, relations }`: class names (including Supplier, Part, Product and Regulation, any case, no duplicates) and at least three relations `{ name, domain, range }` whose domain and range are declared classes.
- `extraction`: `{ validateAgainstOntology, entityResolution, provenance, logRejected }`, each `true` or `false`.
- `retrieval`: `{ local, global, maxHops }` with `local` `'graph-traversal'` or `'vector-search'`, and `global` `'community-summaries'` or `'none'`.
- `summaryRebuildsPerMonth`: full community summary rebuilds per month.
- `projectedMonthlyUsd`: `8 700 × $0.004 + summaryRebuildsPerMonth × $45`.
- `semanticLayer`: `{ metrics }`, each metric `{ name, owner, definition }`.

The plan must be coherent with the briefing:

1. The representation is a graph, and following relations from domain to range gives a directed path from Supplier to Product and from Supplier to Regulation, each within `maxHops` (at most 4) using `'graph-traversal'`.
2. Every extraction safeguard the briefing requires is on.
3. Global questions use community summaries, rebuilt at least 4 times a month.
4. The projection is within 10% of the formula and the formula stays within $250.
5. Revenue at risk is a metric owned by finance, whose definition keeps the 12-month window and the high-risk rule.

The tests check structure and coherence, not your wording.
