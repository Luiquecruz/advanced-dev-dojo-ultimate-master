test('backoffDelay grows exponentially, is capped at maxMs and scales with random()', async () => {
  const delays = (random: () => number) => [0, 1, 2, 3, 4, 5].map((attempt) => mod.backoffDelay(attempt, 100, 1000, random));
  expect(delays(() => 1)).toEqual([100, 200, 400, 800, 1000, 1000]);
  expect(delays(() => 0.5)).toEqual([50, 100, 200, 400, 500, 500]);
  expect(delays(() => 0)).toEqual([0, 0, 0, 0, 0, 0]);
});

test('retry returns the first success without sleeping and passes the attempt number', async () => {
  const sleepSpy = fn(async () => {});
  const work = fn(async (attempt: number) => `ok on ${attempt}`);
  await expect(mod.retry(work, { retries: 3, baseMs: 100, maxMs: 1000, sleep: sleepSpy })).resolves.toBe('ok on 0');
  expect(work).toHaveBeenCalledTimes(1);
  expect(sleepSpy).not.toHaveBeenCalled();
});

test('retry waits with backoff between retryable failures and then succeeds', async () => {
  const sleepSpy = fn(async () => {});
  const work = fn(async (attempt: number) => {
    if (attempt < 2) throw new mod.HttpError(503);
    return 'recovered';
  });
  const result = await mod.retry(work, { retries: 5, baseMs: 100, maxMs: 1000, sleep: sleepSpy, random: () => 0.5 });
  expect(result).toBe('recovered');
  expect(work.mock.calls).toEqual([[0], [1], [2]]);
  expect(sleepSpy.mock.calls).toEqual([[50], [100]]);
});

test('retry gives up after `retries` retries and rethrows the last error', async () => {
  const errors: Error[] = [];
  const sleepSpy = fn(async () => {});
  const work = fn(async () => {
    const error = new mod.HttpError(500, `failure ${errors.length + 1}`);
    errors.push(error);
    throw error;
  });
  let caught: unknown;
  try {
    await mod.retry(work, { retries: 3, baseMs: 10, maxMs: 100, sleep: sleepSpy, random: () => 1 });
  } catch (error) {
    caught = error;
  }
  expect(work).toHaveBeenCalledTimes(4);
  expect(sleepSpy.mock.calls).toEqual([[10], [20], [40]]);
  expect(caught).toBe(errors[3]);
});

test('retry does not retry errors that shouldRetry (isRetryable by default) rejects', async () => {
  const sleepSpy = fn(async () => {});
  const notFound = fn(async () => {
    throw new mod.HttpError(404);
  });
  await expect(mod.retry(notFound, { retries: 3, baseMs: 10, maxMs: 100, sleep: sleepSpy })).rejects.toThrow('HTTP 404');
  expect(notFound).toHaveBeenCalledTimes(1);
  const flaky = fn(async () => {
    throw new mod.HttpError(503);
  });
  await expect(mod.retry(flaky, { retries: 3, baseMs: 10, maxMs: 100, sleep: sleepSpy, shouldRetry: () => false })).rejects.toThrow('HTTP 503');
  expect(flaky).toHaveBeenCalledTimes(1);
  expect(sleepSpy).not.toHaveBeenCalled();
});

test('isRetryable accepts network errors, 408, 429 and 5xx gateway errors but not client errors', async () => {
  for (const status of [408, 429, 500, 502, 503, 504]) {
    expect(mod.isRetryable(new mod.HttpError(status))).toBe(true);
  }
  expect(mod.isRetryable(new TypeError('fetch failed'))).toBe(true);
  for (const status of [400, 401, 403, 404, 409, 422]) {
    expect(mod.isRetryable(new mod.HttpError(status))).toBe(false);
  }
  expect(mod.isRetryable(new Error('bug'))).toBe(false);
});
