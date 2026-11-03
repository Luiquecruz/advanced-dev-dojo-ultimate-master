const { createModel } = require('@dojo/ai');

const EVENT = { key: 'ci-failure:build-4812', task: 'CI build 4812 failed: cart total test expects 30.00 but got 29.99. Produce a patch.' };
const LIMITS = { maxFailures: 3, budgetUsd: 1 };

function recordingStore() {
  const store = mod.createMemoryStore();
  const saves: Array<{ key: string; state: Record<string, unknown> }> = [];
  return {
    saves,
    load: (key: string) => store.load(key),
    async save(key: string, state: Record<string, unknown>) {
      saves.push({ key, state: JSON.parse(JSON.stringify(state)) });
      await store.save(key, state);
    },
  };
}

function patchVerifier(goodPatch = 'PATCH: round half up') {
  return fn((output: string) => (output === goodPatch ? { passed: true, feedback: '' } : { passed: false, feedback: `tests still fail for "${output}"` }));
}

function deps(extra: Record<string, unknown> = {}) {
  return { model: createModel(), store: recordingStore(), verify: patchVerifier(), escalate: fn(async () => {}), limits: LIMITS, ...extra };
}

const userContents = () => fakeModel.requests.map((request: { messages: Array<{ role: string; content: string }> }) => request.messages.find((message) => message.role === 'user')!.content);

test('stopReason applies done, stuck, failures and budget in that order', () => {
  const limits = { maxFailures: 3, budgetUsd: 0.5 };
  expect(mod.stopReason({ passed: true, stuck: true, failures: 9, spentUsd: 9 }, limits)).toBe('done');
  expect(mod.stopReason({ passed: false, stuck: true, failures: 9, spentUsd: 9 }, limits)).toBe('stuck');
  expect(mod.stopReason({ passed: false, stuck: false, failures: 3, spentUsd: 9 }, limits)).toBe('failures');
  expect(mod.stopReason({ passed: false, stuck: false, failures: 2, spentUsd: 0.5 }, limits)).toBe('budget');
  expect(mod.stopReason({ passed: false, stuck: false, failures: 2, spentUsd: 0.49 }, limits)).toBe(null);
});

test('acts, verifies and feeds the last feedback into the next iteration until the verifier passes', async () => {
  fakeModel.reply(respond.text('PATCH: truncate'), respond.text('PATCH: use floats'), respond.text('PATCH: round half up'));
  const dependencies = deps();
  const state = await mod.handleTrigger(EVENT, dependencies);
  expect(state).toEqual({
    key: EVENT.key,
    status: 'done',
    iterations: 3,
    failures: 2,
    spentUsd: state.spentUsd,
    lastOutput: 'PATCH: round half up',
    lastFeedback: 'tests still fail for "PATCH: use floats"',
    escalationReason: null,
  });
  expect(state.spentUsd).toBeCloseTo(fakeModel.responses.reduce((total: number, response: { usage: { cost: number } }) => total + response.usage.cost, 0), 12);
  expect(fakeModel.requests[0].messages).toEqual([
    { role: 'system', content: mod.LOOP_SYSTEM },
    { role: 'user', content: EVENT.task },
  ]);
  const contents = userContents();
  expect(contents.every((content: string) => content.includes(EVENT.task))).toBe(true);
  expect(contents[1]).toContain('tests still fail for "PATCH: truncate"');
  expect(contents[2]).toContain('tests still fail for "PATCH: use floats"');
  expect(dependencies.verify.mock.calls.map(([output, event]: [string, unknown]) => [output, event])).toEqual([
    ['PATCH: truncate', EVENT],
    ['PATCH: use floats', EVENT],
    ['PATCH: round half up', EVENT],
  ]);
  expect(dependencies.store.saves.map((save: { state: { iterations: number; status: string } }) => [save.state.iterations, save.state.status])).toEqual([[1, 'running'], [2, 'running'], [3, 'done']]);
  expect(dependencies.escalate).not.toHaveBeenCalled();
});

test('escalates once after maxFailures failed iterations, and earlier when the output repeats', async () => {
  fakeModel.reply(respond.text('PATCH: a'), respond.text('PATCH: b'), respond.text('PATCH: c'), respond.text('PATCH: round half up'));
  const failing = deps();
  const state = await mod.handleTrigger(EVENT, failing);
  expect([state.status, state.escalationReason, state.iterations, state.failures]).toEqual(['escalated', 'failures', 3, 3]);
  expect(fakeModel.requests).toHaveLength(3);
  expect(failing.escalate).toHaveBeenCalledTimes(1);
  const escalation = failing.escalate.mock.calls[0][0];
  expect([escalation.key, escalation.reason, escalation.state.status, escalation.state.lastOutput]).toEqual([EVENT.key, 'failures', 'escalated', 'PATCH: c']);
  expect(failing.store.saves.at(-1).state).toEqual(escalation.state);

  fakeModel.reset().reply(respond.text('PATCH: a'), respond.text('PATCH: a'), respond.text('PATCH: round half up'));
  const repeating = deps({ limits: { maxFailures: 5, budgetUsd: 1 } });
  const stuck = await mod.handleTrigger(EVENT, repeating);
  expect([stuck.status, stuck.escalationReason, stuck.iterations]).toEqual(['escalated', 'stuck', 2]);
  expect(repeating.escalate.mock.calls[0][0].reason).toBe('stuck');
});

