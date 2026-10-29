test('processInChunks returns every result in order and passes the index', async () => {
  const results = await mod.processInChunks(['a', 'b', 'c', 'd', 'e'], (item: string, index: number) => `${index}:${item}`, { chunkSize: 2 });
  expect(results).toEqual(['0:a', '1:b', '2:c', '3:d', '4:e']);
  expect(await mod.processInChunks([], (item: number) => item)).toEqual([]);
});

test('processInChunks yields after every chunk except the last', async () => {
  const yieldToLoop = fn(async () => {});
  await mod.processInChunks(Array.from({ length: 10 }, (_, index) => index), (item: number) => item, { chunkSize: 3, yieldToLoop });
  expect(yieldToLoop).toHaveBeenCalledTimes(3);
  const never = fn(async () => {});
  await mod.processInChunks([1, 2, 3], (item: number) => item, { chunkSize: 3, yieldToLoop: never });
  await mod.processInChunks([], (item: number) => item, { chunkSize: 3, yieldToLoop: never });
  expect(never).not.toHaveBeenCalled();
});

test('with the default yield, a timer runs while the job is still in progress', async () => {
  let processed = 0;
  let processedWhenTimerRan = -1;
  setTimeout(() => {
    processedWhenTimerRan = processed;
  }, 0);
  await mod.processInChunks(Array.from({ length: 5_000 }, (_, index) => index), () => processed++, { chunkSize: 500 });
  expect(processed).toBe(5_000);
  expect(processedWhenTimerRan).toBeGreaterThanOrEqual(0);
  expect(processedWhenTimerRan).toBeLessThan(5_000);
});

test('monitorEventLoopLag measures a blocked loop and stop() ends sampling', async () => {
  const monitor = mod.monitorEventLoopLag(10);
  expect(monitor.maxLag()).toBe(0);
  const blockedUntil = Date.now() + 60;
  while (Date.now() < blockedUntil) {}
  await sleep(35);
  expect(monitor.samples().length).toBeGreaterThan(0);
  expect(monitor.maxLag()).toBeGreaterThanOrEqual(30);
  monitor.stop();
  const count = monitor.samples().length;
  await sleep(35);
  expect(monitor.samples().length).toBe(count);
});

test('the monitor interval is unref()d so it never keeps the process alive', () => {
  expect(source).toMatch(/\.unref\(\s*\)/);
});

test('shedLoad answers 503 while the lag is above the limit and passes requests through otherwise', async () => {
  let lag = 250;
  const handler = fn((req: any, res: any) => res.end('ok'));
  const listener = mod.shedLoad(handler, { maxLagMs: 100, currentLag: () => lag });
  const rejected = await request(listener, '/reports');
  expect(rejected.status).toBe(503);
  expect(rejected.headers['retry-after']).toBe('1');
  expect(rejected.body).toEqual({ error: 'Server overloaded' });
  expect(handler).not.toHaveBeenCalled();
  lag = 20;
  const accepted = await request(listener, '/reports');
  expect(accepted.status).toBe(200);
  expect(accepted.text).toBe('ok');
});
