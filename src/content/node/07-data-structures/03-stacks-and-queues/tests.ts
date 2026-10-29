test('Queue returns items in FIFO order with peek and size', () => {
  const queue = new mod.Queue();
  expect(queue.dequeue()).toBeUndefined();
  expect(queue.peek()).toBeUndefined();
  queue.enqueue('a');
  queue.enqueue('b');
  queue.enqueue('c');
  expect(queue.size).toBe(3);
  expect(queue.peek()).toBe('a');
  expect(queue.dequeue()).toBe('a');
  expect(queue.peek()).toBe('b');
  expect(queue.size).toBe(2);
  queue.enqueue('d');
  expect([queue.dequeue(), queue.dequeue(), queue.dequeue(), queue.dequeue()]).toEqual(['b', 'c', 'd', undefined]);
  expect(queue.size).toBe(0);
});

test('Queue stays correct over 200 000 interleaved operations', () => {
  const queue = new mod.Queue();
  let next = 0;
  let expected = 0;
  for (let round = 0; round < 1000; round++) {
    for (let index = 0; index < 150; index++) queue.enqueue(next++);
    for (let index = 0; index < 50; index++) {
      if (queue.dequeue() !== expected++) throw new Error(`Wrong item at position ${expected - 1}`);
    }
  }
  expect(queue.size).toBe(100_000);
  expect(queue.peek()).toBe(50_000);
});

test('the queue does not use Array.prototype.shift', () => {
  expect(source).not.toMatch(/\.shift\s*\(/);
});

test('runSteps runs every step in order and resolves with their names', async () => {
  const calls: string[] = [];
  const step = (name: string) => ({ name, up: async () => { calls.push(`up:${name}`); }, down: () => { calls.push(`down:${name}`); } });
  await expect(mod.runSteps([step('user'), step('workspace'), step('billing')])).resolves.toEqual(['user', 'workspace', 'billing']);
  expect(calls).toEqual(['up:user', 'up:workspace', 'up:billing']);
});

test('runSteps undoes completed steps newest first and rethrows the original error', async () => {
  const calls: string[] = [];
  const failure = new Error('Card declined');
  const step = (name: string, fails = false) => ({
    name,
    up: async () => {
      calls.push(`up:${name}`);
      if (fails) throw failure;
    },
    down: async () => { calls.push(`down:${name}`); },
  });
  const outcome = await mod.runSteps([step('user'), step('workspace'), step('charge', true), step('email')]).then(
    () => 'resolved',
    (error: unknown) => error,
  );
  expect(outcome).toBe(failure);
  expect(calls).toEqual(['up:user', 'up:workspace', 'up:charge', 'down:workspace', 'down:user']);
});

test('a failing down is logged and the rollback continues', async () => {
  const logs = captureLogs();
  const undone: string[] = [];
  const steps = [
    { name: 'user', up: () => {}, down: () => { undone.push('user'); } },
    { name: 'workspace', up: () => {}, down: () => { throw new Error('workspace API down'); } },
    { name: 'charge', up: () => { throw new Error('Card declined'); }, down: () => {} },
  ];
  await expect(mod.runSteps(steps)).rejects.toThrow('Card declined');
  expect(undone).toEqual(['user']);
  expect(logs.join('\n')).toMatch(/workspace API down/);
});
