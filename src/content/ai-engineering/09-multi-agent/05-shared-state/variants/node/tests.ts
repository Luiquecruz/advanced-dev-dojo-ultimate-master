const { createModel } = require('@dojo/ai');

const OWNERS = { plan: 'lead', 'findings:*': 'researcher', 'findings:pricing': 'analyst', draft: 'editor' };

type Request = { messages: Array<{ role: string; content: string }> };
const userOf = (request: Request) => request.messages.find((message) => message.role === 'user')!.content;

test('ownerOf prefers an exact key, then the longest matching prefix pattern, and returns null for unowned keys', () => {
  expect(mod.ownerOf(OWNERS, 'plan')).toBe('lead');
  expect(mod.ownerOf(OWNERS, 'findings:latency')).toBe('researcher');
  expect(mod.ownerOf(OWNERS, 'findings:pricing')).toBe('analyst');
  expect(mod.ownerOf({ 'a:*': 'short', 'a:b:*': 'long' }, 'a:b:c')).toBe('long');
  expect(mod.ownerOf(OWNERS, 'budget')).toBe(null);
  expect(mod.ownerOf(OWNERS, 'findings')).toBe(null);
});

test('only the owner writes, and only with the version it read', () => {
  const board = mod.createBlackboard(OWNERS);
  expect(board.read('plan')).toEqual({ key: 'plan', value: null, version: 0, writer: null });
  expect(board.write('lead', 'plan', { steps: ['pricing', 'latency'] }, 0)).toEqual({ ok: true, version: 1 });
  expect(board.read('plan')).toEqual({ key: 'plan', value: { steps: ['pricing', 'latency'] }, version: 1, writer: 'lead' });
  expect(board.write('researcher', 'plan', { steps: [] }, 1)).toEqual({ ok: false, reason: 'not_owner', currentVersion: 1 });
  expect(board.write('lead', 'plan', { steps: ['pricing'] }, 0)).toEqual({ ok: false, reason: 'version_conflict', currentVersion: 1 });
  expect(board.write('lead', 'plan', { steps: ['pricing'] }, 2)).toEqual({ ok: false, reason: 'version_conflict', currentVersion: 1 });
  expect(board.write('lead', 'plan', { steps: ['pricing', 'latency', 'support'] }, 1)).toEqual({ ok: true, version: 2 });
  expect(board.write('intruder', 'budget', 10, 0)).toEqual({ ok: false, reason: 'not_owner', currentVersion: 0 });
  expect(board.write('lead', 'findings:latency', 'fast', 0).ok).toBe(false);
  expect(board.write('researcher', 'findings:latency', 'p95 120 ms', 0)).toEqual({ ok: true, version: 1 });
  expect(board.read('plan').value).toEqual({ steps: ['pricing', 'latency', 'support'] });
});

test('reads, snapshots and the log are copies that cannot change the board', () => {
  const board = mod.createBlackboard(OWNERS);
  const plan = { steps: ['pricing'] };
  board.write('lead', 'plan', plan, 0);
  plan.steps.push('mutated after write');
  const read = board.read('plan');
  read.value.steps.push('mutated after read');
  const snapshot = board.snapshot();
  snapshot.plan.steps.push('mutated snapshot');
  snapshot.extra = true;
  const log = board.log();
  log.push({ sequence: 99 });
  log[0].value.steps.push('mutated log');
  log[0].accepted = false;
  expect(board.read('plan').value).toEqual({ steps: ['pricing'] });
  expect(board.snapshot()).toEqual({ plan: { steps: ['pricing'] } });
  expect(board.log()).toHaveLength(1);
  expect(board.log()[0]).toMatchObject({ accepted: true, value: { steps: ['pricing'] } });
});

test('logs every attempt in order, accepted or rejected, and rebuild replays only accepted writes', () => {
  const board = mod.createBlackboard(OWNERS);
  board.write('lead', 'plan', 'v1', 0);
  board.write('researcher', 'plan', 'hijack', 1);
  board.write('editor', 'draft', 'first draft', 0);
  board.write('editor', 'draft', 'stale edit', 0);
  board.write('lead', 'plan', 'v2', 1);
  const log = board.log();
  expect(log).toEqual([
    { sequence: 1, agent: 'lead', key: 'plan', value: 'v1', expectedVersion: 0, accepted: true, reason: null, version: 1 },
    { sequence: 2, agent: 'researcher', key: 'plan', value: 'hijack', expectedVersion: 1, accepted: false, reason: 'not_owner', version: 1 },
    { sequence: 3, agent: 'editor', key: 'draft', value: 'first draft', expectedVersion: 0, accepted: true, reason: null, version: 1 },
    { sequence: 4, agent: 'editor', key: 'draft', value: 'stale edit', expectedVersion: 0, accepted: false, reason: 'version_conflict', version: 1 },
    { sequence: 5, agent: 'lead', key: 'plan', value: 'v2', expectedVersion: 1, accepted: true, reason: null, version: 2 },
  ]);
  expect(mod.rebuild(log)).toEqual({ plan: 'v2', draft: 'first draft' });
  expect(mod.rebuild([...log].reverse())).toEqual(board.snapshot());
  expect(mod.rebuild([])).toEqual({});
});

