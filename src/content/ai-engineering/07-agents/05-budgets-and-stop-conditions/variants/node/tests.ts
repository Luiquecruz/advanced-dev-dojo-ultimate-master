const { createModel } = require('@dojo/ai');

function searchTools(onSearch: (args: any) => unknown = ({ query, page }) => ({ query, page, hits: [`result ${page}`] })) {
  const search = fn(onSearch);
  return { search, tools: [{ name: 'search', description: 'Search the knowledge base', parameters: { type: 'object', properties: { query: { type: 'string' }, page: { type: 'number' } } }, execute: search }] };
}

const sumUsage = (key: 'inputTokens' | 'outputTokens' | 'totalTokens' | 'cost') => fakeModel.responses.reduce((total: number, response: any) => total + response.usage[key], 0);

const toolMessageCount = (messages: Array<{ role: string }>) => messages.filter((message) => message.role === 'tool').length;

function paging() {
  let page = 0;
  return () => respond.toolCall('search', { query: 'refund policy', page: ++page });
}

test('callSignature identifies a tool call by name and arguments, ignoring key order', () => {
  const signature = (name: string, args: string) => mod.callSignature({ name, arguments: args });
  expect(signature('search', '{"query":"refunds","page":1}')).toBe(signature('search', '{"page":1,"query":"refunds"}'));
  expect(signature('search', '{"filter":{"b":2,"a":1}}')).toBe(signature('search', '{"filter":{"a":1,"b":2}}'));
  expect(signature('search', '{"query":"refunds","page":1}')).not.toBe(signature('search', '{"query":"refunds","page":2}'));
  expect(signature('search', '{"query":"refunds"}')).not.toBe(signature('lookup', '{"query":"refunds"}'));
  expect(typeof signature('search', '{"query": ')).toBe('string');
});

test('a run that finishes reports done with the answer and usage totals summed from every response', async () => {
  const { tools } = searchTools();
  fakeModel.reply(respond.toolCall('search', { query: 'refund policy', page: 1 }), respond.toolCall('search', { query: 'refund policy', page: 2 }), respond.text('Refunds take 5 days.'));
  const result = await mod.runBudgetedAgent(createModel(), { task: 'How long do refunds take?', tools, budget: { maxSteps: 10, maxTokens: 100000, maxCostUsd: 1, maxDurationMs: 60000 } });
  expect(result.stop.reason).toBe('done');
  expect(typeof result.stop.detail).toBe('string');
  expect(result.stop.detail.length).toBeGreaterThan(0);
  expect(result.answer).toBe('Refunds take 5 days.');
  expect(result.usage.steps).toBe(3);
  expect(result.usage.inputTokens).toBe(sumUsage('inputTokens'));
  expect(result.usage.outputTokens).toBe(sumUsage('outputTokens'));
  expect(result.usage.totalTokens).toBe(sumUsage('totalTokens'));
  expect(result.usage.costUsd).toBeCloseTo(sumUsage('cost'), 9);
});

test('max_steps stops before a call that would exceed the step budget', async () => {
  const { tools, search } = searchTools();
  fakeModel.handle(paging());
  const result = await mod.runBudgetedAgent(createModel(), { task: 'Research refunds', tools, budget: { maxSteps: 4 } });
  expect(result.stop.reason).toBe('max_steps');
  expect(result.answer).toBeNull();
  expect(fakeModel.requests).toHaveLength(4);
  expect(result.usage.steps).toBe(4);
  expect(search).toHaveBeenCalledTimes(4);
});

test('max_tokens stops as soon as the total reaches the budget and does not run the tool calls of that response, but a final answer still wins', async () => {
  const { tools, search } = searchTools();
  fakeModel.handle(paging());
  const result = await mod.runBudgetedAgent(createModel(), { task: 'Research refunds', tools, budget: { maxSteps: 10, maxTokens: 1 } });
  expect(result.stop.reason).toBe('max_tokens');
  expect(fakeModel.requests).toHaveLength(1);
  expect(search).not.toHaveBeenCalled();

  fakeModel.reset().reply(respond.text('Refunds take 5 days.'));
  const answered = await mod.runBudgetedAgent(createModel(), { task: 'Research refunds', tools, budget: { maxSteps: 10, maxTokens: 1 } });
  expect(answered.stop.reason).toBe('done');
  expect(answered.answer).toBe('Refunds take 5 days.');
});

