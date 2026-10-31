const { createModel, countTokens } = require('@dojo/ai');

const PRICING = { inputPerMillion: 2000, outputPerMillion: 8000 };
const MARGIN = 0.2;
const QUESTION = [
  { role: 'system', content: 'You answer questions about orders in one sentence.' },
  { role: 'user', content: 'Where is order 1042?' },
];
const LONG_REPLY = 'Order 1042 left the warehouse yesterday and is now with the carrier, '.repeat(20);

function worstCase(messages: unknown[], maxTokens: number, safetyMargin = MARGIN): number {
  const inputTokens = Math.ceil(countTokens(messages) * (1 + safetyMargin));
  return (inputTokens * PRICING.inputPerMillion + maxTokens * PRICING.outputPerMillion) / 1_000_000;
}

function budgetedClient(extra: Record<string, unknown> = {}) {
  return mod.createBudgetedClient({ model: createModel(), pricing: PRICING, maxRequestCost: 1, maxSessionCost: 1, safetyMargin: MARGIN, ...extra });
}

test('estimateCost counts input tokens locally, adds the safety margin rounded up and prices every allowed output token', () => {
  const plain = mod.estimateCost(QUESTION, 200, PRICING);
  expect(plain.inputTokens).toBe(countTokens(QUESTION));
  expect(plain.maxOutputTokens).toBe(200);
  expect(plain.maxCost).toBeCloseTo(worstCase(QUESTION, 200, 0), 9);
  const padded = mod.estimateCost(QUESTION, 200, PRICING, MARGIN);
  expect(padded.inputTokens).toBe(Math.ceil(countTokens(QUESTION) * (1 + MARGIN)));
  expect(padded.maxCost).toBeCloseTo(worstCase(QUESTION, 200), 9);
});

test('when the provider counts 15% more tokens, only the estimate with a margin bounds the reported usage and cost of any reply', async () => {
  await forEachSeed(10, async () => {
    fakeModel.configure({ pricing: PRICING, tokenizerDrift: 0.15 });
    fakeModel.reply(respond.text(['In transit.', 'It is with the carrier and arrives tomorrow.', LONG_REPLY]));
    const result = await budgetedClient().send(QUESTION, 60);
    expect(fakeModel.requests[0].maxTokens).toBe(60);
    expect(result.usage.inputTokens).toBeGreaterThan(mod.estimateCost(QUESTION, 60, PRICING).inputTokens);
    expect(result.usage.inputTokens).toBeLessThanOrEqual(mod.estimateCost(QUESTION, 60, PRICING, MARGIN).inputTokens);
    expect(result.estimatedCost).toBeCloseTo(worstCase(QUESTION, 60), 9);
    expect(result.usage.cost).toBeLessThanOrEqual(result.estimatedCost);
  });
});

test('refuses a request whose worst case exceeds the per-request limit before sending anything', async () => {
  fakeModel.configure({ pricing: PRICING });
  const client = budgetedClient({ maxRequestCost: worstCase(QUESTION, 120), maxSessionCost: 10 });
  const error = await captureError(client.send(QUESTION, 150));
  expect(error).toBeInstanceOf(mod.BudgetExceededError);
  expect(error.scope).toBe('request');
  expect(fakeModel.requests).toHaveLength(0);
  expect(client.report()).toEqual({ requests: 0, inputTokens: 0, outputTokens: 0, cost: 0, latenciesMs: [] });
  await client.send(QUESTION, 100);
  expect(fakeModel.requests).toHaveLength(1);
});

test('adds the actual cost of each call to the session and refuses the call that could exceed the session budget', async () => {
  fakeModel.configure({ pricing: PRICING });
  fakeModel.handle(() => respond.text(LONG_REPLY));
  const client = budgetedClient({ maxSessionCost: worstCase(QUESTION, 100) * 2.5 });
  const first = await client.send(QUESTION, 100);
  const second = await client.send(QUESTION, 100);
  const error = await captureError(client.send(QUESTION, 100));
  expect(error).toBeInstanceOf(mod.BudgetExceededError);
  expect(error.scope).toBe('session');
  expect(fakeModel.requests).toHaveLength(2);
  const smaller = await client.send(QUESTION, 10);
  expect(fakeModel.requests).toHaveLength(3);
  const report = client.report();
  expect(report.requests).toBe(3);
  expect(report.inputTokens).toBe(first.usage.inputTokens + second.usage.inputTokens + smaller.usage.inputTokens);
  expect(report.outputTokens).toBe(first.usage.outputTokens + second.usage.outputTokens + smaller.usage.outputTokens);
  expect(report.cost).toBeCloseTo(first.usage.cost + second.usage.cost + smaller.usage.cost, 9);
});

test('records the provider usage, not the estimate, so short replies leave budget for more calls', async () => {
  fakeModel.configure({ pricing: PRICING });
  fakeModel.handle(() => respond.text('Shipped.'));
  const sessionBudget = worstCase(QUESTION, 100) * 2.5;
  const client = budgetedClient({ maxSessionCost: sessionBudget });
  for (let call = 0; call < 4; call++) {
    await client.send(QUESTION, 100);
  }
  const report = client.report();
  expect(report.requests).toBe(4);
  expect(report.cost).toBeLessThan(sessionBudget);
  expect(report.outputTokens).toBe(4 * countTokens('Shipped.'));
});

test('measures each call with the injected clock and reports the latencies in order', async () => {
  let time = 1_000;
  const steps = [250, 40, 900];
  fakeModel.handle((request: unknown, context: { callIndex: number }) => {
    time += steps[context.callIndex];
    return respond.text('Delivered.');
  });
  const client = budgetedClient({ now: () => time });
  const latencies: number[] = [];
  for (let call = 0; call < 3; call++) {
    latencies.push((await client.send(QUESTION, 50)).latencyMs);
  }
  expect(latencies).toEqual(steps);
  expect(client.report().latenciesMs).toEqual(steps);
});
