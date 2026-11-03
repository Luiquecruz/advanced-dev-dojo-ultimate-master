const { createModel, ModelError } = require('@dojo/ai');
const { z } = require('zod');

const TICKET = z.object({
  category: z.enum(['billing', 'shipping', 'account', 'bug']),
  priority: z.enum(['low', 'normal', 'high']),
  orderId: z.string().regex(/^\d{4}$/).nullable(),
  tags: z.array(z.string()).default([]),
});

const EXTRACTED = { category: 'billing', priority: 'high', orderId: '1042', tags: ['double charge'] };
const MESSAGES = [
  { role: 'system', content: 'Extract the ticket fields as JSON.' },
  { role: 'user', content: 'I was charged twice for order 1042, please fix it today.' },
];

const extract = (extra: Record<string, unknown> = {}) => mod.generateStructured(createModel(), { messages: MESSAGES, schema: TICKET, ...extra });

test('parseModelJson repairs prose and fences, trailing commas and single quotes, and rejects truncated JSON', async () => {
  expect(mod.parseModelJson('{"total": 3}')).toEqual({ ok: true, value: { total: 3 }, repaired: false });
  expect(mod.parseModelJson('Here you go:\n```json\n{"total": 3,}\n```')).toEqual({ ok: true, value: { total: 3 }, repaired: true });
  let truncatedSeen = 0;
  await forEachSeed(24, async () => {
    fakeModel.reply(respond.malformedJson(EXTRACTED));
    const { text } = await createModel().generate({ messages: MESSAGES });
    const result = mod.parseModelJson(text);
    if (text.length < JSON.stringify(EXTRACTED).length) {
      truncatedSeen += 1;
      expect(result.ok).toBe(false);
      expect(typeof result.error).toBe('string');
    } else {
      expect(result).toEqual({ ok: true, value: EXTRACTED, repaired: true });
    }
  });
  expect(truncatedSeen).toBeGreaterThan(0);
});

test('asks for JSON with a JSON Schema derived from the Zod schema and returns the validated value with defaults applied', async () => {
  fakeModel.reply(respond.json({ category: 'shipping', priority: 'normal', orderId: null }));
  const result = await extract();
  expect(result).toEqual({ value: { category: 'shipping', priority: 'normal', orderId: null, tags: [] }, attempts: 1, repaired: false });
  const [request] = fakeModel.requests;
  expect(request.messages).toEqual(MESSAGES);
  expect(request.responseFormat.type).toBe('json');
  expect(request.responseFormat.schema.type).toBe('object');
  expect(Object.keys(request.responseFormat.schema.properties).sort()).toEqual(['category', 'orderId', 'priority', 'tags']);
});

test('survives every malformed shape: repairs without a second call, and re-asks only when the JSON cannot be repaired', async () => {
  await forEachSeed(24, async () => {
    fakeModel.reply(respond.malformedJson(EXTRACTED), respond.json(EXTRACTED));
    const result = await extract();
    expect(result.value).toEqual(EXTRACTED);
    const firstText = fakeModel.responses[0].text;
    if (firstText.length < JSON.stringify(EXTRACTED).length) {
      expect(result.attempts).toBe(2);
      expect(fakeModel.requests).toHaveLength(2);
    } else {
      expect(result).toEqual({ value: EXTRACTED, attempts: 1, repaired: true });
      expect(fakeModel.requests).toHaveLength(1);
    }
  });
});

test('re-asks with the bad reply and the validation error, naming the invalid fields, without changing the original messages', async () => {
  const wrong = { category: 'billing', priority: 'urgent', orderId: 1042 };
  fakeModel.reply(respond.json(wrong), respond.json(EXTRACTED));
  const result = await extract();
  expect(result.attempts).toBe(2);
  expect(result.value).toEqual(EXTRACTED);
  const second = fakeModel.requests[1].messages;
  expect(second).toHaveLength(MESSAGES.length + 2);
  expect(second.slice(0, MESSAGES.length)).toEqual(MESSAGES);
  expect(second[MESSAGES.length]).toEqual({ role: 'assistant', content: JSON.stringify(wrong) });
  expect(second[MESSAGES.length + 1].role).toBe('user');
  expect(second[MESSAGES.length + 1].content).toMatch(/priority/);
  expect(second[MESSAGES.length + 1].content).toMatch(/orderId/);
  expect(fakeModel.requests[0].messages).toEqual(MESSAGES);
  expect(MESSAGES).toHaveLength(2);
});

test('treats a reply cut by the token limit as a failed attempt and re-asks', async () => {
  fakeModel.reply(respond.truncated(JSON.stringify(EXTRACTED), 0.95), respond.json(EXTRACTED));
  const result = await extract();
  expect(result.attempts).toBe(2);
  expect(fakeModel.requests[1].messages.at(-1).role).toBe('user');
});

test('gives up after maxAttempts calls with the last error, whatever mix of failures the model produces', async () => {
  await forEachSeed(12, async () => {
    const bad = respond.oneOf([respond.malformedJson(EXTRACTED), respond.json({ category: 'other' }), respond.text('I think it is billing.'), respond.truncated(JSON.stringify(EXTRACTED))]);
    fakeModel.handle(() => bad);
    const outcome = await extract({ maxAttempts: 4 }).then(
      (value: unknown) => ({ value }),
      (error: unknown) => ({ error }),
    );
    if ('value' in outcome) {
      expect(outcome.value.value).toEqual(EXTRACTED);
      expect(fakeModel.requests.length).toBeLessThanOrEqual(4);
    } else {
      expect(outcome.error).toBeInstanceOf(mod.StructuredOutputError);
      expect(outcome.error.reason).toBe('exhausted');
      expect(outcome.error.attempts).toBe(4);
      expect(outcome.error.lastError.length).toBeGreaterThan(0);
      expect(fakeModel.requests).toHaveLength(4);
    }
  });
  fakeModel.reset().handle(() => respond.json({ category: 'other' }));
  const error = await captureError(extract({ maxAttempts: 2 }));
  expect(error.reason).toBe('exhausted');
  expect(error.lastError).toMatch(/category/);
  expect(fakeModel.requests).toHaveLength(2);
});

test('stops at once on a refusal or a content filter, and lets model errors through unchanged', async () => {
  for (const behavior of [respond.refusal(), respond.contentFilter()]) {
    fakeModel.reset().reply(behavior, respond.json(EXTRACTED));
    const error = await captureError(extract());
    expect(error).toBeInstanceOf(mod.StructuredOutputError);
    expect(error.reason).toBe('refusal');
    expect(fakeModel.requests).toHaveLength(1);
  }
  fakeModel.reset().reply(respond.error(503), respond.json(EXTRACTED));
  const error = await captureError(extract());
  expect(error).toBeInstanceOf(ModelError);
  expect(error.status).toBe(503);
});
