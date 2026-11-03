const { adr, memoryPlan } = mod;

const MEMORY_TYPES = ['working', 'episodic', 'semantic', 'procedural'];
const STRATEGIES = ['full-history', 'sliding-window', 'running-summary', 'window-plus-summary'];
const STORES: Record<string, { preference: number; atTheTime: number; p95Ms: number }> = {
  none: { preference: 0.31, atTheTime: 0.12, p95Ms: 0 },
  files: { preference: 0.82, atTheTime: 0.49, p95Ms: 40 },
  vector: { preference: 0.9, atTheTime: 0.58, p95Ms: 60 },
  'temporal-graph': { preference: 0.89, atTheTime: 0.91, p95Ms: 180 },
};
const MEMORY_BUDGET_TOKENS = 6000;
const TOKENS_PER_MEMORY = 80;

test('the ADR is an accepted context-layer decision whose context names the token budget, changing facts and privacy duties, with a "We will" decision', () => {
  expect(Number.isInteger(adr.id) && adr.id > 0).toBe(true);
  expect(adr.status).toBe('accepted');
  expect(adr.layer).toBe('context');
  expect(adr.title.trim().length).toBeGreaterThanOrEqual(10);
  expect(adr.context.trim().length).toBeGreaterThanOrEqual(80);
  expect(adr.context).toMatch(/token|budget/i);
  expect(adr.context).toMatch(/time|temporal|chang/i);
  expect(adr.context).toMatch(/privacy|GDPR|erasure|personal data/i);
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

test('keeps working, episodic and semantic memory, and procedures never change without review', () => {
  expect(Array.isArray(memoryPlan.types)).toBe(true);
  memoryPlan.types.forEach((type: string) => expect(MEMORY_TYPES).toContain(type));
  ['working', 'episodic', 'semantic'].forEach((type) => expect(memoryPlan.types).toContain(type));
  expect(['none', 'reviewed']).toContain(memoryPlan.procedureUpdates);
});

test('the conversation strategy survives 300-turn sessions and shares the 6 000-token budget with enough retrieved memories', () => {
  const { conversation, longTerm } = memoryPlan;
  expect(STRATEGIES).toContain(conversation.strategy);
  expect(conversation.strategy).not.toBe('full-history');
  expect(conversation.keepRecentMessages).toBeGreaterThanOrEqual(2);
  expect(conversation.maxTokens).toBeGreaterThanOrEqual(1500);
  expect(Number.isInteger(longTerm.topK)).toBe(true);
  expect(longTerm.topK).toBeGreaterThanOrEqual(3);
  expect(conversation.maxTokens + longTerm.topK * TOKENS_PER_MEMORY).toBeLessThanOrEqual(MEMORY_BUDGET_TOKENS);
});

test('the long-term store meets both eval targets within the latency budget, and every retrieval weight counts', () => {
  const store = STORES[memoryPlan.longTerm.store];
  expect(store).toBeDefined();
  expect(store.preference).toBeGreaterThanOrEqual(0.85);
  expect(store.atTheTime).toBeGreaterThanOrEqual(0.85);
  expect(store.p95Ms).toBeLessThanOrEqual(250);
  const { relevance, recency, importance } = memoryPlan.longTerm.weights;
  [relevance, recency, importance].forEach((weight) => {
    expect(typeof weight).toBe('number');
    expect(weight).toBeGreaterThan(0);
  });
});

test('memories are isolated per person, untrusted instructions are rejected, and retention and erasure meet the GDPR commitments', () => {
  expect(memoryPlan.isolation).toBe('per-user');
  expect(memoryPlan.untrustedInstructions).toBe('reject');
  expect(memoryPlan.retentionDays).toBeGreaterThanOrEqual(1);
  expect(memoryPlan.retentionDays).toBeLessThanOrEqual(365);
  expect(memoryPlan.erasure.maxDays).toBeGreaterThan(0);
  expect(memoryPlan.erasure.maxDays).toBeLessThanOrEqual(30);
  expect(memoryPlan.erasure.includesDerived).toBe(true);
});
