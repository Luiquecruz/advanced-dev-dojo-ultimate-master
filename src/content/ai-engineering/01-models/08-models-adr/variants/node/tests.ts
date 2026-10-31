const { adr, modelPlan } = mod;

const CANDIDATES: Record<string, { provider: string; eu: boolean; p95Ms: number; costPerThousand: number; fixedMonthly: number; accuracy: number; rejectionRate: number }> = {
  'atlas-mini-2026-07-15': { provider: 'Atlas', eu: true, p95Ms: 400, costPerThousand: 0.5, fixedMonthly: 0, accuracy: 0.89, rejectionRate: 0.15 },
  'atlas-pro-2026-05-20': { provider: 'Atlas', eu: true, p95Ms: 2600, costPerThousand: 9, fixedMonthly: 0, accuracy: 0.96, rejectionRate: 0.02 },
  'atlas-think-2026-06-02': { provider: 'Atlas', eu: true, p95Ms: 11000, costPerThousand: 30, fixedMonthly: 0, accuracy: 0.97, rejectionRate: 0.01 },
  'nimbus-mid-2026-08-01': { provider: 'Nimbus', eu: true, p95Ms: 1000, costPerThousand: 2.5, fixedMonthly: 0, accuracy: 0.94, rejectionRate: 0.03 },
  'vega-flash-2026-04-10': { provider: 'Vega', eu: false, p95Ms: 700, costPerThousand: 1.2, fixedMonthly: 0, accuracy: 0.93, rejectionRate: 0.04 },
  'tern-14b-q4': { provider: 'self-hosted', eu: true, p95Ms: 900, costPerThousand: 0, fixedMonthly: 1500, accuracy: 0.91, rejectionRate: 0.09 },
};

const TICKETS_PER_MONTH_IN_THOUSANDS = 1800;
const LATENCY_BUDGET_MS = 1500;
const MONTHLY_BUDGET_USD = 4000;

function chosenIds(): string[] {
  return [modelPlan.primary, modelPlan.escalation, modelPlan.fallback].filter((id) => id !== null);
}

function candidate(id: string) {
  const found = CANDIDATES[id];
  if (!found) {
    throw new Error(`"${id}" is not a pinned model id from the briefing table`);
  }
  return found;
}

function projectedCost(): number {
  const primary = candidate(modelPlan.primary);
  const escalationCost = modelPlan.escalation === null ? 0 : primary.rejectionRate * candidate(modelPlan.escalation).costPerThousand;
  const fixed = [...new Set(chosenIds())].reduce((total, id) => total + candidate(id).fixedMonthly, 0);
  return TICKETS_PER_MONTH_IN_THOUSANDS * (primary.costPerThousand + escalationCost) + fixed;
}

test('the ADR is an accepted model-layer decision whose context names latency, cost and data residency, with a "We will" decision', () => {
  expect(Number.isInteger(adr.id) && adr.id > 0).toBe(true);
  expect(adr.status).toBe('accepted');
  expect(adr.layer).toBe('model');
  expect(adr.title.trim().length).toBeGreaterThanOrEqual(10);
  expect(adr.context.trim().length).toBeGreaterThanOrEqual(80);
  expect(adr.context).toMatch(/latency/i);
  expect(adr.context).toMatch(/cost|budget|\$/i);
  expect(adr.context).toMatch(/\bEU\b|europe|privacy|personal data/i);
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

test('the plan uses pinned snapshot ids from the briefing table, never a -latest alias, and a mechanical escalation rule', () => {
  chosenIds().forEach((id) => {
    expect(id).not.toMatch(/latest/i);
    expect(Object.keys(CANDIDATES)).toContain(id);
  });
  expect(modelPlan.escalationRule.trim().length).toBeGreaterThanOrEqual(20);
  expect(modelPlan.escalationRule).toMatch(/valid|categor|confiden|schema|pars/i);
});

test('every chosen model processes data in the EU and the fallback runs on a different provider than the primary', () => {
  const outsideEu = chosenIds().filter((id) => !candidate(id).eu);
  expect(outsideEu).toEqual([]);
  expect(candidate(modelPlan.fallback).provider).not.toBe(candidate(modelPlan.primary).provider);
});

test('the latency budget rules out slow tiers and the plan reaches 92% accuracy, with at least 88% on the fallback', () => {
  const escalationLatency = modelPlan.escalation === null ? 0 : candidate(modelPlan.escalation).p95Ms;
  expect(candidate(modelPlan.primary).p95Ms + escalationLatency).toBeLessThanOrEqual(LATENCY_BUDGET_MS);
  expect(candidate(modelPlan.fallback).p95Ms).toBeLessThanOrEqual(LATENCY_BUDGET_MS);
  const bestAccuracy = Math.max(candidate(modelPlan.primary).accuracy, modelPlan.escalation === null ? 0 : candidate(modelPlan.escalation).accuracy);
  expect(bestAccuracy).toBeGreaterThanOrEqual(0.92);
  expect(candidate(modelPlan.fallback).accuracy).toBeGreaterThanOrEqual(0.88);
});

test('the projected monthly cost matches the plan within 10% and fits the $4 000 budget', () => {
  const expected = projectedCost();
  expect(typeof modelPlan.projectedMonthlyUsd).toBe('number');
  expect(Math.abs(modelPlan.projectedMonthlyUsd - expected)).toBeLessThanOrEqual(expected * 0.1);
  expect(expected).toBeLessThanOrEqual(MONTHLY_BUDGET_USD);
  expect(modelPlan.projectedMonthlyUsd).toBeLessThanOrEqual(MONTHLY_BUDGET_USD);
});
