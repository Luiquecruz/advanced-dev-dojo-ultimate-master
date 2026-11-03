const { createModel, ModelError } = require('@dojo/ai');
const { z } = require('zod');

const ORDER_ID_TASK = { system: 'You write regular expressions. Answer with the pattern only.', prompt: 'Write a pattern for order ids such as ORD-2026-000123.' };
const ORDER_ID_EXAMPLES = { shouldMatch: ['ORD-2026-000123', 'ORD-1999-999999'], shouldReject: ['ord-2026-000123', 'ORD-2026-123', 'ORD-2026-000123x', 'XORD-2026-000123'] };
const GOOD_PATTERN = 'ORD-\\d{4}-\\d{6}';
const BAD_PATTERNS = ['ORD-(\\d{4}', 'ORD-.*', '[Oo][Rr][Dd]-\\d{4}-\\d{6}', 'ORD-\\d+-\\d+'];

const lastUserMessage = (request: { messages: Array<{ role: string; content: string }> }) => [...request.messages].reverse().find((message) => message.role === 'user')!.content;

test('passes on the first attempt with the system and user messages, running every verifier once', async () => {
  fakeModel.reply(respond.text(GOOD_PATTERN));
  const syntax = { name: 'syntax', check: fn(() => ({ passed: true })) };
  const result = await mod.runVerified(createModel(), ORDER_ID_TASK, { verifiers: [syntax, mod.examplesVerifier(ORDER_ID_EXAMPLES)], maxAttempts: 3 });
  expect(result).toEqual({ status: 'passed', output: GOOD_PATTERN, attempts: 1, failures: [] });
  expect(fakeModel.requests[0].messages).toEqual([
    { role: 'system', content: ORDER_ID_TASK.system },
    { role: 'user', content: ORDER_ID_TASK.prompt },
  ]);
  expect(syntax.check).toHaveBeenCalledTimes(1);

  fakeModel.reset().reply(respond.text(GOOD_PATTERN));
  await mod.runVerified(createModel(), { prompt: 'Pattern only.' }, { verifiers: [], maxAttempts: 1 });
  expect(fakeModel.requests[0].messages).toEqual([{ role: 'user', content: 'Pattern only.' }]);
});

test('feeds the failing verifier and its feedback back with the previous answer, then passes', async () => {
  fakeModel.reply(respond.text('ORD-.*'), respond.text(GOOD_PATTERN));
  const result = await mod.runVerified(createModel(), ORDER_ID_TASK, { verifiers: [mod.examplesVerifier(ORDER_ID_EXAMPLES)], maxAttempts: 3 });
  expect(result.status).toBe('passed');
  expect(result.attempts).toBe(2);
  expect(result.output).toBe(GOOD_PATTERN);
  expect(result.failures.length).toBe(1);
  expect(result.failures[0].attempt).toBe(1);
  expect(result.failures[0].verifier).toBe('examples');
  expect(result.failures[0].feedback).toContain('"ORD-2026-123"');

  const retry = fakeModel.requests[1].messages;
  expect(retry.slice(0, 3)).toEqual([
    { role: 'system', content: ORDER_ID_TASK.system },
    { role: 'user', content: ORDER_ID_TASK.prompt },
    { role: 'assistant', content: 'ORD-.*' },
  ]);
  expect(retry.length).toBe(4);
  expect(retry[3].role).toBe('user');
  expect(retry[3].content).toContain('examples');
  expect(retry[3].content).toContain(result.failures[0].feedback);
});

test('runs verifiers from first to last and stops at the first failure', async () => {
  const cheap = { name: 'parses', check: fn((output: string) => ({ passed: output.startsWith('{') })) };
  const expensive = { name: 'test-suite', check: fn(async () => ({ passed: false, feedback: '2 of 14 tests fail: totals.test.ts' })) };
  fakeModel.reply(respond.text('Sure! Here is the JSON:'), respond.text('{"total": 3}'));
  const result = await mod.runVerified(createModel(), { prompt: 'Fix the totals.' }, { verifiers: [cheap, expensive], maxAttempts: 2 });
  expect(result.status).toBe('failed');
  expect(result.failures).toEqual([
    { attempt: 1, verifier: 'parses', feedback: '' },
    { attempt: 2, verifier: 'test-suite', feedback: '2 of 14 tests fail: totals.test.ts' },
  ]);
  expect(cheap.check).toHaveBeenCalledTimes(2);
  expect(expensive.check).toHaveBeenCalledTimes(1);
  expect(lastUserMessage(fakeModel.requests[1])).toContain('parses');
});

test('stops after maxAttempts when the model never fixes the problem, and reports every failure', async () => {
  fakeModel.handle(() => respond.text('ORD-.*'));
  const result = await mod.runVerified(createModel(), ORDER_ID_TASK, { verifiers: [mod.examplesVerifier(ORDER_ID_EXAMPLES)], maxAttempts: 3 });
  expect(result.status).toBe('failed');
  expect(result.attempts).toBe(3);
  expect(result.output).toBe('ORD-.*');
  expect(result.failures.map((failure: { attempt: number; verifier: string }) => [failure.attempt, failure.verifier])).toEqual([[1, 'examples'], [2, 'examples'], [3, 'examples']]);
  expect(fakeModel.requests).toHaveLength(3);
  expect(fakeModel.requests[2].messages.filter((message: { role: string }) => message.role === 'assistant')).toHaveLength(2);
});

