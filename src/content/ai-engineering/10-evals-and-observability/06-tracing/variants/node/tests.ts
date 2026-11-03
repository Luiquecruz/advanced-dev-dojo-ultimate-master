const { createModel } = require('@dojo/ai');

const SECRET = 'card 4111 1111 1111 1111 belongs to Ana Souza';

function clock(start = 1000, step = 5) {
  let current = start - step;
  return () => (current += step);
}

function lookupTool() {
  return { name: 'get_order', description: 'Look up an order by id', execute: fn((args: { orderId: string }) => ({ orderId: args.orderId, status: 'shipped', note: SECRET })) };
}

const contentKeys = (span: { attributes: Record<string, unknown> }) =>
  Object.keys(span.attributes).filter((key) => ['gen_ai.input.messages', 'gen_ai.output.messages', 'gen_ai.system_instructions', 'gen_ai.tool.call.arguments', 'gen_ai.tool.call.result'].includes(key));

test('createTracer gives root spans a new trace, children their parent trace and span id, and records each span once when it ends', () => {
  const tracer = mod.createTracer({ now: clock() });
  const root = tracer.startSpan('invoke_agent support', { attributes: { 'gen_ai.operation.name': 'invoke_agent' } });
  const child = tracer.startSpan('chat dojo-fake-1', { parent: root, kind: 'client' });
  const grandchild = tracer.startSpan('execute_tool get_order', { parent: child });
  const other = tracer.startSpan('invoke_agent billing');
  expect(root.traceId).toMatch(/^[0-9a-f]{32}$/);
  expect(root.spanId).toMatch(/^[0-9a-f]{16}$/);
  expect(root.parentSpanId).toBe(null);
  expect(child).toMatchObject({ traceId: root.traceId, parentSpanId: root.spanId, kind: 'client', status: 'unset', endMs: null });
  expect(grandchild).toMatchObject({ traceId: root.traceId, parentSpanId: child.spanId, kind: 'internal' });
  expect(other.traceId).not.toBe(root.traceId);
  expect(new Set([root.spanId, child.spanId, grandchild.spanId, other.spanId]).size).toBe(4);
  expect(tracer.spans).toEqual([]);
  grandchild.end('ok');
  child.end();
  root.end('error');
  root.end('ok');
  expect(tracer.spans.map((span: { name: string }) => span.name)).toEqual(['execute_tool get_order', 'chat dojo-fake-1', 'invoke_agent support']);
  expect(root).toMatchObject({ startMs: 1000, endMs: 1030, status: 'error' });
  expect(child.status).toBe('unset');
  expect(root.attributes['gen_ai.operation.name']).toBe('invoke_agent');
  const fixedIds = mod.createTracer({ newId: (bytes: number) => 'ab'.repeat(bytes) }).startSpan('x');
  expect(fixedIds).toMatchObject({ traceId: 'ab'.repeat(16), spanId: 'ab'.repeat(8) });
});

test('tracedModel records one client span per call with the GenAI semantic convention attributes and usage', async () => {
  const tracer = mod.createTracer({ now: clock() });
  const root = tracer.startSpan('invoke_agent support');
  const model = mod.tracedModel(createModel({ model: 'atlas-mini' }), tracer, { provider: 'atlas', parent: root });
  expect(model.name).toBe('atlas-mini');
  fakeModel.reply(respond.text('Your order shipped yesterday.'));
  const response = await model.generate({ messages: [{ role: 'user', content: `Where is my order? ${SECRET}` }], maxTokens: 200, temperature: 0.2 });
  expect(response.text).toBe('Your order shipped yesterday.');
  expect(tracer.spans).toHaveLength(1);
  const [span] = tracer.spans;
  expect(span).toMatchObject({ name: 'chat atlas-mini', kind: 'client', status: 'ok', traceId: root.traceId, parentSpanId: root.spanId });
  expect(span.attributes).toEqual({
    'gen_ai.operation.name': 'chat',
    'gen_ai.provider.name': 'atlas',
    'gen_ai.request.model': 'atlas-mini',
    'gen_ai.request.max_tokens': 200,
    'gen_ai.request.temperature': 0.2,
    'gen_ai.response.id': response.id,
    'gen_ai.response.model': 'atlas-mini',
    'gen_ai.response.finish_reasons': ['stop'],
    'gen_ai.usage.input_tokens': response.usage.inputTokens,
    'gen_ai.usage.output_tokens': response.usage.outputTokens,
  });
  expect(span.endMs).toBeGreaterThan(span.startMs);
});

