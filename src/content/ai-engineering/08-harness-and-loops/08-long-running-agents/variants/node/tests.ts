const { createModel } = require('@dojo/ai');

const DIRECTORY = '/app/checkout-rewrite';
const PLAN = [
  { id: 'cart-model', title: 'Cart model with line items' },
  { id: 'totals', title: 'Totals with tax and discounts' },
  { id: 'checkout-api', title: 'POST /checkout endpoint' },
  { id: 'receipt-email', title: 'Receipt email after payment' },
];

const taskIdOf = (request: { messages: Array<{ role: string; content: string }> }) => /^Task (\S+):/.exec(request.messages.find((message) => message.role === 'user')!.content)?.[1];
const requestedIds = () => fakeModel.requests.map(taskIdOf);
const progressLines = () => fs.readFileSync(`${DIRECTORY}/progress.md`, 'utf8').split('\n').filter(Boolean);
const tasksOnDisk = () => JSON.parse(fs.readFileSync(`${DIRECTORY}/tasks.json`, 'utf8'));

function answerEveryTask() {
  fakeModel.handle((request: { messages: Array<{ role: string; content: string }> }) => respond.text(`IMPLEMENTED ${taskIdOf(request)}`));
}

const passWhenImplemented = (task: { id: string }, output: string) => ({ passed: output === `IMPLEMENTED ${task.id}`, feedback: `tests for ${task.id} fail` });

function options(extra: Record<string, unknown> = {}) {
  return { model: createModel(), verify: passWhenImplemented, sessionId: 's1', maxTasks: 10, maxAttempts: 3, ...extra };
}

test('initializeProject writes the plan once and never overwrites existing progress', () => {
  expect(mod.initializeProject(DIRECTORY, PLAN)).toBe(true);
  expect(tasksOnDisk()).toEqual(PLAN.map((task) => ({ ...task, status: 'pending', attempts: 0 })));
  expect(progressLines()[0]).toBe('# Progress');

  const tasks = tasksOnDisk();
  tasks[0].status = 'done';
  fs.writeFileSync(`${DIRECTORY}/tasks.json`, JSON.stringify(tasks));
  fs.appendFileSync(`${DIRECTORY}/progress.md`, '- [done] cart-model (session s1)\n');
  expect(mod.initializeProject(DIRECTORY, [{ id: 'other', title: 'A different plan' }])).toBe(false);
  expect(tasksOnDisk()[0].status).toBe('done');
  expect(tasksOnDisk().map((task: { id: string }) => task.id)).toEqual(PLAN.map((task) => task.id));
  expect(progressLines()).toHaveLength(2);
});

test('readTasks and nextTask pick the first pending task, skipping done and blocked ones', () => {
  mod.initializeProject(DIRECTORY, PLAN);
  const tasks = mod.readTasks(DIRECTORY);
  expect(mod.nextTask(tasks).id).toBe('cart-model');
  tasks[0].status = 'done';
  tasks[1].status = 'blocked';
  expect(mod.nextTask(tasks).id).toBe('checkout-api');
  tasks[2].status = 'done';
  tasks[3].status = 'done';
  expect(mod.nextTask(tasks)).toBe(undefined);
});

test('sessions resume from the files: each picks the next unfinished task and none redoes completed work', async () => {
  mod.initializeProject(DIRECTORY, PLAN);
  answerEveryTask();
  expect(await mod.runSession(DIRECTORY, options({ sessionId: 's1', maxTasks: 2 }))).toEqual({ completed: ['cart-model', 'totals'], blocked: [], remaining: 2 });
  expect(tasksOnDisk().map((task: { status: string }) => task.status)).toEqual(['done', 'done', 'pending', 'pending']);
  expect(requestedIds()).toEqual(['cart-model', 'totals']);

  expect(await mod.runSession(DIRECTORY, options({ sessionId: 's2', maxTasks: 2 }))).toEqual({ completed: ['checkout-api', 'receipt-email'], blocked: [], remaining: 0 });
  expect(await mod.runSession(DIRECTORY, options({ sessionId: 's3', maxTasks: 2 }))).toEqual({ completed: [], blocked: [], remaining: 0 });
  expect(requestedIds()).toEqual(['cart-model', 'totals', 'checkout-api', 'receipt-email']);
  expect(progressLines().filter((line: string) => line.startsWith('- [done]'))).toEqual([
    '- [done] cart-model (session s1)',
    '- [done] totals (session s1)',
    '- [done] checkout-api (session s2)',
    '- [done] receipt-email (session s2)',
  ]);
  expect(fs.existsSync(`${DIRECTORY}/tasks.json.tmp`)).toBe(false);
});