test('treats truncated and refused answers as incomplete without running the verifiers', async () => {
  const verifier = { name: 'examples', check: fn(() => ({ passed: true })) };
  fakeModel.reply(respond.truncated('ORD-\\d{4}-\\d{6} matches every order id because', 0.3), respond.refusal(), respond.text(GOOD_PATTERN));
  const result = await mod.runVerified(createModel(), ORDER_ID_TASK, { verifiers: [verifier], maxAttempts: 3 });
  expect(result.status).toBe('passed');
  expect(result.attempts).toBe(3);
  expect(result.failures.map((failure: { verifier: string }) => failure.verifier)).toEqual(['completion', 'completion']);
  expect(result.failures[0].feedback).toContain('length');
  expect(result.failures[1].feedback).toContain('refusal');
  expect(verifier.check).toHaveBeenCalledTimes(1);
});

test('converges within the attempt budget however many bad answers come first, driven by feedback', async () => {
  await forEachSeed(16, async () => {
    let badAnswers: number | undefined;
    fakeModel.handle((request: { messages: Array<{ role: string }> }, context: { random(): number }) => {
      badAnswers ??= Math.floor(context.random() * 4);
      const previousAnswers = request.messages.filter((message) => message.role === 'assistant').length;
      return previousAnswers < badAnswers ? respond.oneOf(BAD_PATTERNS.map((pattern) => respond.text(pattern))) : respond.text(GOOD_PATTERN);
    });
    const result = await mod.runVerified(createModel(), ORDER_ID_TASK, { verifiers: [mod.examplesVerifier(ORDER_ID_EXAMPLES)], maxAttempts: 5 });
    expect(result.status).toBe('passed');
    expect(result.attempts).toBe(badAnswers! + 1);
    expect(result.failures).toHaveLength(badAnswers!);
    expect(fakeModel.requests).toHaveLength(badAnswers! + 1);
    result.failures.forEach((failure: { attempt: number; feedback: string }) => {
      expect(failure.feedback.length).toBeGreaterThan(0);
      expect(lastUserMessage(fakeModel.requests[failure.attempt])).toContain(failure.feedback);
    });
  });
});

test('a verifier that throws or a model error ends the run unchanged', async () => {
  fakeModel.reply(respond.text(GOOD_PATTERN), respond.text(GOOD_PATTERN));
  const crashing = { name: 'tests', check: () => { throw new Error('test runner crashed'); } };
  const error = await captureError(mod.runVerified(createModel(), ORDER_ID_TASK, { verifiers: [crashing], maxAttempts: 3 }));
  expect(error.message).toBe('test runner crashed');
  expect(fakeModel.requests).toHaveLength(1);

  fakeModel.reset().reply(respond.text('ORD-.*'), respond.error(503));
  const outage = await captureError(mod.runVerified(createModel(), ORDER_ID_TASK, { verifiers: [mod.examplesVerifier(ORDER_ID_EXAMPLES)], maxAttempts: 3 }));
  expect(outage).toBeInstanceOf(ModelError);
  expect(outage.status).toBe(503);
});

test('schemaVerifier and examplesVerifier explain every failure in lines a model can act on', async () => {
  const schema = z.object({ title: z.string().max(60), price: z.number().positive(), tags: z.array(z.string()) });
  const verifier = mod.schemaVerifier(schema);
  expect(verifier.name).toBe('schema');
  expect(await verifier.check('{"title":"Desk lamp","price":39.9,"tags":["home"]}')).toEqual({ passed: true });
  const notJson = await verifier.check('Here you go: {"title": "Desk lamp"}');
  expect(notJson.passed).toBe(false);
  expect(notJson.feedback).toMatch(/^Not valid JSON/);
  const invalid = await verifier.check('{"title":"Desk lamp","price":-3,"tags":["home", 7]}');
  expect(invalid.passed).toBe(false);
  expect(invalid.feedback.split('\n').map((line: string) => line.split(': ')[0]).sort()).toEqual(['price', 'tags.1']);
  expect((await verifier.check('[1, 2]')).feedback).toMatch(/^\(root\): /);

  const examples = mod.examplesVerifier({ shouldMatch: ['42', '7'], shouldReject: ['12a', ''] });
  expect(examples.name).toBe('examples');
  expect(await examples.check(' \\d+ ')).toEqual({ passed: true });
  expect((await examples.check('\\d+(')).feedback).toMatch(/^Not a valid regular expression/);
  const loose = await examples.check('\\d*[a-z]?');
  expect(loose.passed).toBe(false);
  expect(loose.feedback.split('\n')).toHaveLength(2);
  expect(loose.feedback).toContain('"12a"');
  expect(loose.feedback).toContain('""');
});
