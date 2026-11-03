export const adr = {
  id: 4,
  // TODO: a short title naming the decision
  title: '',
  // TODO: accept the decision
  status: 'proposed',
  layer: 'context',
  // TODO: the forces from the briefing: tenants and access, freshness, latency, recall target, cost
  context: '',
  // TODO: one sentence starting with "We will", naming chunking, retrieval, reranking, permissions and grounding
  decision: '',
  // TODO: at least two { option, reason } you rejected, each reason citing a number from the briefing
  alternatives: [] as Array<{ option: string; reason: string }>,
  // TODO: what the team gains and what it pays or must watch
  consequences: { positive: [] as string[], negative: [] as string[] },
};

export const retrievalPlan = {
  // TODO: pick a measured row of the table that meets recall, latency and cost
  chunking: { strategy: 'fixed', size: 1000, overlap: 0 },
  retrieval: 'vector',
  fusion: null as string | null,
  reranker: 'none',
  candidates: 5,
  topK: 5,
  // TODO: where is access enforced, and how are tenants isolated?
  permissionFilter: 'after-ranking',
  tenantIsolation: 'tenant-filter',
  // TODO: can this mode meet the 5-minute promise?
  freshness: { mode: 'nightly-batch', maxLagMinutes: 1440 },
  citations: 'optional',
  noEvidence: 'answer-anyway',
  evaluation: { metric: 'recall@5', target: 0.9, goldenSetSize: 400 },
};