test('tracedModel marks failed calls with error.type, ends the span and rethrows the same error', async () => {
  for (const [behavior, code] of [
    [respond.error(429), 'rate_limit'],
    [respond.error(503), 'overloaded'],
    [respond.contextLength(), 'context_length'],
  ]) {
    fakeModel.reset().reply(behavior);
    const tracer = mod.createTracer();
    const inner = createModel();
    const error = await captureError(mod.tracedModel(inner, tracer, { provider: 'dojo' }).generate({ messages: [{ role: 'user', content: 'hi' }] }));
    expect(error.code).toBe(code);
    expect(tracer.spans).toHaveLength(1);
    expect(tracer.spans[0]).toMatchObject({ name: 'chat dojo-fake-1', status: 'error', parentSpanId: null });
    expect(tracer.spans[0].attributes['error.type']).toBe(code);
    expect(tracer.spans[0].attributes).not.toHaveProperty('gen_ai.usage.input_tokens');
  }
});

test('tracedTool records one internal span per call with the tool attributes and the error type when it throws', async () => {
  const tracer = mod.createTracer();
  const root = tracer.startSpan('invoke_agent support');
  const tool = lookupTool();
  const traced = mod.tracedTool(tool, tracer, { parent: root });
  expect(traced.name).toBe('get_order');
  expect(await traced.execute({ orderId: 'A-1' }, 'call_7')).toMatchObject({ orderId: 'A-1', status: 'shipped' });
  expect(tool.execute).toHaveBeenCalledTimes(1);
  const failing = mod.tracedTool(
    {
      name: 'issue_refund',
      description: 'Refund an order',
      execute: () => {
        throw new TypeError('amount must be a number');
      },
    },
    tracer,
    { parent: root },
  );
  const error = await captureError(() => failing.execute({ amount: 'ten' }));
  expect(error).toBeInstanceOf(TypeError);
  const [lookup, refund] = tracer.spans;
  expect(lookup).toMatchObject({ name: 'execute_tool get_order', kind: 'internal', status: 'ok', traceId: root.traceId, parentSpanId: root.spanId });
  expect(lookup.attributes).toEqual({ 'gen_ai.operation.name': 'execute_tool', 'gen_ai.tool.name': 'get_order', 'gen_ai.tool.description': 'Look up an order by id', 'gen_ai.tool.call.id': 'call_7' });
  expect(refund).toMatchObject({ name: 'execute_tool issue_refund', status: 'error' });
  expect(refund.attributes['error.type']).toBe('TypeError');
  expect(refund.attributes).not.toHaveProperty('gen_ai.tool.call.id');
});

test('prompts, outputs, tool arguments and results stay out of the spans unless content capture is opted in', async () => {
  await forEachSeed(8, async () => {
    fakeModel.reply(respond.oneOf([respond.text([`Noted: ${SECRET}`, 'Done.']), respond.toolCall('get_order', { orderId: 'A-1', note: SECRET }), respond.refusal()]));
    const tracer = mod.createTracer();
    const response = await mod.tracedModel(createModel(), tracer, { provider: 'dojo' }).generate({ messages: [{ role: 'system', content: 'You help customers.' }, { role: 'user', content: SECRET }] });
    await mod.tracedTool(lookupTool(), tracer).execute({ orderId: 'A-1', note: SECRET });
    expect(JSON.stringify(tracer.spans)).not.toContain('Ana Souza');
    expect(JSON.stringify(tracer.spans)).not.toContain('You help customers');
    tracer.spans.forEach((span: { attributes: Record<string, unknown> }) => expect(contentKeys(span)).toEqual([]));
    expect(tracer.spans[0].attributes['gen_ai.response.finish_reasons']).toEqual([response.finishReason]);
  });

  fakeModel.reset().reply(respond.text('Your order shipped.'));
  const tracer = mod.createTracer({ captureContent: true });
  await mod.tracedModel(createModel(), tracer, { provider: 'dojo' }).generate({ messages: [{ role: 'user', content: SECRET }] });
  await mod.tracedTool(lookupTool(), tracer).execute({ orderId: 'A-1' });
  const [chat, tool] = tracer.spans;
  expect(JSON.parse(chat.attributes['gen_ai.input.messages'])).toEqual([{ role: 'user', content: SECRET }]);
  expect(JSON.parse(chat.attributes['gen_ai.output.messages'])[0]).toMatchObject({ role: 'assistant', content: 'Your order shipped.' });
  expect(JSON.parse(tool.attributes['gen_ai.tool.call.arguments'])).toEqual({ orderId: 'A-1' });
  expect(JSON.parse(tool.attributes['gen_ai.tool.call.result'])).toMatchObject({ orderId: 'A-1', note: SECRET });
});

