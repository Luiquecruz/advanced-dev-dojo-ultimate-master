const { createModel, countTokens } = require('@dojo/ai');

const BUDGETS = [
  { id: 'company', limitUsd: 100 },
  { id: 'support-team', team: 'support', limitUsd: 10 },
  { id: 'support-summaries', team: 'support', feature: 'summaries', limitUsd: 2 },
  { id: 'sales-team', team: 'sales', limitUsd: 5 },
];
const PRICING = { inputPerMillion: 3, outputPerMillion: 15 };
const usage = (cost: number) => ({ inputTokens: 100, outputTokens: 50, totalTokens: 150, cost });
const support = (feature = 'replies') => ({ team: 'support', feature });

function governor(options: Record<string, unknown> = {}) {
  const alerts: Array<Record<string, unknown>> = [];
  let clock = 1_000_000;
  const created = mod.createCostGovernor({ budgets: BUDGETS, now: () => clock, onAlert: (alert: Record<string, unknown>) => alerts.push(alert), ...options });
  return { governor: created, alerts, advance: (ms: number) => (clock += ms) };
}

test('record charges every matching budget and attributes cost by team, feature and model', () => {
  const { governor: costs } = governor();
  costs.record(support('replies'), 'acme-small-2026-05', usage(0.4));
  costs.record(support('summaries'), 'acme-large-2026-05', usage(0.25));
  costs.record({ team: 'sales', feature: 'emails' }, 'acme-small-2026-05', usage(0.1));
  expect(costs.spent('company')).toBeCloseTo(0.75);
  expect(costs.spent('support-team')).toBeCloseTo(0.65);
  expect(costs.spent('support-summaries')).toBeCloseTo(0.25);
  expect(costs.spent('sales-team')).toBeCloseTo(0.1);
  const report = costs.report();
  expect(report.totalUsd).toBeCloseTo(0.75);
  expect(Object.keys(report.byTeam).sort()).toEqual(['sales', 'support']);
  expect(report.byTeam.support).toBeCloseTo(0.65);
  expect(report.byFeature['support/summaries']).toBeCloseTo(0.25);
  expect(report.byFeature['sales/emails']).toBeCloseTo(0.1);
  expect(report.byModel['acme-small-2026-05']).toBeCloseTo(0.5);
  expect(report.byModel['acme-large-2026-05']).toBeCloseTo(0.25);
});

test('alerts fire once per budget and threshold, including several thresholds crossed by one call', () => {
  const { governor: costs, alerts } = governor();
  costs.record(support('summaries'), 'm', usage(0.9));
  expect(alerts).toEqual([]);
  costs.record(support('summaries'), 'm', usage(0.2));
  expect(alerts.map((alert) => [alert.budgetId, alert.threshold])).toEqual([['support-summaries', 0.5]]);
  expect(alerts[0].spentUsd).toBeCloseTo(1.1);
  expect(alerts[0].limitUsd).toBe(2);
  costs.record(support('summaries'), 'm', usage(1.0));
  expect(alerts.map((alert) => [alert.budgetId, alert.threshold])).toEqual([['support-summaries', 0.5], ['support-summaries', 0.8], ['support-summaries', 1]]);
  costs.record(support('summaries'), 'm', usage(0.1));
  expect(alerts).toHaveLength(3);
  const custom = governor({ alertThresholds: [0.9, 0.25] });
  custom.governor.record({ team: 'sales', feature: 'emails' }, 'm', usage(5));
  expect(custom.alerts.map((alert) => [alert.budgetId, alert.threshold])).toEqual([['sales-team', 0.25], ['sales-team', 0.9]]);
});

test('check enforces hard limits before the call: the narrowest exhausted budget blocks only its own scope', () => {
  const { governor: costs } = governor();
  costs.record(support('summaries'), 'm', usage(1.8));
  expect(costs.check(support('summaries'), 0.1)).toEqual({ allowed: true });
  expect(costs.check(support('summaries'), 0.3)).toEqual({ allowed: false, reason: 'hard-limit', budgetId: 'support-summaries' });
  expect(costs.check(support('replies'), 0.3)).toEqual({ allowed: true });
  expect(costs.check({ team: 'sales', feature: 'emails' }, 6)).toEqual({ allowed: false, reason: 'hard-limit', budgetId: 'sales-team' });
  expect(costs.check({ team: 'marketing', feature: 'ads' }, 150)).toEqual({ allowed: false, reason: 'hard-limit', budgetId: 'company' });
});

