const { adr, multiAgentPlan } = mod;

const ARCHITECTURES = ['single-agent', 'orchestrator-workers', 'handoff-swarm'];
const PILOT: Record<string, Record<string, { passRate: number; costUsd: number; p95Seconds: number }>> = {
  'market-scan': {
    'single-agent': { passRate: 0.64, costUsd: 0.9, p95Seconds: 660 },
    'orchestrator-workers': { passRate: 0.86, costUsd: 3.7, p95Seconds: 240 },
    'handoff-swarm': { passRate: 0.71, costUsd: 5.4, p95Seconds: 780 },
  },
  'report-editing': {
    'single-agent': { passRate: 0.92, costUsd: 0.25, p95Seconds: 40 },
    'orchestrator-workers': { passRate: 0.81, costUsd: 1.1, p95Seconds: 70 },
    'handoff-swarm': { passRate: 0.78, costUsd: 1.6, p95Seconds: 95 },
  },
};
const REQUIREMENTS: Record<string, { passRate: number; costUsd: number; p95Seconds: number }> = {
  'market-scan': { passRate: 0.8, costUsd: 5, p95Seconds: 360 },
  'report-editing': { passRate: 0.8, costUsd: 0.5, p95Seconds: 60 },
};
const PLANNER_ATTEMPT_USD = 0.2;
const SYNTHESIS_USD = 0.4;
const WORKER_USD = 0.5;
const PROVIDER_CONCURRENCY = 4;

test('the ADR is an accepted loop-layer decision whose context names cost and quality or latency, with a "We will" decision', () => {
  expect(Number.isInteger(adr.id) && adr.id > 0).toBe(true);
  expect(adr.status).toBe('accepted');
  expect(adr.layer).toBe('loop');
  expect(adr.title.trim().length).toBeGreaterThanOrEqual(10);
  expect(adr.context.trim().length).toBeGreaterThanOrEqual(80);
  expect(adr.context).toMatch(/cost|budget|\$/i);
  expect(adr.context).toMatch(/pass rate|quality|latency|p95/i);
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

test('each feature uses the architecture that meets every requirement in the pilot', () => {
  expect(Object.keys(multiAgentPlan.architectures).sort()).toEqual(['market-scan', 'report-editing']);
  Object.entries(multiAgentPlan.architectures).forEach(([feature, architecture]) => {
    expect(ARCHITECTURES).toContain(architecture);
    const measured = PILOT[feature][architecture as string];
    const required = REQUIREMENTS[feature];
    if (measured.passRate < required.passRate) throw new Error(`${architecture} passes ${measured.passRate} of ${feature} tasks, below ${required.passRate}`);
    if (measured.costUsd > required.costUsd) throw new Error(`${architecture} costs $${measured.costUsd} per ${feature} task, above $${required.costUsd}`);
    if (measured.p95Seconds > required.p95Seconds) throw new Error(`${architecture} has a p95 of ${measured.p95Seconds} s for ${feature}, above ${required.p95Seconds} s`);
  });
});

test('the orchestrator limits fit the budget, the provider concurrency and a malformed first plan', () => {
  const { maxWorkers, concurrency, maxPlanAttempts, budgetUsd } = multiAgentPlan.orchestrator;
  [maxWorkers, concurrency, maxPlanAttempts].forEach((value) => expect(Number.isInteger(value)).toBe(true));
  expect(maxWorkers).toBeGreaterThanOrEqual(2);
  expect(maxPlanAttempts).toBeGreaterThanOrEqual(2);
  expect(budgetUsd).toBeGreaterThan(0);
  expect(budgetUsd).toBeLessThanOrEqual(REQUIREMENTS['market-scan'].costUsd);
  const worstCase = maxPlanAttempts * PLANNER_ATTEMPT_USD + SYNTHESIS_USD + maxWorkers * WORKER_USD;
  if (worstCase > budgetUsd + 1e-9) throw new Error(`the worst-case scan costs $${worstCase.toFixed(2)}, above the $${budgetUsd} budget`);
  expect(concurrency).toBeGreaterThanOrEqual(2);
  expect(concurrency).toBeLessThanOrEqual(PROVIDER_CONCURRENCY);
  expect(concurrency).toBeLessThanOrEqual(maxWorkers);
});

test('workers cannot delegate, and their outputs are checked for shape and citations before synthesis', () => {
  expect(multiAgentPlan.limits.maxDelegationDepth).toBe(1);
  const checks = multiAgentPlan.validation;
  expect(Array.isArray(checks)).toBe(true);
  checks.forEach((check: string) => expect(['schema', 'citations', 'llm-judge']).toContain(check));
  expect(new Set(checks).size).toBe(checks.length);
  expect(checks).toContain('schema');
  expect(checks).toContain('citations');
});

test('a failed worker does not sink a scan, but a report needs at least half of the workers', () => {
  const { onWorkerFailure, minSuccessfulShare } = multiAgentPlan.failurePolicy;
  expect(onWorkerFailure).toBe('continue');
  expect(minSuccessfulShare).toBeGreaterThanOrEqual(0.5);
  expect(minSuccessfulShare).toBeLessThan(1);
});

test('each integration uses the protocol that fits it', () => {
  expect(multiAgentPlan.integrations).toEqual({
    'vendor-database': 'mcp',
    'certifyhub-compliance': 'a2a',
    'research-workers': 'in-process',
  });
});