test('summarizeTrace rolls up one trace: calls, errors, tokens, cost from the price table, duration and unpriced models', async () => {
  fakeModel.configure({ pricing: { inputPerMillion: 3, outputPerMillion: 15 } });
  fakeModel.forModel('atlas-mini').reply(respond.toolCall('get_order', { orderId: 'A-1' }), respond.error(503), respond.text('Your order shipped yesterday.'));
  fakeModel.forModel('nimbus-mid').reply(respond.text('Summary: order A-1 shipped.'));
  const tracer = mod.createTracer({ now: clock(5000, 10) });
  const root = tracer.startSpan('invoke_agent support');
  const mini = mod.tracedModel(createModel({ model: 'atlas-mini' }), tracer, { provider: 'atlas', parent: root });
  const mid = mod.tracedModel(createModel({ model: 'nimbus-mid' }), tracer, { provider: 'nimbus', parent: root });
  const lookup = mod.tracedTool(lookupTool(), tracer, { parent: root });
  const messages = [{ role: 'user', content: 'Where is order A-1?' }];
  await mini.generate({ messages });
  await lookup.execute({ orderId: 'A-1' }, 'call_1');
  await captureError(mini.generate({ messages }));
  await mini.generate({ messages });
  await mid.generate({ messages });
  root.end('ok');

  const otherRoot = tracer.startSpan('invoke_agent other');
  fakeModel.forModel('atlas-mini').reply(respond.text('unrelated'));
  await mod.tracedModel(createModel({ model: 'atlas-mini' }), tracer, { provider: 'atlas', parent: otherRoot }).generate({ messages });
  otherRoot.end();

  const pricing = { 'atlas-mini': { inputPerMillion: 3, outputPerMillion: 15 } };
  const summary = mod.summarizeTrace(tracer.spans, root.traceId, pricing);
  const responses = fakeModel.responses.slice(0, 3);
  expect(summary).toMatchObject({ traceId: root.traceId, spans: 6, modelCalls: 4, toolCalls: 1, errors: 1, unpricedModels: ['nimbus-mid'] });
  expect(summary.inputTokens).toBe(responses.reduce((sum: number, response: { usage: { inputTokens: number } }) => sum + response.usage.inputTokens, 0));
  expect(summary.outputTokens).toBe(responses.reduce((sum: number, response: { usage: { outputTokens: number } }) => sum + response.usage.outputTokens, 0));
  const pricedCost = responses.filter((response: { model: string }) => response.model === 'atlas-mini').reduce((sum: number, response: { usage: { cost: number } }) => sum + response.usage.cost, 0);
  expect(summary.costUsd).toBeCloseTo(pricedCost, 9);
  expect(summary.durationMs).toBe(root.endMs - root.startMs);

  const fullyPriced = mod.summarizeTrace(tracer.spans, root.traceId, { ...pricing, 'nimbus-mid': { inputPerMillion: 3, outputPerMillion: 15 } });
  expect(fullyPriced.unpricedModels).toEqual([]);
  expect(fullyPriced.costUsd).toBeCloseTo(responses.reduce((sum: number, response: { usage: { cost: number } }) => sum + response.usage.cost, 0), 9);
  expect(mod.summarizeTrace(tracer.spans, otherRoot.traceId, pricing)).toMatchObject({ spans: 2, modelCalls: 1, toolCalls: 0, errors: 0 });
});
