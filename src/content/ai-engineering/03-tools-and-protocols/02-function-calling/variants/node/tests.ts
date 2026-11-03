const { createModel } = require('@dojo/ai');

const ORDERS: Record<string, { status: string; total: number }> = {
  'A-1001': { status: 'shipped', total: 120 },
  'A-1002': { status: 'delivered', total: 45 },
};

function supportTools() {
  const getOrder = fn(async (args: { orderId: string }) => {
    const order = ORDERS[args.orderId];
    if (!order) {
      throw new Error(`No order with id ${args.orderId}`);
    }
    return { orderId: args.orderId, ...order };
  });
  const getPolicy = fn(() => 'Refunds are accepted within 30 days of delivery.');
  return {
    getOrder,
    getPolicy,
    tools: [
      { name: 'get_order', description: 'Look up an order by id.', parameters: { type: 'object', properties: { orderId: { type: 'string' } }, required: ['orderId'] }, execute: getOrder },
      { name: 'get_refund_policy', description: 'Return the refund policy text.', parameters: { type: 'object', properties: {} }, execute: getPolicy },
    ],
  };
}

const QUESTION = [{ role: 'user', content: 'Where is my order A-1001?' }];

function errorOf(message: { content: string }): string {
  const parsed = JSON.parse(message.content);
  expect(typeof parsed.error).toBe('string');
  return parsed.error;
}

test('parseToolArguments accepts a JSON object and rejects broken JSON, arrays, null and primitives without throwing', async () => {
  expect(mod.parseToolArguments('{"orderId":"A-1001","verbose":true}')).toEqual({ ok: true, value: { orderId: 'A-1001', verbose: true } });
  fakeModel.reply(respond.invalidToolArguments('get_order'));
  const broken = (await createModel().generate({ messages: QUESTION })).toolCalls[0].arguments;
  for (const raw of [broken, '[1, 2]', 'null', '"A-1001"', '42', '']) {
    const parsed = mod.parseToolArguments(raw);
    expect(parsed.ok).toBe(false);
    expect(typeof parsed.error).toBe('string');
    expect(parsed.error.length).toBeGreaterThan(0);
  }
});

test('executeToolCall runs the matching tool with the parsed arguments and answers with a tool message tied to the call id', async () => {
  const { tools, getOrder, getPolicy } = supportTools();
  const orderMessage = await mod.executeToolCall({ id: 'call_7', name: 'get_order', arguments: '{"orderId":"A-1001"}' }, tools);
  expect(getOrder).toHaveBeenCalledWith({ orderId: 'A-1001' });
  expect(orderMessage.role).toBe('tool');
  expect(orderMessage.toolCallId).toBe('call_7');
  expect(JSON.parse(orderMessage.content)).toEqual({ orderId: 'A-1001', status: 'shipped', total: 120 });
  const policyMessage = await mod.executeToolCall({ id: 'call_8', name: 'get_refund_policy', arguments: '{}' }, tools);
  expect(getPolicy).toHaveBeenCalledTimes(1);
  expect(policyMessage).toEqual({ role: 'tool', toolCallId: 'call_8', content: 'Refunds are accepted within 30 days of delivery.' });
});

test('executeToolCall turns an unknown tool, broken arguments and a failing tool into model-readable error messages instead of throwing', async () => {
  const { tools, getOrder } = supportTools();
  const unknown = await mod.executeToolCall({ id: 'call_1', name: 'delete_everything', arguments: '{}' }, tools);
  expect(unknown.role).toBe('tool');
  expect(unknown.toolCallId).toBe('call_1');
  expect(errorOf(unknown)).toContain('delete_everything');
  expect(errorOf(unknown)).toContain('get_order');
  expect(errorOf(unknown)).toContain('get_refund_policy');

  const broken = await mod.executeToolCall({ id: 'call_2', name: 'get_order', arguments: '{"orderId": ' }, tools);
  expect(broken.toolCallId).toBe('call_2');
  expect(errorOf(broken)).toContain('get_order');
  expect(getOrder).not.toHaveBeenCalled();

  const failing = await mod.executeToolCall({ id: 'call_3', name: 'get_order', arguments: '{"orderId":"Z-9"}' }, tools);
  expect(failing.toolCallId).toBe('call_3');
  expect(errorOf(failing)).toContain('No order with id Z-9');
});

