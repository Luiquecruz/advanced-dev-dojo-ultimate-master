const VOCABULARY = ['reset', 'password', 'account', 'refund', 'order', 'cancel'];

function embed(text: string): number[] {
  const words = text.toLowerCase().match(/[a-z]+/g) ?? [];
  return VOCABULARY.map((term) => words.filter((word) => word === term).length);
}

const ACME = { tenant: 'acme', model: 'small', systemPrompt: 'You are the Acme support assistant.' };

function httpError(status: number): Error {
  return Object.assign(new Error(`provider answered ${status}`), { status });
}

function timeoutError(): Error {
  const error = new Error('provider timed out');
  error.name = 'TimeoutError';
  return error;
}

test('the scope key encodes tenant, model and system prompt as a JSON array, so no two scopes collide', () => {
  expect(mod.scopeKey({ tenant: 'acme', model: 'small', systemPrompt: 'Be brief.' })).toBe('["acme","small","Be brief."]');
  expect(mod.scopeKey({ ...ACME, prompt: 'How do I reset my password?' })).toBe(mod.scopeKey(ACME));
  expect(mod.scopeKey({ tenant: 'a|b', model: 'c', systemPrompt: '' })).not.toBe(mod.scopeKey({ tenant: 'a', model: 'b|c', systemPrompt: '' }));
});

test('lookup returns the answer of the most similar entry once it reaches the threshold, embedding each prompt once', () => {
  const countingEmbed = fn(embed);
  const cache = mod.createSemanticCache({ threshold: 0.8, embed: countingEmbed });
  const scope = mod.scopeKey(ACME);
  cache.store(scope, 'How do I reset my password?', 'password answer');
  cache.store(scope, 'How do I reset my account password?', 'account password answer');
  expect(countingEmbed).toHaveBeenCalledTimes(2);
  expect(cache.lookup(scope, 'reset the password on my account')).toBe('account password answer');
  expect(cache.lookup(scope, 'password reset, please')).toBe('password answer');
  expect(countingEmbed).toHaveBeenCalledTimes(4);
  expect(cache.lookup(scope, 'Where is my refund?')).toBeUndefined();
  const strict = mod.createSemanticCache({ threshold: 0.9, embed });
  strict.store(scope, 'How do I reset my password?', 'password answer');
  expect(strict.lookup(scope, 'reset my account password')).toBeUndefined();
  // the similarity of these two prompts is exactly 0.5, so it reaches a threshold of 0.5
  const boundary = mod.createSemanticCache({ threshold: 0.5, embed });
  boundary.store(scope, 'Where is my refund?', 'refund answer');
  expect(boundary.lookup(scope, 'Should I cancel my account or refund my order?')).toBe('refund answer');
});

// beginner mistake: matching on prompt similarity alone, so a cached answer leaks to another tenant, model or system prompt
test('lookup only searches the entries stored under exactly the same scope', () => {
  const cache = mod.createSemanticCache({ threshold: 0.8, embed });
  const prompt = 'How do I reset my password?';
  cache.store(mod.scopeKey(ACME), prompt, 'Acme: open Settings, then Security.');
  expect(cache.lookup(mod.scopeKey(ACME), prompt)).toBe('Acme: open Settings, then Security.');
  expect(cache.lookup(mod.scopeKey({ ...ACME, tenant: 'globex' }), prompt)).toBeUndefined();
  expect(cache.lookup(mod.scopeKey({ ...ACME, model: 'large' }), prompt)).toBeUndefined();
  expect(cache.lookup(mod.scopeKey({ ...ACME, systemPrompt: 'Answer in French.' }), prompt)).toBeUndefined();
});

test('complete answers a miss from the first provider, stores it and serves similar prompts of the same scope from the cache', async () => {
  const primary = fn(async (request: { prompt: string }) => `primary: ${request.prompt}`);
  const gateway = mod.createGateway({ providers: [{ name: 'primary', call: primary }], cache: mod.createSemanticCache({ threshold: 0.8, embed }) });
  const request = { ...ACME, prompt: 'How do I reset my password?' };
  expect(await gateway.complete(request)).toEqual({ answer: 'primary: How do I reset my password?', provider: 'primary', cached: false });
  expect(primary).toHaveBeenCalledWith(request);
  expect(await gateway.complete({ ...request, prompt: 'password reset, please' })).toEqual({ answer: 'primary: How do I reset my password?', provider: 'cache', cached: true });
  expect(primary).toHaveBeenCalledTimes(1);
  expect(await gateway.complete({ ...request, tenant: 'globex' })).toEqual({ answer: 'primary: How do I reset my password?', provider: 'primary', cached: false });
  expect(primary).toHaveBeenCalledTimes(2);
});

test('complete moves to the next provider on 429, 5xx and timeouts, in order', async () => {
  const calls: string[] = [];
  const failing = (name: string, error: Error) => ({ name, call: async () => { calls.push(name); throw error; } });
  const gateway = mod.createGateway({
    providers: [
      failing('first', httpError(429)),
      failing('second', httpError(500)),
      failing('third', httpError(503)),
      failing('fourth', timeoutError()),
      { name: 'backup', call: async () => { calls.push('backup'); return 'backup answer'; } },
    ],
    cache: mod.createSemanticCache({ threshold: 0.8, embed }),
  });
  expect(await gateway.complete({ ...ACME, prompt: 'Where is my order?' })).toEqual({ answer: 'backup answer', provider: 'backup', cached: false });
  expect(calls).toEqual(['first', 'second', 'third', 'fourth', 'backup']);
});

test('complete hands a non-retryable error straight to the caller, reports the last error when every provider fails, and caches no failure', async () => {
  const cache = mod.createSemanticCache({ threshold: 0.8, embed });
  const request = { ...ACME, prompt: 'Cancel my order' };
  const backup = fn(async () => 'backup answer');
  for (const error of [httpError(400), new Error('invalid tool definition')]) {
    const gateway = mod.createGateway({ providers: [{ name: 'primary', call: async () => { throw error; } }, { name: 'backup', call: backup }], cache });
    expect(await captureError(gateway.complete(request))).toBe(error);
  }
  expect(backup).not.toHaveBeenCalled();
  const last = httpError(502);
  const outage = mod.createGateway({
    providers: [{ name: 'primary', call: async () => { throw httpError(503); } }, { name: 'secondary', call: async () => { throw last; } }],
    cache,
  });
  expect(await captureError(outage.complete(request))).toBe(last);
  const recovered = mod.createGateway({ providers: [{ name: 'primary', call: async () => 'fresh answer' }], cache });
  expect(await recovered.complete(request)).toEqual({ answer: 'fresh answer', provider: 'primary', cached: false });
});
