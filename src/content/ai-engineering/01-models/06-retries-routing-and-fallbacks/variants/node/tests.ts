const { createModel, ModelError } = require('@dojo/ai');

const REQUEST = { messages: [{ role: 'user', content: 'Classify this ticket: my invoice shows the wrong VAT number.' }] };

function retryOptions(extra: Record<string, unknown> = {}) {
  return { retries: 3, baseMs: 100, maxMs: 1000, sleep: fn(async () => {}), random: () => 0.5, ...extra };
}

function isCategoryJson(text: string): boolean {
  try {
    return typeof JSON.parse(text).category === 'string';
  } catch {
    return false;
  }
}

function routerOptions(extra: Record<string, unknown> = {}) {
  return {
    ...retryOptions(),
    models: { cheap: createModel({ model: 'cheap' }), strong: createModel({ model: 'strong' }), backup: createModel({ model: 'backup' }) },
    validate: isCategoryJson,
    ...extra,
  };
}

const calledModels = () => fakeModel.requests.map((request: { model: string }) => request.model);

test('isRetryable accepts rate limits, server errors, overloads and timeouts, but never a context-length error, an auth error or a bug', async () => {
  for (const status of [429, 500, 503, 504, 529] as const) {
    fakeModel.reply(respond.error(status));
    expect(mod.isRetryable(await captureError(createModel().generate(REQUEST)))).toBe(true);
  }
  fakeModel.reply(respond.contextLength(), respond.error(401));
  const tooLong = await captureError(createModel().generate(REQUEST));
  expect(tooLong.code).toBe('context_length');
  expect(mod.isRetryable(tooLong)).toBe(false);
  expect(mod.isRetryable(await captureError(createModel().generate(REQUEST)))).toBe(false);
  expect(mod.isRetryable(new Error('bug'))).toBe(false);
  expect(mod.isRetryable(new TypeError('x is undefined'))).toBe(false);
});

test('retryDelay honors retryAfterMs and otherwise uses capped exponential backoff with full jitter', () => {
  const serverError = new ModelError(500, 'server_error', 'oops');
  const delays = (random: () => number) => [0, 1, 2, 3, 4, 5].map((attempt) => mod.retryDelay(attempt, serverError, { retries: 5, baseMs: 100, maxMs: 1000, random }));
  expect(delays(() => 1)).toEqual([100, 200, 400, 800, 1000, 1000]);
  expect(delays(() => 0.5)).toEqual([50, 100, 200, 400, 500, 500]);
  const rateLimited = new ModelError(429, 'rate_limit', 'slow down', 2500);
  expect(mod.retryDelay(0, rateLimited, { retries: 3, baseMs: 100, maxMs: 1000, random: () => 0.5 })).toBe(2500);
  expect(mod.retryDelay(4, rateLimited, { retries: 3, baseMs: 100, maxMs: 1000, random: () => 1 })).toBe(2500);
});

test('generateWithRetry survives every failure order within the limit, waits the right delays and rethrows the last error after it', async () => {
  const scenarios = [
    { failures: [respond.error(429, { retryAfterMs: 700 })], sleeps: [700] },
    { failures: [respond.error(500), respond.error(529)], sleeps: [50, 100] },
    { failures: [respond.error(504), respond.error(429, { retryAfterMs: 30 }), respond.error(503)], sleeps: [50, 30, 200] },
  ];
  for (const scenario of scenarios) {
    fakeModel.reset().reply(...scenario.failures, respond.text('billing'));
    const options = retryOptions();
    const response = await mod.generateWithRetry(createModel(), REQUEST, options);
    expect(response.text).toBe('billing');
    expect(fakeModel.requests).toHaveLength(scenario.failures.length + 1);
    expect(options.sleep.mock.calls).toEqual(scenario.sleeps.map((delay) => [delay]));
  }
  fakeModel.reset().reply(respond.error(503), respond.error(500), respond.error(503), respond.error(504, { message: 'last failure' }), respond.text('too late'));
  const error = await captureError(mod.generateWithRetry(createModel(), REQUEST, retryOptions()));
  expect(error.message).toBe('last failure');
  expect(fakeModel.requests).toHaveLength(4);
});

test('generateWithFallback switches to the backup only after the primary exhausts its retries, never on a context-length error', async () => {
  fakeModel.forModel('primary').reply(respond.error(503), respond.error(503), respond.error(503));
  fakeModel.forModel('backup').reply(respond.text('billing'));
  const result = await mod.generateWithFallback(createModel({ model: 'primary' }), createModel({ model: 'backup' }), REQUEST, retryOptions({ retries: 2 }));
  expect(result.model).toBe('backup');
  expect(result.response.text).toBe('billing');
  expect(calledModels()).toEqual(['primary', 'primary', 'primary', 'backup']);

  fakeModel.reset().forModel('primary').reply(respond.contextLength());
  fakeModel.forModel('backup').reply(respond.text('should not be called'));
  const options = retryOptions();
  const error = await captureError(mod.generateWithFallback(createModel({ model: 'primary' }), createModel({ model: 'backup' }), REQUEST, options));
  expect(error.code).toBe('context_length');
  expect(calledModels()).toEqual(['primary']);
  expect(options.sleep).not.toHaveBeenCalled();
});

test('answer routes to the cheap model first and escalates to the strong model only when the cheap answer fails validation', async () => {
  let escalations = 0;
  await forEachSeed(24, async () => {
    fakeModel
      .forModel('cheap')
      .reply(respond.oneOf([respond.json({ category: 'billing' }), respond.malformedJson({ category: 'billing' }), respond.text(['Billing', 'The category is billing.'])]));
    fakeModel.forModel('strong').reply(respond.json({ category: 'billing' }));
    const result = await mod.answer(REQUEST, routerOptions());
    const cheapAnswerValid = isCategoryJson(fakeModel.responses[0].text);
    expect(isCategoryJson(result.text)).toBe(true);
    if (cheapAnswerValid) {
      expect(calledModels()).toEqual(['cheap']);
      expect(result).toEqual({ text: fakeModel.responses[0].text, model: 'cheap', escalated: false });
    } else {
      escalations += 1;
      expect(calledModels()).toEqual(['cheap', 'strong']);
      expect(result).toEqual({ text: fakeModel.responses[1].text, model: 'strong', escalated: true });
    }
  });
  expect(escalations).toBeGreaterThan(0);
  expect(escalations).toBeLessThan(24);
});

test('answer escalates when the cheap model is down, uses the backup when the strong model is down too, and rejects an escalated answer that fails validation', async () => {
  fakeModel.forModel('cheap').reply(respond.error(503), respond.error(503));
  fakeModel.forModel('strong').reply(respond.error(529), respond.error(529));
  fakeModel.forModel('backup').reply(respond.json({ category: 'shipping' }));
  const result = await mod.answer(REQUEST, routerOptions({ retries: 1 }));
  expect(result).toEqual({ text: '{"category":"shipping"}', model: 'backup', escalated: true });
  expect(calledModels()).toEqual(['cheap', 'cheap', 'strong', 'strong', 'backup']);

  await forEachSeed(8, async () => {
    fakeModel.forModel('cheap').reply(respond.malformedJson({ category: 'billing' }));
    fakeModel.forModel('strong').reply(respond.malformedJson({ category: 'billing' }));
    const error = await captureError(mod.answer(REQUEST, routerOptions()));
    expect(error).toBeInstanceOf(mod.InvalidAnswerError);
    expect(calledModels()).toEqual(['cheap', 'strong']);
  });
});
