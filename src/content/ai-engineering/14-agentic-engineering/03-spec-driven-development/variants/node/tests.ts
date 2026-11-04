const { createModel } = require('@dojo/ai');

const SPEC = `# Spec: Password reset

Users who forget their password reset it by email. REQ-9 was removed in review.

## Requirements
- REQ-1: A user can request a reset link with their email address.
- REQ-2: A reset link expires 30 minutes after it is issued.
  * REQ-3:   A used link cannot be used again.
- REQ-4: The response never reveals whether an email address has an account.

## Out of scope
- Resetting by SMS.`;

const TASKS = `## Tasks
- [x] TASK-1: Add the reset request endpoint (REQ-1, REQ-4, REQ-1)
- [ ] TASK-2: Store reset tokens with an expiry (REQ-2)
* [X] TASK-3: Add a dark mode toggle
- [ ] TASK-4: Migrate the legacy tokens table (REQ-7)
- Talk to the design team about TASK-5 later`;

const TESTS = [
  'TASK-1 sends a reset email to a known address',
  'REQ-4: answers the same way for unknown addresses',
  'TASK-2 rejects a token after 30 minutes',
  'renders the reset form',
  'TASK-9 cleans up expired tokens',
  'REQ-12 rate limits reset requests',
];

const PLAN = {
  tasks: [
    { id: 'TASK-1', text: 'Add the reset request endpoint', requirements: ['REQ-1', 'REQ-4'] },
    { id: 'TASK-2', text: 'Store reset tokens with an expiry', requirements: ['REQ-2'] },
    { id: 'TASK-3', text: 'Mark tokens as used', requirements: ['REQ-3'] },
  ],
};

test('parseRequirements reads REQ list items in order, ignores prose and other items, and rejects duplicate ids', async () => {
  expect(mod.parseRequirements(SPEC)).toEqual([
    { id: 'REQ-1', text: 'A user can request a reset link with their email address.' },
    { id: 'REQ-2', text: 'A reset link expires 30 minutes after it is issued.' },
    { id: 'REQ-3', text: 'A used link cannot be used again.' },
    { id: 'REQ-4', text: 'The response never reveals whether an email address has an account.' },
  ]);
  expect(mod.parseRequirements('# Empty\n\nNothing here yet.')).toEqual([]);
  const error = await captureError(() => mod.parseRequirements('- REQ-1: Login\n- REQ-2: Logout\n- REQ-1: Login again'));
  expect(error).toBeInstanceOf(mod.SpecError);
  expect(error.message).toContain('REQ-1');
});

test('parseTasks reads checkboxes, task ids and unique requirement references, and rejects duplicate ids', async () => {
  expect(mod.parseTasks(TASKS)).toEqual([
    { id: 'TASK-1', text: 'Add the reset request endpoint (REQ-1, REQ-4, REQ-1)', done: true, requirements: ['REQ-1', 'REQ-4'] },
    { id: 'TASK-2', text: 'Store reset tokens with an expiry (REQ-2)', done: false, requirements: ['REQ-2'] },
    { id: 'TASK-3', text: 'Add a dark mode toggle', done: true, requirements: [] },
    { id: 'TASK-4', text: 'Migrate the legacy tokens table (REQ-7)', done: false, requirements: ['REQ-7'] },
  ]);
  const error = await captureError(() => mod.parseTasks('- [ ] TASK-1: One\n- [x] TASK-1: Two'));
  expect(error).toBeInstanceOf(mod.SpecError);
  expect(error.message).toContain('TASK-1');
});

test('findReferences returns whole requirement and task ids, unique and in order of first appearance', () => {
  expect(mod.findReferences('TASK-2 and REQ-12 cover REQ-1, then TASK-2 again and REQ-1')).toEqual({ requirements: ['REQ-12', 'REQ-1'], tasks: ['TASK-2'] });
  expect(mod.findReferences('XREQ-1, REQ-1a, PRE-TASK-3 and REQ- are not ids')).toEqual({ requirements: [], tasks: [] });
  expect(mod.findReferences('(REQ-3) [TASK-10]: done')).toEqual({ requirements: ['REQ-3'], tasks: ['TASK-10'] });
});