test('runWithTools offers the tool definitions without their code, appends the assistant tool calls and the tool results, and returns the final answer', async () => {
  const { tools, getOrder } = supportTools();
  fakeModel.reply(respond.toolCall('get_order', { orderId: 'A-1001' }), respond.text(['It has shipped.', 'Order A-1001 is on its way.']));
  const result = await mod.runWithTools(createModel(), { messages: QUESTION, tools });

  const [first, second] = fakeModel.requests;
  expect(first.tools).toEqual(tools.map(({ name, description, parameters }) => ({ name, description, parameters })));
  expect(first.messages).toEqual(QUESTION);
  const call = fakeModel.responses[0].toolCalls[0];
  expect(second.messages).toEqual([
    ...QUESTION,
    { role: 'assistant', content: '', toolCalls: [call] },
    { role: 'tool', toolCallId: call.id, content: JSON.stringify({ orderId: 'A-1001', status: 'shipped', total: 120 }) },
  ]);
  expect(getOrder).toHaveBeenCalledTimes(1);
  expect(result.text).toBe(fakeModel.responses[1].text);
  expect(result.rounds).toBe(2);
  expect(result.messages).toEqual([...second.messages, { role: 'assistant', content: result.text }]);
  expect(QUESTION).toHaveLength(1);
});

test('runWithTools executes parallel tool calls in order, one tool message per call id', async () => {
  const { tools, getOrder, getPolicy } = supportTools();
  fakeModel.reply(
    respond.toolCalls([
      { name: 'get_order', arguments: { orderId: 'A-1002' } },
      { name: 'get_refund_policy' },
    ]),
    respond.text('Delivered, and you can still ask for a refund.'),
  );
  await mod.runWithTools(createModel(), { messages: [{ role: 'user', content: 'Can I return order A-1002?' }], tools });
  const calls = fakeModel.responses[0].toolCalls;
  const toolMessages = fakeModel.requests[1].messages.filter((message: { role: string }) => message.role === 'tool');
  expect(toolMessages.map((message: { toolCallId: string }) => message.toolCallId)).toEqual(calls.map((call: { id: string }) => call.id));
  expect(getOrder).toHaveBeenCalledWith({ orderId: 'A-1002' });
  expect(getPolicy).toHaveBeenCalledTimes(1);
  expect(fakeModel.requests).toHaveLength(2);
});

test('runWithTools recovers from every malformed call: the model sees the error and the loop continues', async () => {
  await forEachSeed(16, async () => {
    const { tools } = supportTools();
    fakeModel.reply(
      respond.oneOf([respond.invalidToolArguments('get_order'), respond.unknownTool(), respond.unknownTool('cancel_order'), respond.toolCall('get_order', { orderId: 'Z-9' })]),
      respond.toolCall('get_order', { orderId: 'A-1001' }),
      respond.text('Your order has shipped.'),
    );
    const result = await mod.runWithTools(createModel(), { messages: QUESTION, tools });
    expect(result.text).toBe('Your order has shipped.');
    expect(result.rounds).toBe(3);
    const firstToolMessage = fakeModel.requests[1].messages.find((message: { role: string }) => message.role === 'tool');
    expect(firstToolMessage.toolCallId).toBe(fakeModel.responses[0].toolCalls[0].id);
    expect(errorOf(firstToolMessage).length).toBeGreaterThan(10);
  });
});

test('runWithTools stops a model that never stops calling tools with a ToolLoopLimitError after maxRounds model calls', async () => {
  const { tools, getPolicy } = supportTools();
  fakeModel.handle(() => respond.toolCall('get_refund_policy'));
  const error = await captureError(mod.runWithTools(createModel(), { messages: QUESTION, tools, maxRounds: 3 }));
  expect(error).toBeInstanceOf(mod.ToolLoopLimitError);
  expect(error.rounds).toBe(3);
  expect(fakeModel.requests).toHaveLength(3);
  expect(getPolicy).toHaveBeenCalledTimes(2);

  fakeModel.reset().handle(() => respond.toolCall('get_refund_policy'));
  await captureError(mod.runWithTools(createModel(), { messages: QUESTION, tools }));
  expect(fakeModel.requests).toHaveLength(5);
});