test('rate limits use a sliding window per team, report retryAfterMs and do not count refused attempts', () => {
  const { governor: costs, advance } = governor({ rateLimits: { support: { requests: 2, windowMs: 1000 } } });
  expect(costs.check(support(), 0)).toEqual({ allowed: true });
  advance(300);
  expect(costs.check(support(), 0)).toEqual({ allowed: true });
  advance(200);
  expect(costs.check(support(), 0)).toEqual({ allowed: false, reason: 'rate-limit', retryAfterMs: 500 });
  expect(costs.check({ team: 'sales', feature: 'emails' }, 0)).toEqual({ allowed: true });
  advance(500);
  expect(costs.check(support(), 0)).toEqual({ allowed: true });
  expect(costs.check(support(), 0)).toEqual({ allowed: false, reason: 'rate-limit', retryAfterMs: 300 });
  advance(300);
  expect(costs.check(support(), 0)).toEqual({ allowed: true });
});

test('estimateCostUsd prices the input tokens and the maximum output', () => {
  const request = { messages: [{ role: 'system', content: 'Summarize the ticket.' }, { role: 'user', content: 'The package arrived damaged and the customer wants a refund.' }], maxTokens: 200 };
  const inputTokens = countTokens(request.messages);
  expect(mod.estimateCostUsd(request, PRICING)).toBeCloseTo((inputTokens * 3 + 200 * 15) / 1_000_000, 10);
  expect(mod.estimateCostUsd({ messages: request.messages }, PRICING)).toBeCloseTo((inputTokens * 3 + 1000 * 15) / 1_000_000, 10);
  expect(mod.estimateCostUsd({ messages: request.messages }, PRICING, 50)).toBeCloseTo((inputTokens * 3 + 50 * 15) / 1_000_000, 10);
});

test('governedGenerate records the actual cost of each reply and refuses before calling when the estimate would break a budget', async () => {
  await forEachSeed(8, async () => {
    fakeModel.configure({ pricing: PRICING });
    const { governor: costs } = governor({ budgets: [{ id: 'support-summaries', team: 'support', feature: 'summaries', limitUsd: 0.01 }] });
    const model = createModel({ model: 'acme-small-2026-05' });
    const request = { messages: [{ role: 'user', content: 'Summarize ticket T-1: package arrived damaged.' }], maxTokens: 100 };
    fakeModel.reply(respond.text(['Damaged package; refund requested.', 'Customer reports a damaged package and asks for a refund or a replacement within the week.']), respond.text('Second summary.'));
    const first = await mod.governedGenerate(costs, model, support('summaries'), request, PRICING);
    const second = await mod.governedGenerate(costs, model, support('summaries'), request, PRICING);
    expect(costs.spent('support-summaries')).toBeCloseTo(first.usage.cost + second.usage.cost, 10);
    expect(costs.report().byModel['acme-small-2026-05']).toBeCloseTo(first.usage.cost + second.usage.cost, 10);
    const error = await captureError(mod.governedGenerate(costs, model, support('summaries'), { ...request, maxTokens: 1000 }, PRICING));
    expect(error).toBeInstanceOf(mod.BudgetExceededError);
    expect(error.result).toEqual({ allowed: false, reason: 'hard-limit', budgetId: 'support-summaries' });
    expect(fakeModel.requests).toHaveLength(2);
  });
});

test('a failed model call propagates and is not charged', async () => {
  const { governor: costs } = governor();
  fakeModel.reply(respond.error(500));
  const error = await captureError(mod.governedGenerate(costs, createModel(), support(), { messages: [{ role: 'user', content: 'hi' }] }, PRICING));
  expect(error.status).toBe(500);
  expect(costs.spent('company')).toBe(0);
  expect(costs.report().totalUsd).toBe(0);
});
