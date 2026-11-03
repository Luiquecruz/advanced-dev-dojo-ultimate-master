export const adr = {
  id: 5,
  title: 'Answer supply-chain questions from a validated property graph with community summaries',
  status: 'accepted',
  layer: 'context',
  context:
    'Supply Atlas must answer multi-hop questions (which products and regulations are affected when a supplier fails), global questions about portfolio-wide supply risks, and the revenue at risk metric. Facts come from 40 000 contracts, audit reports and certificates, about 8 700 new or changed documents a month, written by procurement, engineering and compliance. Compliance requires every fact to be traceable to its source document, supplier names appear in many spellings, global summaries may be at most 7 days old, and the indexing budget is $250 a month.',
  decision:
    'We will extract a property graph guided by a shared ontology, validate every fact, resolve supplier names and keep provenance, answer entity questions by traversal up to 3 hops, answer global questions from community summaries rebuilt weekly, and read revenue at risk from the semantic layer.',
  alternatives: [
    {
      option: 'Plain vector RAG over the documents',
      reason: 'Questions such as supplier to part to product to regulation need three joins across documents, which top-k chunks do not perform, and portfolio-wide risk questions have no single relevant chunk.',
    },
    {
      option: 'RDF with OWL reasoning',
      reason: 'No partner exchange or public vocabulary is required, and the platform team already operates a property graph database; the extra stack buys nothing here.',
    },
    {
      option: 'Daily community summary rebuilds',
      reason: 'Thirty rebuilds at $45 each cost $1 350 a month, more than five times the $250 indexing budget.',
    },
    {
      option: 'Let the assistant compute revenue at risk with generated SQL',
      reason: 'Finance owns the definition; a generated query would drift from it and disagree with the finance dashboard.',
    },
  ],
  consequences: {
    positive: [
      'Every answer can cite the documents behind each fact, which satisfies the compliance audit requirement.',
      'Indexing costs about $215 a month, within the $250 budget.',
      'Procurement, engineering and compliance write to one vocabulary, so their facts connect.',
    ],
    negative: [
      'The ontology becomes a shared contract that needs an owner and versioning; new relations wait for review.',
      'Global answers can be up to a week old, so a supplier incident on Monday may not appear in risk summaries until the next rebuild.',
      'Entity resolution mistakes merge or split suppliers; the rejected log and a review queue must be watched.',
    ],
  },
};

export const knowledgePlan = {
  representation: 'property-graph',
  ontology: {
    classes: ['Supplier', 'Part', 'Product', 'Regulation', 'Certificate'],
    relations: [
      { name: 'supplies', domain: 'Supplier', range: 'Part' },
      { name: 'usedIn', domain: 'Part', range: 'Product' },
      { name: 'subjectTo', domain: 'Product', range: 'Regulation' },
      { name: 'certifiedBy', domain: 'Supplier', range: 'Certificate' },
    ],
  },
  extraction: { validateAgainstOntology: true, entityResolution: true, provenance: true, logRejected: true },
  retrieval: { local: 'graph-traversal', global: 'community-summaries', maxHops: 3 },
  summaryRebuildsPerMonth: 4,
  projectedMonthlyUsd: 215,
  semanticLayer: {
    metrics: [
      {
        name: 'Revenue at risk',
        owner: 'finance',
        definition: 'Trailing 12-month revenue of products that depend on a supplier rated high risk.',
      },
    ],
  },
};
