const withTimeout = (promise: Promise<unknown>, ms = 1_000) =>
  Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error('onIdle() never resolved')), ms))]);

test('add returns increasing ids and every job completes before onIdle resolves', async () => {
  const seen: string[] = [];
  const queue = new mod.JobQueue(async (data: string) => {
    await sleep(2);
    seen.push(data);
  });
  expect([queue.add('a'), queue.add('b'), queue.add('c')]).toEqual([1, 2, 3]);
  await withTimeout(queue.onIdle());
  expect(seen).toEqual(['a', 'b', 'c']);
  expect(queue.completed.map((job: any) => [job.id, job.attempts])).toEqual([[1, 1], [2, 1], [3, 1]]);
  await withTimeout(queue.onIdle());
});

test('never runs more than concurrency handlers at the same time', async () => {
  let active = 0;
  let peak = 0;
  const queue = new mod.JobQueue(
    async () => {
      active++;
      peak = Math.max(peak, active);
      await sleep(5);
      active--;
    },
    { concurrency: 3 },
  );
  for (let index = 0; index < 10; index++) queue.add(index);
  await withTimeout(queue.onIdle());
  expect(peak).toBe(3);
  expect(queue.completed.length).toBe(10);
});

test('a failing job is retried until it succeeds and attempts is visible to the handler', async () => {
  const attemptsSeen: number[] = [];
  const queue = new mod.JobQueue(async (_data: unknown, job: any) => {
    attemptsSeen.push(job.attempts);
    if (job.attempts < 3) throw new Error('Partner API timeout');
  });
  queue.add({ invoiceId: 'inv_1' });
  await withTimeout(queue.onIdle());
  expect(attemptsSeen).toEqual([1, 2, 3]);
  expect(queue.completed.length).toBe(1);
  expect(queue.completed[0].attempts).toBe(3);
  expect(queue.failed).toEqual([]);
});

test('after maxAttempts the job moves to failed with the last error message', async () => {
  const handler = fn(async () => {
    throw new Error('Mailbox does not exist');
  });
  const queue = new mod.JobQueue(handler, { maxAttempts: 2 });
  queue.add({ to: 'nobody@invalid' });
  await withTimeout(queue.onIdle());
  expect(handler).toHaveBeenCalledTimes(2);
  expect(queue.completed).toEqual([]);
  expect(queue.failed).toEqual([{ id: 1, data: { to: 'nobody@invalid' }, attempts: 2, error: 'Mailbox does not exist' }]);
});

test('a job waiting for its retry delay does not hold a slot, and onIdle waits for it', async () => {
  const calls: string[] = [];
  const queue = new mod.JobQueue(
    async (name: string, job: any) => {
      calls.push(name);
      if (name === 'flaky' && job.attempts === 1) throw new Error('503');
    },
    { concurrency: 1, retryDelay: () => 30 },
  );
  queue.add('flaky');
  queue.add('steady');
  await sleep(10);
  expect(calls).toEqual(['flaky', 'steady']);
  const startedAt = Date.now();
  await withTimeout(queue.onIdle());
  expect(Date.now() - startedAt).toBeGreaterThanOrEqual(10);
  expect(calls).toEqual(['flaky', 'steady', 'flaky']);
  expect(queue.completed.map((job: any) => job.data)).toEqual(['steady', 'flaky']);
});