test('buildTraceability builds one row per requirement with the tasks that implement it and the tests that verify it directly or through a task', () => {
  const report = mod.buildTraceability({ spec: SPEC, tasks: TASKS, tests: TESTS });
  expect(report.rows).toEqual([
    { requirement: 'REQ-1', tasks: ['TASK-1'], tests: ['TASK-1 sends a reset email to a known address'], status: 'covered' },
    { requirement: 'REQ-2', tasks: ['TASK-2'], tests: ['TASK-2 rejects a token after 30 minutes'], status: 'covered' },
    { requirement: 'REQ-3', tasks: [], tests: [], status: 'unplanned' },
    { requirement: 'REQ-4', tasks: ['TASK-1'], tests: ['TASK-1 sends a reset email to a known address', 'REQ-4: answers the same way for unknown addresses'], status: 'covered' },
  ]);
  const untested = mod.buildTraceability({ spec: SPEC, tasks: TASKS, tests: ['TASK-1 sends a reset email'] });
  expect(untested.rows.map((row: { status: string }) => row.status)).toEqual(['covered', 'untested', 'unplanned', 'covered']);
  expect(untested.uncoveredRequirements).toEqual(['REQ-2', 'REQ-3']);
});

test('buildTraceability reports uncovered requirements, orphan tasks, tests without a requirement, unknown references and coverage', () => {
  const report = mod.buildTraceability({ spec: SPEC, tasks: TASKS, tests: TESTS });
  expect(report.uncoveredRequirements).toEqual(['REQ-3']);
  expect(report.orphanTasks).toEqual(['TASK-3', 'TASK-4']);
  expect(report.testsWithoutRequirement).toEqual(['renders the reset form', 'TASK-9 cleans up expired tokens', 'REQ-12 rate limits reset requests']);
  expect(report.unknownReferences).toEqual([
    { from: 'TASK-4', id: 'REQ-7' },
    { from: 'TASK-9 cleans up expired tokens', id: 'TASK-9' },
    { from: 'REQ-12 rate limits reset requests', id: 'REQ-12' },
  ]);
  expect(report.coverage).toBeCloseTo(0.75);

  const fromArray = mod.buildTraceability({ spec: SPEC, tasks: mod.parseTasks(TASKS), tests: TESTS });
  expect(fromArray).toEqual(report);
  const empty = mod.buildTraceability({ spec: '# Nothing yet', tasks: '', tests: [] });
  expect(empty).toEqual({ rows: [], uncoveredRequirements: [], orphanTasks: [], testsWithoutRequirement: [], unknownReferences: [], coverage: 0 });
});

test('planTasks asks for a JSON plan, retries a malformed reply with feedback and returns the tasks as not done', async () => {
  await forEachSeed(12, async () => {
    fakeModel.reply(respond.malformedJson(PLAN), respond.json(PLAN));
    const tasks = await mod.planTasks(createModel(), SPEC);
    expect(tasks).toEqual(PLAN.tasks.map((task) => ({ ...task, done: false })));
    expect(fakeModel.requests.length).toBeLessThanOrEqual(2);
    const first = fakeModel.requests[0];
    expect(first.responseFormat).toEqual({ type: 'json' });
    expect(first.messages.some((message: { role: string; content: string }) => message.role === 'user' && message.content.includes('A used link cannot be used again.'))).toBe(true);
    if (fakeModel.requests.length === 2) {
      const retry = fakeModel.requests[1].messages;
      expect(retry.length).toBeGreaterThan(first.messages.length);
      expect(retry.at(-1).role).toBe('user');
      expect(retry.at(-1).content).toContain('Invalid plan');
    }
  });
});

test('planTasks rejects plans with the wrong shape, stops after maxAttempts, and its plan feeds the traceability matrix', async () => {
  fakeModel.reply(respond.json({ tasks: [] }), respond.json({ tasks: [{ id: 'step one', text: 'Do it', requirements: [] }] }), respond.json(PLAN));
  const error = await captureError(mod.planTasks(createModel(), SPEC));
  expect(error).toBeInstanceOf(mod.SpecError);
  expect(fakeModel.requests).toHaveLength(2);

  fakeModel.reset().reply(respond.json({ steps: [] }), respond.json({ tasks: [{ id: 'TASK-1', text: '', requirements: ['REQ-1'] }] }), respond.json({ tasks: [{ id: 'TASK-1', text: 'Endpoint', requirements: 'REQ-1' }] }), respond.json(PLAN));
  expect(await mod.planTasks(createModel(), SPEC, { maxAttempts: 4 })).toHaveLength(3);
  expect(fakeModel.requests).toHaveLength(4);

  fakeModel.reset().reply(respond.json({ tasks: [...PLAN.tasks, { id: 'TASK-4', text: 'Send an SMS code', requirements: ['REQ-8'] }] }));
  const planned = await mod.planTasks(createModel(), SPEC);
  const report = mod.buildTraceability({ spec: SPEC, tasks: planned, tests: [] });
  expect(report.rows.map((row: { status: string }) => row.status)).toEqual(['untested', 'untested', 'untested', 'untested']);
  expect(report.orphanTasks).toEqual(['TASK-4']);
  expect(report.unknownReferences).toEqual([{ from: 'TASK-4', id: 'REQ-8' }]);
});
