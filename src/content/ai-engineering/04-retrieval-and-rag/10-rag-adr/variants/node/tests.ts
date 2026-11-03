const { adr, retrievalPlan } = mod;

const MEASURED = [
  { chunking: 'fixed', retrieval: 'vector', reranker: 'none', recall: 0.71, p95Ms: 90, costPerThousand: 0.1 },
  { chunking: 'recursive', retrieval: 'vector', reranker: 'none', recall: 0.78, p95Ms: 120, costPerThousand: 0.1 },
  { chunking: 'recursive', retrieval: 'bm25', reranker: 'none', recall: 0.74, p95Ms: 60, costPerThousand: 0.02 },
  { chunking: 'recursive', retrieval: 'hybrid', reranker: 'none', recall: 0.87, p95Ms: 140, costPerThousand: 0.12 },
  { chunking: 'structure-aware', retrieval: 'hybrid', reranker: 'none', recall: 0.89, p95Ms: 140, costPerThousand: 0.12 },
  { chunking: 'structure-aware', retrieval: 'vector', reranker: 'cross-encoder', recall: 0.86, p95Ms: 290, costPerThousand: 0.58 },
  { chunking: 'recursive', retrieval: 'hybrid', reranker: 'cross-encoder', recall: 0.93, p95Ms: 310, costPerThousand: 0.6 },
  { chunking: 'structure-aware', retrieval: 'hybrid', reranker: 'cross-encoder', recall: 0.95, p95Ms: 320, costPerThousand: 0.6 },
  { chunking: 'structure-aware', retrieval: 'hybrid', reranker: 'llm', recall: 0.96, p95Ms: 1900, costPerThousand: 6 },
];

const RECALL_TARGET = 0.9;
const LATENCY_BUDGET_MS = 400;
const COST_BUDGET_PER_THOUSAND = 1;
const PROMPT_PASSAGES = 5;
const FRESHNESS_MINUTES = 5;
const GOLDEN_SET_SIZE = 400;

function chosenRow() {
  const row = MEASURED.find((candidate) => candidate.chunking === retrievalPlan.chunking.strategy && candidate.retrieval === retrievalPlan.retrieval && candidate.reranker === retrievalPlan.reranker);
  if (!row) {
    throw new Error(`${retrievalPlan.chunking.strategy} + ${retrievalPlan.retrieval} + ${retrievalPlan.reranker} was not measured in the briefing table`);
  }
  return row;
}

test('the ADR is an accepted context-layer decision whose context names latency, recall and tenants or permissions, with a "We will" decision', () => {
  expect(Number.isInteger(adr.id) && adr.id > 0).toBe(true);
  expect(adr.status).toBe('accepted');
  expect(adr.layer).toBe('context');
  expect(adr.title.trim().length).toBeGreaterThanOrEqual(10);
  expect(adr.context.trim().length).toBeGreaterThanOrEqual(80);
  expect(adr.context).toMatch(/latency|p95|\bms\b/i);
  expect(adr.context).toMatch(/recall|golden/i);
  expect(adr.context).toMatch(/tenant|permission|access/i);
  expect(adr.decision.trim().length).toBeGreaterThanOrEqual(40);
  expect(adr.decision.trim()).toMatch(/^we will\b/i);
});

test('lists at least two distinct rejected alternatives with reasons, and positive and negative consequences', () => {
  expect(Array.isArray(adr.alternatives)).toBe(true);
  expect(adr.alternatives.length).toBeGreaterThanOrEqual(2);
  adr.alternatives.forEach((alternative: { option: string; reason: string }) => {
    expect(alternative.option.trim().length).toBeGreaterThanOrEqual(3);
    expect(alternative.reason.trim().length).toBeGreaterThanOrEqual(20);
  });
  const options = adr.alternatives.map((alternative: { option: string }) => alternative.option.trim().toLowerCase());
  expect(new Set(options).size).toBe(options.length);
  ['positive', 'negative'].forEach((side) => {
    expect(Array.isArray(adr.consequences[side])).toBe(true);
    expect(adr.consequences[side].length).toBeGreaterThanOrEqual(1);
    adr.consequences[side].forEach((item: string) => expect(item.trim().length).toBeGreaterThanOrEqual(15));
  });
});

test('the chosen chunking, retrieval and reranker are a measured variant that meets the recall, latency and cost limits', () => {
  expect(['fixed', 'recursive', 'structure-aware']).toContain(retrievalPlan.chunking.strategy);
  expect(['vector', 'bm25', 'hybrid']).toContain(retrievalPlan.retrieval);
  expect(['none', 'cross-encoder', 'llm']).toContain(retrievalPlan.reranker);
  const row = chosenRow();
  expect(row.recall).toBeGreaterThanOrEqual(RECALL_TARGET);
  expect(row.p95Ms).toBeLessThanOrEqual(LATENCY_BUDGET_MS);
  expect(row.costPerThousand).toBeLessThanOrEqual(COST_BUDGET_PER_THOUSAND);
});

test('chunk sizes are sane, hybrid retrieval fuses with RRF, and enough candidates reach the reranker for the 5-passage prompt', () => {
  const { size, overlap } = retrievalPlan.chunking;
  expect(size).toBeGreaterThan(0);
  expect(overlap).toBeGreaterThanOrEqual(0);
  expect(overlap).toBeLessThanOrEqual(size / 4);
  expect(retrievalPlan.fusion).toBe(retrievalPlan.retrieval === 'hybrid' ? 'rrf' : null);
  expect(retrievalPlan.topK).toBe(PROMPT_PASSAGES);
  expect(retrievalPlan.candidates).toBeGreaterThanOrEqual(20);
  expect(retrievalPlan.candidates).toBeGreaterThanOrEqual(retrievalPlan.topK);
});

test('permissions are enforced before ranking with tenant isolation, and the index honors the 5-minute freshness promise', () => {
  expect(retrievalPlan.permissionFilter).toBe('before-ranking');
  expect(['tenant-filter', 'index-per-tenant']).toContain(retrievalPlan.tenantIsolation);
  expect(retrievalPlan.freshness.mode).toBe('event-driven');
  expect(retrievalPlan.freshness.maxLagMinutes).toBeGreaterThan(0);
  expect(retrievalPlan.freshness.maxLagMinutes).toBeLessThanOrEqual(FRESHNESS_MINUTES);
});

test('answers must cite, missing evidence goes to a human, and the eval gate is recall@5 at 0.90 on the golden set', () => {
  expect(retrievalPlan.citations).toBe('required');
  expect(retrievalPlan.noEvidence).toBe('handoff');
  expect(retrievalPlan.evaluation.metric).toBe('recall@5');
  expect(retrievalPlan.evaluation.target).toBeGreaterThanOrEqual(RECALL_TARGET);
  expect(retrievalPlan.evaluation.target).toBeLessThanOrEqual(1);
  expect(retrievalPlan.evaluation.goldenSetSize).toBeGreaterThanOrEqual(GOLDEN_SET_SIZE);
});