test('max_cost reads the cost from usage and stops at the first response that reaches the budget', async () => {
  fakeModel.configure({ pricing: { inputPerMillion: 1000, outputPerMillion: 1000 } });
  fakeModel.handle(paging());
  const { tools, search } = searchTools();
  const result = await mod.runBudgetedAgent(createModel(), { task: 'Research refunds', tools, budget: { maxSteps: 50, maxCostUsd: 0.2 } });
  expect(result.stop.reason).toBe('max_cost');
  const costs = fakeModel.responses.map((response: any) => response.usage.cost);
  const spent = costs.reduce((total: number, cost: number) => total + cost, 0);
  expect(spent).toBeGreaterThanOrEqual(0.2);
  expect(spent - costs[costs.length - 1]).toBeLessThan(0.2);
  expect(result.usage.costUsd).toBeCloseTo(spent, 9);
  expect(search).toHaveBeenCalledTimes(costs.length - 1);
});

test('timeout uses the injected clock and starts no model call after the deadline', async () => {
  let clock = 1000;
  const { tools, search } = searchTools(({ page }) => {
    clock += 400;
    return { page };
  });
  fakeModel.handle(paging());
  const result = await mod.runBudgetedAgent(createModel(), { task: 'Research refunds', tools, budget: { maxSteps: 20, maxDurationMs: 1000 }, now: () => clock });
  expect(result.stop.reason).toBe('timeout');
  expect(fakeModel.requests).toHaveLength(3);
  expect(search).toHaveBeenCalledTimes(3);
  expect(result.elapsedMs).toBe(1200);
});

test('stuck stops when the same call (same name, same arguments in any key order) repeats repeatLimit times in a row, without running the repeat', async () => {
  const { tools, search } = searchTools();
  let flip = false;
  fakeModel.handle(() => {
    flip = !flip;
    return respond.toolCall('search', flip ? { query: 'refund policy', page: 1 } : { page: 1, query: 'refund policy' });
  });
  const result = await mod.runBudgetedAgent(createModel(), { task: 'Research refunds', tools, budget: { maxSteps: 20 } });
  expect(result.stop.reason).toBe('stuck');
  expect(fakeModel.requests).toHaveLength(3);
  expect(search).toHaveBeenCalledTimes(2);

  fakeModel.reset();
  let turn = 0;
  fakeModel.handle(() => (++turn % 2 === 0 ? respond.toolCall('search', { query: 'refunds', page: 1 }) : respond.toolCall('search', { query: 'returns', page: 1 })));
  const alternating = await mod.runBudgetedAgent(createModel(), { task: 'Research refunds', tools, budget: { maxSteps: 6 }, repeatLimit: 2 });
  expect(alternating.stop.reason).toBe('max_steps');

  fakeModel.reset().handle(() => respond.toolCall('search', { query: 'refunds', page: 1 }));
  const strict = await mod.runBudgetedAgent(createModel(), { task: 'Research refunds', tools, budget: { maxSteps: 6 }, repeatLimit: 2 });
  expect(strict.stop.reason).toBe('stuck');
  expect(fakeModel.requests).toHaveLength(2);
});

test('across seeds, every run stays within its budgets and reports usage that matches the responses', async () => {
  const reasons = new Set<string>();
  await forEachSeed(30, async () => {
    fakeModel.configure({ pricing: { inputPerMillion: 1000, outputPerMillion: 1000 } });
    fakeModel.handle(() =>
      respond.oneOf([
        respond.toolCall('search', { query: 'refunds', page: 1 }),
        respond.toolCall('search', { query: 'refunds', page: 2 }),
        respond.toolCall('search', { query: 'returns', page: 1 }),
        respond.text('Refunds take 5 days.'),
        respond.refusal(),
      ]),
    );
    const { tools, search } = searchTools();
    const result = await mod.runBudgetedAgent(createModel(), { task: 'Research refunds', tools, budget: { maxSteps: 6, maxCostUsd: 0.5 }, repeatLimit: 2 });
    reasons.add(result.stop.reason);
    expect(['done', 'refused', 'max_steps', 'max_cost', 'stuck']).toContain(result.stop.reason);
    expect(fakeModel.requests.length).toBeLessThanOrEqual(6);
    expect(result.usage.steps).toBe(fakeModel.requests.length);
    expect(result.usage.costUsd).toBeCloseTo(sumUsage('cost'), 9);
    expect(search).toHaveBeenCalledTimes(toolMessageCount(result.messages));
    expect(result.answer).toBe(result.stop.reason === 'done' ? fakeModel.responses[fakeModel.responses.length - 1].text : null);
  });
  expect(reasons.size).toBeGreaterThanOrEqual(3);
});