test('a new session gets up to speed from the tail of the progress file', async () => {
  mod.initializeProject(DIRECTORY, PLAN);
  answerEveryTask();
  await mod.runSession(DIRECTORY, options({ sessionId: 'monday', maxTasks: 1 }));
  for (let index = 0; index < 30; index++) fs.appendFileSync(`${DIRECTORY}/progress.md`, `- [note] observation ${index}\n`);
  await mod.runSession(DIRECTORY, options({ sessionId: 'tuesday', maxTasks: 1 }));
  const request = fakeModel.requests[1];
  expect(request.messages[0]).toEqual({ role: 'system', content: mod.SESSION_SYSTEM });
  const content = request.messages[1].content;
  expect(content.startsWith('Task totals: Totals with tax and discounts')).toBe(true);
  expect(content).toContain('- [note] observation 29');
  expect(content).toContain('- [note] observation 10');
  expect(content).not.toContain('- [note] observation 9\n');
  expect(content).not.toContain('(session monday)');
  expect(fakeModel.requests[0].messages[1].content).toContain('# Progress');
});

test('failed verifications count attempts, are logged with feedback, and block the task at maxAttempts without blocking the session', async () => {
  mod.initializeProject(DIRECTORY, PLAN);
  fakeModel.handle((request: { messages: Array<{ role: string; content: string }> }) => {
    const id = taskIdOf(request);
    return respond.text(id === 'totals' ? 'IMPLEMENTED something else' : `IMPLEMENTED ${id}`);
  });
  const result = await mod.runSession(DIRECTORY, options({ maxAttempts: 2 }));
  expect(result).toEqual({ completed: ['cart-model', 'checkout-api', 'receipt-email'], blocked: ['totals'], remaining: 0 });
  expect(requestedIds()).toEqual(['cart-model', 'totals', 'totals', 'checkout-api', 'receipt-email']);
  expect(tasksOnDisk()[1]).toEqual({ id: 'totals', title: 'Totals with tax and discounts', status: 'blocked', attempts: 2 });
  expect(progressLines().filter((line: string) => line.includes('totals'))).toEqual(['- [retry] totals: tests for totals fail', '- [retry] totals: tests for totals fail', '- [blocked] totals']);
  expect(fakeModel.requests[2].messages[1].content).toContain('- [retry] totals: tests for totals fail');

  const next = await mod.runSession(DIRECTORY, options({ sessionId: 's2' }));
  expect(next).toEqual({ completed: [], blocked: [], remaining: 0 });
  expect(fakeModel.requests).toHaveLength(5);
});

test('a crash keeps everything saved before it, and the next session resumes at the same task', async () => {
  mod.initializeProject(DIRECTORY, PLAN);
  fakeModel.reply(respond.text('IMPLEMENTED cart-model'), respond.text('wrong'), respond.error(500));
  const crash = await captureError(mod.runSession(DIRECTORY, options({ sessionId: 'crashed' })));
  expect(crash.status).toBe(500);
  expect(tasksOnDisk().map((task: { status: string; attempts: number }) => [task.status, task.attempts])).toEqual([['done', 0], ['pending', 1], ['pending', 0], ['pending', 0]]);
  expect(fs.existsSync(`${DIRECTORY}/tasks.json.tmp`)).toBe(false);

  answerEveryTask();
  const resumed = await mod.runSession(DIRECTORY, options({ sessionId: 'resumed' }));
  expect(resumed).toEqual({ completed: ['totals', 'checkout-api', 'receipt-email'], blocked: [], remaining: 0 });
  expect(requestedIds()).toEqual(['cart-model', 'totals', 'totals', 'totals', 'checkout-api', 'receipt-email']);
  expect(tasksOnDisk()[1].attempts).toBe(1);
});

test('across random outcomes and many sessions, every task ends done or blocked exactly once and the plan never changes shape', async () => {
  await forEachSeed(12, async () => {
    fs.rmSync(DIRECTORY, { recursive: true, force: true });
    mod.initializeProject(DIRECTORY, PLAN);
    fakeModel.handle((request: { messages: Array<{ role: string; content: string }> }) =>
      respond.oneOf([respond.text(`IMPLEMENTED ${taskIdOf(request)}`), respond.text('not quite'), respond.text(`IMPLEMENTED ${taskIdOf(request)}`)]),
    );
    const seenDone = new Set<string>();
    for (let session = 1; session <= 8; session++) {
      const before = fakeModel.requests.length;
      const result = await mod.runSession(DIRECTORY, options({ sessionId: `s${session}`, maxTasks: 1, maxAttempts: 2 }));
      fakeModel.requests.slice(before).forEach((request: { messages: Array<{ role: string; content: string }> }) => expect(seenDone.has(taskIdOf(request)!)).toBe(false));
      result.completed.forEach((id: string) => seenDone.add(id));
      expect(result.completed.length).toBeLessThanOrEqual(1);
    }
    const tasks = tasksOnDisk();
    expect(tasks.map(({ id, title }: { id: string; title: string }) => ({ id, title }))).toEqual(PLAN);
    tasks.forEach((task: { id: string; status: string; attempts: number }) => {
      expect(['done', 'blocked']).toContain(task.status);
      expect(task.attempts).toBeLessThanOrEqual(2);
      const doneLines = progressLines().filter((line: string) => line.startsWith(`- [done] ${task.id} `));
      expect(doneLines).toHaveLength(task.status === 'done' ? 1 : 0);
    });
  });
});
