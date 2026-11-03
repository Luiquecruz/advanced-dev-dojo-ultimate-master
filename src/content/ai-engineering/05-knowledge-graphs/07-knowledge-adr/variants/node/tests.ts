const { adr, knowledgePlan } = mod;

const DOCUMENTS_PER_MONTH = 8700;
const EXTRACTION_USD_PER_DOCUMENT = 0.004;
const REBUILD_USD = 45;
const INDEXING_BUDGET_USD = 250;
const COMPETENCY_PATHS = [
  { question: 'Which products are affected if a supplier fails?', from: 'supplier', to: 'product', hops: 2 },
  { question: 'Which regulations apply to products containing a part from a supplier?', from: 'supplier', to: 'regulation', hops: 3 },
];

type Relation = { name: string; domain: string; range: string };

function shortestHops(from: string, to: string): number | undefined {
  const relations: Relation[] = knowledgePlan.ontology.relations;
  const distances = new Map<string, number>([[from, 0]]);
  let frontier = [from];
  while (frontier.length > 0) {
    const next: string[] = [];
    for (const current of frontier) {
      for (const relation of relations) {
        const target = relation.range.toLowerCase();
        if (relation.domain.toLowerCase() === current && !distances.has(target)) {
          distances.set(target, distances.get(current)! + 1);
          next.push(target);
        }
      }
    }
    frontier = next;
  }
  return distances.get(to);
}

function projectedCost(): number {
  return DOCUMENTS_PER_MONTH * EXTRACTION_USD_PER_DOCUMENT + knowledgePlan.summaryRebuildsPerMonth * REBUILD_USD;
}

test('the ADR is an accepted context-layer decision whose context names multi-hop and global questions, traceability and the budget, with a "We will" decision', () => {
  expect(Number.isInteger(adr.id) && adr.id > 0).toBe(true);
  expect(adr.status).toBe('accepted');
  expect(adr.layer).toBe('context');
  expect(adr.title.trim().length).toBeGreaterThanOrEqual(10);
  expect(adr.context.trim().length).toBeGreaterThanOrEqual(80);
  expect(adr.context).toMatch(/multi-hop|hops?|affected|traversal/i);
  expect(adr.context).toMatch(/global|portfolio|across/i);
  expect(adr.context).toMatch(/trace|provenance|audit|compliance|source/i);
  expect(adr.context).toMatch(/cost|budget|\$/i);
  expect(adr.decision.trim().length).toBeGreaterThanOrEqual(40);
  expect(adr.decision.trim()).toMatch(/^we will\b/i);
});

test('rejects plain vector RAG among at least two distinct alternatives, and lists positive and negative consequences', () => {
  expect(Array.isArray(adr.alternatives)).toBe(true);
  expect(adr.alternatives.length).toBeGreaterThanOrEqual(2);
  adr.alternatives.forEach((alternative: { option: string; reason: string }) => {
    expect(alternative.option.trim().length).toBeGreaterThanOrEqual(3);
    expect(alternative.reason.trim().length).toBeGreaterThanOrEqual(20);
  });
  const options = adr.alternatives.map((alternative: { option: string }) => alternative.option.trim().toLowerCase());
  expect(new Set(options).size).toBe(options.length);
  expect(options.some((option: string) => /vector|plain rag|embedding/.test(option))).toBe(true);
  ['positive', 'negative'].forEach((side) => {
    expect(Array.isArray(adr.consequences[side])).toBe(true);
    expect(adr.consequences[side].length).toBeGreaterThanOrEqual(1);
    adr.consequences[side].forEach((item: string) => expect(item.trim().length).toBeGreaterThanOrEqual(15));
  });
});

test('the plan uses a graph representation and an ontology whose relations only reference declared classes', () => {
  expect(['property-graph', 'rdf']).toContain(knowledgePlan.representation);
  const classes: string[] = knowledgePlan.ontology.classes.map((name: string) => name.toLowerCase());
  ['supplier', 'part', 'product', 'regulation'].forEach((name) => expect(classes).toContain(name));
  expect(new Set(classes).size).toBe(classes.length);
  const relations: Relation[] = knowledgePlan.ontology.relations;
  expect(relations.length).toBeGreaterThanOrEqual(3);
  relations.forEach((relation) => {
    expect(relation.name.trim().length).toBeGreaterThanOrEqual(2);
    expect(classes).toContain(relation.domain.toLowerCase());
    expect(classes).toContain(relation.range.toLowerCase());
  });
});

test('every competency question has a directed path in the ontology, and graph traversal reaches it within maxHops', () => {
  expect(knowledgePlan.retrieval.local).toBe('graph-traversal');
  for (const path of COMPETENCY_PATHS) {
    const hops = shortestHops(path.from, path.to);
    expect(hops).toBeDefined();
    expect(hops).toBeLessThanOrEqual(knowledgePlan.retrieval.maxHops);
  }
  expect(knowledgePlan.retrieval.maxHops).toBeLessThanOrEqual(4);
});

test('extraction validates against the ontology, resolves entity names, keeps provenance and logs rejected facts, as the briefing requires', () => {
  expect(knowledgePlan.extraction).toEqual({ validateAgainstOntology: true, entityResolution: true, provenance: true, logRejected: true });
});

test('global questions use community summaries rebuilt often enough for 7-day freshness, and the projected cost fits the indexing budget', () => {
  expect(knowledgePlan.retrieval.global).toBe('community-summaries');
  expect(knowledgePlan.summaryRebuildsPerMonth).toBeGreaterThanOrEqual(4);
  const expected = projectedCost();
  expect(typeof knowledgePlan.projectedMonthlyUsd).toBe('number');
  expect(Math.abs(knowledgePlan.projectedMonthlyUsd - expected)).toBeLessThanOrEqual(expected * 0.1);
  expect(expected).toBeLessThanOrEqual(INDEXING_BUDGET_USD);
  expect(knowledgePlan.projectedMonthlyUsd).toBeLessThanOrEqual(INDEXING_BUDGET_USD);
});

test('revenue at risk is a governed semantic layer metric owned by finance, with its 12-month definition', () => {
  const metrics: Array<{ name: string; owner: string; definition: string }> = knowledgePlan.semanticLayer.metrics;
  const revenueAtRisk = metrics.find((metric) => /revenue at risk/i.test(metric.name));
  expect(revenueAtRisk).toBeDefined();
  expect(revenueAtRisk!.owner).toMatch(/finance/i);
  expect(revenueAtRisk!.definition.trim().length).toBeGreaterThanOrEqual(20);
  expect(revenueAtRisk!.definition).toMatch(/12|twelve/i);
  expect(revenueAtRisk!.definition).toMatch(/high risk|high-risk/i);
});
