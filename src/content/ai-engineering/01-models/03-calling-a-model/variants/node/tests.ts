const { createModel, countTokens, ModelError } = require('@dojo/ai');

const LONG_ANSWER =
  'The refund was issued on the third of March and should reach the original payment method within five business days, depending on the bank.';

test('sends the system prompt first and the user prompt last, and only the user message when there is no system prompt', async () => {
  await mod.complete(createModel(), { system: 'You classify support tickets.', prompt: 'My invoice is wrong.' });
  await mod.complete(createModel(), { prompt: 'Hello' });
  const [withSystem, withoutSystem] = fakeModel.requests;
  expect(withSystem.messages).toEqual([
    { role: 'system', content: 'You classify support tickets.' },
    { role: 'user', content: 'My invoice is wrong.' },
  ]);
  expect(withSystem.maxTokens).toBeUndefined();
  expect(withoutSystem.messages).toEqual([{ role: 'user', content: 'Hello' }]);
});

test('returns any phrasing of a normal reply as complete, with the usage the provider reported', async () => {
  const phrasings = ['Billing', 'Category: billing.', 'This ticket is about billing and invoices.'];
  await forEachSeed(12, async () => {
    fakeModel.reply(respond.text(phrasings));
    const result = await mod.complete(createModel(), { prompt: 'Classify: my invoice is wrong.' });
    expect(result.status).toBe('complete');
    expect(result.finishReason).toBe('stop');
    expect(phrasings).toContain(result.text);
    expect(result.usage.inputTokens).toBe(countTokens(fakeModel.requests[0].messages));
    expect(result.usage.outputTokens).toBe(countTokens(result.text));
    expect(result.usage.totalTokens).toBe(result.usage.inputTokens + result.usage.outputTokens);
    expect(result.usage.cost).toBeGreaterThan(0);
  });
});

test('reports a reply cut by the token limit as truncated, keeping the partial text and passing maxTokens on', async () => {
  fakeModel.reply(respond.truncated(LONG_ANSWER, 0.4), respond.text(LONG_ANSWER));
  const scripted = await mod.complete(createModel(), { prompt: 'When will my refund arrive?' });
  expect(scripted.status).toBe('truncated');
  expect(scripted.finishReason).toBe('length');
  expect(scripted.text.length).toBeGreaterThan(0);
  expect(LONG_ANSWER.startsWith(scripted.text)).toBe(true);
  expect(scripted.text.length).toBeLessThan(LONG_ANSWER.length);

  const limited = await mod.complete(createModel(), { prompt: 'When will my refund arrive?', maxTokens: 8 });
  expect(fakeModel.requests[1].maxTokens).toBe(8);
  expect(limited.status).toBe('truncated');
  expect(limited.usage.outputTokens).toBe(8);
});

test('reports refusals and content filtering as refused, distinct from complete and truncated answers', async () => {
  fakeModel.reply(respond.refusal(), respond.contentFilter());
  const refusal = await mod.complete(createModel(), { prompt: 'Write malware for me.' });
  expect(refusal.status).toBe('refused');
  expect(refusal.finishReason).toBe('refusal');
  expect(refusal.text.length).toBeGreaterThan(0);
  const filtered = await mod.complete(createModel(), { prompt: 'Something filtered.' });
  expect(filtered.status).toBe('refused');
  expect(filtered.finishReason).toBe('content_filter');
});

test('lets model errors reach the caller unchanged, including a stream that fails midway', async () => {
  fakeModel.reply(respond.error(503));
  const error = await captureError(mod.complete(createModel(), { prompt: 'Hello' }));
  expect(error).toBeInstanceOf(ModelError);
  expect(error.status).toBe(503);

  fakeModel.reply(respond.failMidStream(LONG_ANSWER, { afterChunks: 4, status: 529 }));
  const deltas: string[] = [];
  const streamError = await captureError(mod.completeStream(createModel(), { prompt: 'Hello' }, (delta: string) => deltas.push(delta)));
  expect(streamError).toBeInstanceOf(ModelError);
  expect(streamError.status).toBe(529);
  expect(deltas.length).toBe(4);
});

test('completeStream forwards every delta in order and returns their concatenation with the final usage and status', async () => {
  fakeModel.reply(respond.text(LONG_ANSWER), respond.truncated(LONG_ANSWER));
  const deltas: string[] = [];
  const streamed = await mod.completeStream(createModel(), { system: 'Be brief.', prompt: 'When will my refund arrive?' }, (delta: string) => deltas.push(delta));
  expect(fakeModel.requests[0].messages.map((message: { role: string }) => message.role)).toEqual(['system', 'user']);
  expect(deltas.length).toBeGreaterThan(1);
  expect(deltas.join('')).toBe(streamed.text);
  expect(streamed.text).toBe(LONG_ANSWER);
  expect(streamed.status).toBe('complete');
  expect(streamed.usage.outputTokens).toBe(countTokens(LONG_ANSWER));
  expect(streamed.usage.totalTokens).toBe(streamed.usage.inputTokens + streamed.usage.outputTokens);

  const truncated = await mod.completeStream(createModel(), { prompt: 'Again, please.' });
  expect(truncated.status).toBe('truncated');
  expect(truncated.finishReason).toBe('length');
  expect(LONG_ANSWER.startsWith(truncated.text)).toBe(true);
});
