const { adr, evalPlan } = mod;

const JUDGES: Record<string, { provider: string; kappa: number }> = {
  'atlas-pro-2026-05-20': { provider: 'Atlas', kappa: 0.81 },
  'nimbus-mid-2026-08-01': { provider: 'Nimbus', kappa: 0.74 },
  'vega-small-2026-03-01': { provider: 'Vega', kappa: 0.48 },
};
const GENERATOR_PROVIDER = 'Atlas';
const SCORER_KINDS = ['exact', 'regex', 'schema', 'semantic', 'judge', 'trajectory'];
const TRIGGERS = ['thumbs-down', 'draft-rewritten', 'low-judge-score', 'guardrail-hit', 'forbidden-call', 'model-error'];
const ALERTS = ['refusal-rate', 'response-model-change', 'cost-per-ticket', 'online-score-drop', 'input-language-mix'];
const CRITICAL = ['refund-over-limit', 'refund-amount', 'account-deletion-request'];
const DRAFTS_PER_WEEK = 40000;
const REVIEW_CAPACITY = 300;
const NOISE = 0.025;
const MAX_DROP = 0.05;
const COST_PER_CASE_RUN = 0.01;
const CI_BUDGET = 15;

test('the ADR is an accepted evaluation-layer decision whose context names regressions and privacy, with a "We will" decision', () => {
  expect(Number.isInteger(adr.id) && adr.id > 0).toBe(true);
  expect(adr.status).toBe('accepted');
  expect(adr.layer).toBe('evaluation');
  expect(adr.title.trim().length).toBeGreaterThanOrEqual(10);
  expect(adr.context.trim().length).toBeGreaterThanOrEqual(80);
  expect(adr.context).toMatch(/regress|gate|baseline/i);
  expect(adr.context).toMatch(/personal data|privacy|PII/i);
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

test('the dataset holds the resolved tickets and every critical scenario, and the scorers cover shape, rules and open qualities', () => {
  expect(Number.isInteger(evalPlan.dataset.cases)).toBe(true);
  expect(evalPlan.dataset.cases).toBeGreaterThanOrEqual(400);
  CRITICAL.forEach((id) => expect(evalPlan.dataset.criticalCases).toContain(id));
  const names = evalPlan.scorers.map((scorer: { name: string }) => scorer.name);
  expect(new Set(names).size).toBe(names.length);
  evalPlan.scorers.forEach((scorer: { name: string; kind: string; checks: string }) => {
    expect(scorer.name.trim().length).toBeGreaterThan(0);
    expect(SCORER_KINDS).toContain(scorer.kind);
    expect(scorer.checks.trim().length).toBeGreaterThanOrEqual(15);
  });
  const kinds = evalPlan.scorers.map((scorer: { kind: string }) => scorer.kind);
  ['schema', 'trajectory', 'judge'].forEach((kind) => expect(kinds).toContain(kind));
});

test('the judge is calibrated, comes from another provider than the generator, and compares pairs in both orders', () => {
  const judge = JUDGES[evalPlan.judge.model];
  if (!judge) throw new Error(`"${evalPlan.judge.model}" is not a judge from the briefing table`);
  expect(judge.kappa).toBeGreaterThanOrEqual(0.7);
  expect(judge.provider).not.toBe(GENERATOR_PROVIDER);
  expect(evalPlan.judge.minKappa).toBeGreaterThanOrEqual(0.7);
  expect(evalPlan.judge.minKappa).toBeLessThanOrEqual(judge.kappa);
  expect(evalPlan.judge.pairwiseBothOrders).toBe(true);
});

test('the gate repeats cases, sits between the noise floor and the product rule, blocks critical regressions and fits the CI budget', () => {
  const { gate } = evalPlan;
  expect(Number.isInteger(gate.repeats)).toBe(true);
  expect(gate.repeats).toBeGreaterThanOrEqual(3);
  expect(gate.tolerance).toBeGreaterThan(NOISE);
  expect(gate.tolerance).toBeLessThanOrEqual(MAX_DROP);
  expect(gate.blockOnCriticalRegression).toBe(true);
  expect(Number.isInteger(gate.pullRequestCases)).toBe(true);
  expect(gate.pullRequestCases).toBeGreaterThan(0);
  expect(gate.pullRequestCases).toBeLessThanOrEqual(evalPlan.dataset.cases);
  const expected = gate.pullRequestCases * gate.repeats * COST_PER_CASE_RUN;
  expect(expected).toBeLessThanOrEqual(CI_BUDGET);
  expect(Math.abs(gate.projectedCostUsd - expected)).toBeLessThanOrEqual(expected * 0.1);
  expect(gate.projectedCostUsd).toBeLessThanOrEqual(CI_BUDGET);
});

test('tracing follows the GenAI conventions without content, and review sampling fits capacity with unbiased and triggered samples', () => {
  expect(evalPlan.tracing.conventions).toBe('opentelemetry-genai');
  expect(evalPlan.tracing.captureContent).toBe(false);
  const { randomSampleRate, triggeredPerWeek, triggers } = evalPlan.online;
  expect(randomSampleRate).toBeGreaterThan(0);
  expect(triggeredPerWeek).toBeGreaterThanOrEqual(0);
  expect(randomSampleRate * DRAFTS_PER_WEEK + triggeredPerWeek).toBeLessThanOrEqual(REVIEW_CAPACITY + 1e-9);
  triggers.forEach((trigger: string) => expect(TRIGGERS).toContain(trigger));
  expect(triggers).toContain('forbidden-call');
  expect(triggers.some((trigger: string) => trigger === 'thumbs-down' || trigger === 'draft-rewritten')).toBe(true);
});

test('drift is watched: the offline suite runs on a schedule and alerts catch provider-side changes', () => {
  expect(['daily', 'weekly']).toContain(evalPlan.drift.scheduledSuite);
  evalPlan.drift.alerts.forEach((alert: string) => expect(ALERTS).toContain(alert));
  expect(evalPlan.drift.alerts).toContain('response-model-change');
  expect(evalPlan.drift.alerts).toContain('refusal-rate');
});
