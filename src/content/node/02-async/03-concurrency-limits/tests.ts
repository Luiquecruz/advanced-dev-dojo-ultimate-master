function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

test('returns the results in input order even when tasks finish out of order', async () => {
  const delays = [20, 1, 10, 5];
  const results = await mod.mapWithConcurrency(delays, 2, async (delay: number, index: number) => {
    await sleep(delay);
    return `${index}:${delay}`;
  });
  expect(results).toEqual(['0:20', '1:1', '2:10', '3:5']);
});

test('never runs more than `limit` tasks at the same time', async () => {
  let active = 0;
  let peak = 0;
  await mod.mapWithConcurrency([5, 1, 3, 2, 4, 1, 2, 3, 1, 2], 3, async (delay: number) => {
    active++;
    peak = Math.max(peak, active);
    await sleep(delay);
    active--;
  });
  expect(peak).toBe(3);
});

test('starts the next task as soon as any slot frees up (a pool, not batches)', async () => {
  const tasks = [deferred<string>(), deferred<string>(), deferred<string>()];
  const started: number[] = [];
  const pending = mod.mapWithConcurrency([0, 1, 2], 2, (item: number) => {
    started.push(item);
    return tasks[item].promise;
  });
  await sleep(1);
  expect(started).toEqual([0, 1]);
  tasks[1].resolve('b');
  await sleep(1);
  expect(started).toEqual([0, 1, 2]);
  tasks[2].resolve('c');
  tasks[0].resolve('a');
  await expect(pending).resolves.toEqual(['a', 'b', 'c']);
});

test('rejects with the first error and starts no new tasks after it', async () => {
  const started: number[] = [];
  const failure = new Error('item 1 failed');
  const pending = mod.mapWithConcurrency([0, 1, 2, 3, 4], 1, async (item: number) => {
    started.push(item);
    await sleep(1);
    if (item === 1) throw failure;
    return item;
  });
  await expect(pending).rejects.toThrow('item 1 failed');
  await sleep(10);
  expect(started).toEqual([0, 1]);
});

test('handles an empty list and a limit larger than the list', async () => {
  const work = fn(async (item: number) => item * 10);
  await expect(mod.mapWithConcurrency([], 4, work)).resolves.toEqual([]);
  await expect(mod.mapWithConcurrency([1, 2], 10, work)).resolves.toEqual([10, 20]);
  expect(work).toHaveBeenCalledTimes(2);
});

test('rejects with RangeError "limit must be a positive integer" for 0, negative or fractional limits', async () => {
  for (const limit of [0, -1, 1.5]) {
    await expect(mod.mapWithConcurrency([1], limit, async (item: number) => item)).rejects.toThrow('limit must be a positive integer');
  }
  await expect(mod.mapWithConcurrency([1], 0, async (item: number) => item)).rejects.toBeInstanceOf(RangeError);
});