test('stops on budget using the cost the provider reported', async () => {
  fakeModel.configure({ pricing: { inputPerMillion: 20000, outputPerMillion: 20000 } });
  let attempt = 0;
  fakeModel.handle(() => respond.text(`PATCH: attempt ${++attempt}`));
  const costly = deps({ verify: fn(() => ({ passed: false, feedback: `failed after ${fakeModel.requests.length} calls` })), limits: { maxFailures: 50, budgetUsd: 4 } });
  const state = await mod.handleTrigger(EVENT, costly);
  const costs = fakeModel.responses.map((response: { usage: { cost: number } }) => response.usage.cost);
  const total = costs.reduce((sum: number, cost: number) => sum + cost, 0);
  expect([state.status, state.escalationReason]).toEqual(['escalated', 'budget']);
  expect(state.spentUsd).toBeCloseTo(total, 9);
  expect(total).toBeGreaterThanOrEqual(4);
  expect(total - costs.at(-1)).toBeLessThan(4);
  expect(state.iterations).toBe(costs.length);
});

test('a model outage counts as a failed iteration without spending or changing the last output', async () => {
  fakeModel.reply(respond.text('PATCH: truncate'), respond.error(503), respond.error(429, { retryAfterMs: 5 }), respond.text('PATCH: round half up'));
  const dependencies = deps({ limits: { maxFailures: 4, budgetUsd: 1 } });
  const state = await mod.handleTrigger(EVENT, dependencies);
  expect([state.status, state.iterations, state.failures]).toEqual(['done', 4, 3]);
  expect(dependencies.verify).toHaveBeenCalledTimes(2);
  const second = dependencies.store.saves[1].state;
  expect([second.lastOutput, second.iterations, second.failures]).toEqual(['PATCH: truncate', 2, 2]);
  expect(second.lastFeedback).toContain('overloaded');
  expect(second.spentUsd).toBeCloseTo(fakeModel.responses[0].usage.cost, 12);
  expect(userContents()[3]).toContain('rate_limit');
});

test('resumes a crashed run from the saved state and never re-runs a finished key', async () => {
  const store = recordingStore();
  fakeModel.reply(respond.text('PATCH: truncate'), respond.text('PATCH: use floats'));
  let calls = 0;
  const crashingVerify = (output: string) => {
    calls += 1;
    if (calls === 2) throw new Error('worker killed');
    return { passed: false, feedback: `tests still fail for "${output}"` };
  };
  const crash = await captureError(mod.handleTrigger(EVENT, deps({ store, verify: crashingVerify })));
  expect(crash.message).toBe('worker killed');
  const saved = await store.load(EVENT.key);
  expect([saved.status, saved.iterations, saved.failures, saved.lastOutput]).toEqual(['running', 1, 1, 'PATCH: truncate']);

  fakeModel.reply(respond.text('PATCH: round half up'));
  const resumed = await mod.handleTrigger(EVENT, deps({ store }));
  expect([resumed.status, resumed.iterations, resumed.failures]).toEqual(['done', 2, 1]);
  expect(resumed.spentUsd).toBeCloseTo(saved.spentUsd + fakeModel.responses[2].usage.cost, 12);
  expect(userContents()[2]).toContain('tests still fail for "PATCH: truncate"');

  const requestsBefore = fakeModel.requests.length;
  const savesBefore = store.saves.length;
  const duplicate = deps({ store });
  expect(await mod.handleTrigger(EVENT, duplicate)).toEqual(resumed);
  expect(fakeModel.requests.length).toBe(requestsBefore);
  expect(store.saves.length).toBe(savesBefore);
  expect(duplicate.escalate).not.toHaveBeenCalled();

  fakeModel.reply(respond.text('PATCH: a'));
  const escalatedStore = recordingStore();
  await escalatedStore.save('nightly:flaky-tests', { key: 'nightly:flaky-tests', status: 'escalated', iterations: 3, failures: 3, spentUsd: 0.2, lastOutput: 'x', lastFeedback: 'y', escalationReason: 'failures' });
  const again = deps({ store: escalatedStore });
  expect((await mod.handleTrigger({ key: 'nightly:flaky-tests', task: 'Fix flaky tests' }, again)).status).toBe('escalated');
  expect(again.escalate).not.toHaveBeenCalled();
  expect(fakeModel.pending).toBe(1);
});

test('keeps its invariants across every mix of answers and outages', async () => {
  await forEachSeed(20, async () => {
    fakeModel.handle(() =>
      respond.oneOf([respond.text('PATCH: round half up'), respond.text('PATCH: truncate'), respond.text(['PATCH: use floats', 'PATCH: use cents']), respond.error(500)]),
    );
    const dependencies = deps();
    const state = await mod.handleTrigger(EVENT, dependencies);
    expect(['done', 'escalated']).toContain(state.status);
    expect(state.iterations).toBe(fakeModel.requests.length);
    expect(state.failures).toBeLessThanOrEqual(LIMITS.maxFailures);
    expect(state.spentUsd).toBeCloseTo(fakeModel.responses.reduce((total: number, response: { usage: { cost: number } }) => total + response.usage.cost, 0), 12);
    expect(dependencies.store.saves.length).toBe(state.iterations);
    expect(dependencies.escalate).toHaveBeenCalledTimes(state.status === 'escalated' ? 1 : 0);
    if (state.status === 'done') expect(state.lastOutput).toBe('PATCH: round half up');
    else expect(['failures', 'stuck']).toContain(state.escalationReason);
  });
});