test('contributeWithModel gives the model the current values and writes its reply with the version it read', async () => {
  const board = mod.createBlackboard(OWNERS);
  board.write('lead', 'plan', 'Compare Nimbus and Quill on pricing.', 0);
  board.write('analyst', 'findings:pricing', 'Nimbus $0.30/GB, Quill $0.25/GB', 0);
  fakeModel.reply(respond.text('Draft: Quill is cheaper per GB.'));
  const result = await mod.contributeWithModel('editor', 'draft', 'Write the comparison draft.', { board, model: createModel(), readKeys: ['plan', 'findings:pricing'], maxAttempts: 3 });
  expect(result).toEqual({ ok: true, version: 1, attempts: 1 });
  expect(board.read('draft')).toEqual({ key: 'draft', value: 'Draft: Quill is cheaper per GB.', version: 1, writer: 'editor' });
  expect(fakeModel.requests[0].messages[0]).toEqual({ role: 'system', content: mod.CONTRIBUTOR_SYSTEM });
  const content = userOf(fakeModel.requests[0]);
  ['Write the comparison draft.', 'Compare Nimbus and Quill on pricing.', 'Nimbus $0.30/GB, Quill $0.25/GB'].forEach((part) => expect(content).toContain(part));
});

test('a concurrent write turns into a conflict that is retried with the fresh value, never a lost update', async () => {
  const board = mod.createBlackboard(OWNERS);
  board.write('editor', 'draft', 'v1: outline', 0);
  let calls = 0;
  fakeModel.handle(() => {
    calls += 1;
    if (calls === 1) board.write('editor', 'draft', 'v2: another editor added a pricing table', 1);
    return respond.text(`edit ${calls}`);
  });
  const result = await mod.contributeWithModel('editor', 'draft', 'Tighten the draft.', { board, model: createModel(), readKeys: [], maxAttempts: 3 });
  expect(result).toEqual({ ok: true, version: 3, attempts: 2 });
  expect(userOf(fakeModel.requests[1])).toContain('v2: another editor added a pricing table');
  expect(board.log().map((entry: { value: string; accepted: boolean; reason: string | null }) => [entry.value, entry.accepted, entry.reason])).toEqual([
    ['v1: outline', true, null],
    ['v2: another editor added a pricing table', true, null],
    ['edit 1', false, 'version_conflict'],
    ['edit 2', true, null],
  ]);

  fakeModel.reset().handle(() => {
    const current = board.read('draft');
    board.write('editor', 'draft', `interference at ${current.version}`, current.version);
    return respond.text('always late');
  });
  const exhausted = await mod.contributeWithModel('editor', 'draft', 'Tighten the draft.', { board, model: createModel(), readKeys: [], maxAttempts: 2 });
  expect(exhausted).toEqual({ ok: false, reason: 'version_conflict', attempts: 2 });
});

test('an agent writing a key it does not own fails at once without retrying', async () => {
  const board = mod.createBlackboard(OWNERS);
  fakeModel.reply(respond.text('My plan'), respond.text('My plan again'));
  const result = await mod.contributeWithModel('researcher', 'plan', 'Rewrite the plan.', { board, model: createModel(), readKeys: [], maxAttempts: 3 });
  expect(result).toEqual({ ok: false, reason: 'not_owner', attempts: 1 });
  expect(fakeModel.requests).toHaveLength(1);
  expect(board.read('plan').version).toBe(0);
});

test('concurrent contributors never lose an update, whatever the timing', async () => {
  await forEachSeed(15, async () => {
    const board = mod.createBlackboard(OWNERS);
    let reply = 0;
    fakeModel.handle(() => {
      reply += 1;
      return respond.oneOf([respond.slow(1, respond.text(`edit ${reply}`)), respond.slow(4, respond.text(`edit ${reply}`)), respond.text(`edit ${reply}`)]);
    });
    const options = { board, model: createModel(), readKeys: [], maxAttempts: 6 };
    const results = await Promise.all([1, 2, 3, 4].map((index) => mod.contributeWithModel('editor', 'draft', `Edit ${index}`, options)));
    const accepted = board.log().filter((entry: { accepted: boolean }) => entry.accepted);
    expect(accepted.length).toBe(results.filter((result: { ok: boolean }) => result.ok).length);
    expect(results.some((result: { ok: boolean }) => result.ok)).toBe(true);
    accepted.forEach((entry: { expectedVersion: number; version: number }, index: number) => {
      expect(entry.expectedVersion).toBe(index);
      expect(entry.version).toBe(index + 1);
    });
    expect(board.read('draft').version).toBe(accepted.length);
    expect(board.read('draft').value).toBe(accepted.at(-1).value);
    expect(mod.rebuild(board.log())).toEqual(board.snapshot());
    expect(fakeModel.requests.length).toBe(results.reduce((total: number, result: { attempts: number }) => total + result.attempts, 0));
  });
});
