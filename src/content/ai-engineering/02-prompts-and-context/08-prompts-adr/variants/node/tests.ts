const { adr, promptPlan } = mod;

const VALID_AFTER_ATTEMPTS: Record<number, number> = { 1: 0.965, 2: 0.996, 3: 0.998 };
const EXAMPLE_ACCURACY: Record<string, number> = { none: 0.74, static: 0.81, similarity: 0.93 };
const PARTS = ['instructions', 'output-schema', 'examples', 'attachment', 'claim'];
const CALL_P95_MS = 1100;
const LATENCY_BUDGET_MS = 3000;
const CONTEXT_WINDOW = 32000;
const LARGEST_RECORD_TOKENS = 700;
const ATTACHMENT_LIMIT = 4000;
const BACKFILL_BUDGET_USD = 6000;

function stableParts(): string[] {
  return promptPlan.examples.strategy === 'static' ? ['instructions', 'output-schema', 'examples'] : ['instructions', 'output-schema'];
}

function expectedBackfillCost(): number {
  const interactive = (1_200_000 * (3000 * 2 + 300 * 8)) / 1_000_000;
  return promptPlan.processing.backfill === 'batch' ? interactive * 0.5 : interactive;
}

test('the ADR is an accepted context-layer decision whose context names latency, cost and the schema, with a "We will" decision', () => {
  expect(Number.isInteger(adr.id) && adr.id > 0).toBe(true);
  expect(adr.status).toBe('accepted');
  expect(adr.layer).toBe('context');
  expect(adr.title.trim().length).toBeGreaterThanOrEqual(10);
  expect(adr.context.trim().length).toBeGreaterThanOrEqual(80);
  expect(adr.context).toMatch(/latency|p95|\bms\b/i);
  expect(adr.context).toMatch(/cost|budget|\$/i);
  expect(adr.context).toMatch(/schema|structured|json/i);
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

test('the output is schema-constrained, validated locally, and the attempt limit meets both the validity target and the latency budget', () => {
  expect(promptPlan.output.mode).toBe('json-schema');
  expect(promptPlan.output.validateLocally).toBe(true);
  const attempts = promptPlan.output.maxAttempts;
  expect(Number.isInteger(attempts)).toBe(true);
  expect(VALID_AFTER_ATTEMPTS[attempts] ?? 0).toBeGreaterThanOrEqual(0.995);
  expect(attempts * CALL_P95_MS).toBeLessThanOrEqual(LATENCY_BUDGET_MS);
});

test('the example strategy reaches 90% accuracy with a measured count, within the 800-token example budget', () => {
  expect(EXAMPLE_ACCURACY[promptPlan.examples.strategy] ?? 0).toBeGreaterThanOrEqual(0.9);
  expect(promptPlan.examples.count).toBeGreaterThanOrEqual(3);
  expect(promptPlan.examples.count).toBeLessThanOrEqual(6);
  expect(promptPlan.examples.maxTokens).toBeGreaterThan(0);
  expect(promptPlan.examples.maxTokens).toBeLessThanOrEqual(800);
});

test('the layout sends every part once with the claim last, stable parts first, and caches exactly the stable prefix', () => {
  const layout: string[] = promptPlan.layout;
  expect([...layout].sort()).toEqual([...PARTS].sort());
  expect(layout.at(-1)).toBe('claim');
  const stable = stableParts();
  expect([...layout.slice(0, stable.length)].sort()).toEqual([...stable].sort());
  expect(promptPlan.cacheBreakpointAfter).toBe(layout[stable.length - 1]);
});

test('the context budget fits the window with room for the largest record, and attachments are capped where accuracy held', () => {
  const { inputBudgetTokens, outputReserveTokens, maxAttachmentTokens } = promptPlan.context;
  expect(inputBudgetTokens + outputReserveTokens).toBeLessThanOrEqual(CONTEXT_WINDOW);
  expect(outputReserveTokens).toBeGreaterThanOrEqual(LARGEST_RECORD_TOKENS);
  expect(maxAttachmentTokens).toBeGreaterThan(0);
  expect(maxAttachmentTokens).toBeLessThanOrEqual(ATTACHMENT_LIMIT);
  expect(maxAttachmentTokens).toBeLessThan(inputBudgetTokens);
});

test('live claims run interactively, the backfill fits its budget with a matching projection, and versions pass staging before production', () => {
  expect(promptPlan.processing.live).toBe('interactive');
  expect(['interactive', 'batch']).toContain(promptPlan.processing.backfill);
  const expected = expectedBackfillCost();
  expect(Math.abs(promptPlan.backfillCostUsd - expected)).toBeLessThanOrEqual(expected * 0.1);
  expect(expected).toBeLessThanOrEqual(BACKFILL_BUDGET_USD);
  expect(promptPlan.promptVersion).toMatch(/^claim-intake@\d+\.\d+\.\d+$/);
  expect(promptPlan.environments).toEqual(['staging', 'production']);
});
