async function failure(promise: Promise<unknown>): Promise<any> {
  const pending = Symbol('pending');
  let outcome: unknown;
  try {
    outcome = await Promise.race([promise, sleep(300).then(() => pending)]);
  } catch (error) {
    return error;
  }
  throw new Error(outcome === pending ? 'Expected the promise to reject, but it was still pending after 300 ms.' : 'Expected the promise to reject, but it resolved.');
}

test('sleep resolves after the delay and rejects with signal.reason when the signal aborts', async () => {
  await expect(mod.sleep(5)).resolves.toBeUndefined();
  const reason = new Error('stop');
  expect(await failure(mod.sleep(10, AbortSignal.abort(reason)))).toBe(reason);
  const controller = new AbortController();
  const startedAt = Date.now();
  const pending = mod.sleep(1000, controller.signal);
  setTimeout(() => controller.abort(), 10);
  expect((await failure(pending)).name).toBe('AbortError');
  expect(Date.now() - startedAt).toBeLessThan(500);
});

test('withTimeout resolves with the task result and hands the task an AbortSignal', async () => {
  const task = fn(async (signal: AbortSignal) => (signal instanceof AbortSignal && !signal.aborted ? 'report' : 'no signal'));
  await expect(mod.withTimeout(task, 50)).resolves.toBe('report');
  expect(task).toHaveBeenCalledTimes(1);
});

test('withTimeout rejects with a TimeoutError and aborts the signal it passed to a slow task', async () => {
  let received: AbortSignal | undefined;
  const error = await failure(
    mod.withTimeout((signal: AbortSignal) => {
      received = signal;
      return mod.sleep(1000, signal);
    }, 20),
  );
  expect(error.name).toBe('TimeoutError');
  expect(received?.aborted).toBe(true);
});

test('withTimeout still rejects on time when the task ignores the signal', async () => {
  const startedAt = Date.now();
  const error = await failure(mod.withTimeout(() => new Promise(() => {}), 20));
  expect(error.name).toBe('TimeoutError');
  expect(Date.now() - startedAt).toBeLessThan(500);
});

test('withTimeout follows the parent signal through AbortSignal.any', async () => {
  const parent = new AbortController();
  let received: AbortSignal | undefined;
  const pending = mod.withTimeout((signal: AbortSignal) => {
    received = signal;
    return mod.sleep(1000, signal);
  }, 1000, parent.signal);
  setTimeout(() => parent.abort(), 10);
  expect((await failure(pending)).name).toBe('AbortError');
  expect(received?.aborted).toBe(true);
  expect(source).toMatch(/AbortSignal\.timeout\s*\(/);
  expect(source).toMatch(/AbortSignal\.any\s*\(/);
});

test('latestOnly aborts the previous call when a new one starts', async () => {
  const signals: AbortSignal[] = [];
  const search = mod.latestOnly(async (query: string, signal: AbortSignal) => {
    signals.push(signal);
    return query.toUpperCase();
  });
  await expect(search('no')).resolves.toBe('NO');
  await search('nod');
  await search('node');
  expect(signals.map((signal) => signal.aborted)).toEqual([true, true, false]);
});
