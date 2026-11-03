const { createModel } = require('@dojo/ai');

function weatherTools() {
  const getWeather = fn(({ city }: { city: string }) => ({ city, temperatureC: city === 'Lisbon' ? 20 : 9 }));
  const convert = fn(({ celsius }: { celsius: number }) => `${celsius * 1.8 + 32} F`);
  return {
    getWeather,
    convert,
    tools: [
      { name: 'get_weather', description: 'Current weather for a city', parameters: { type: 'object', properties: { city: { type: 'string' } }, required: ['city'] }, execute: getWeather },
      { name: 'convert', description: 'Convert Celsius to Fahrenheit', parameters: { type: 'object', properties: { celsius: { type: 'number' } }, required: ['celsius'] }, execute: convert },
    ],
  };
}

const toolMessages = (request: { messages: Array<{ role: string }> }) => request.messages.filter((message) => message.role === 'tool') as Array<{ role: string; toolCallId: string; content: string }>;

test('returns the final answer when the model replies without tool calls, offering every tool and sending the system prompt and task', async () => {
  const { tools } = weatherTools();
  fakeModel.reply(respond.text('It is sunny.'));
  const result = await mod.runAgent(createModel(), { system: 'You are a weather assistant.', task: 'Weather in Lisbon?', tools, maxSteps: 5 });
  expect(result.status).toBe('done');
  expect(result.answer).toBe('It is sunny.');
  expect(result.steps).toBe(1);
  expect(fakeModel.requests).toHaveLength(1);
  const request = fakeModel.requests[0];
  expect(request.messages).toEqual([
    { role: 'system', content: 'You are a weather assistant.' },
    { role: 'user', content: 'Weather in Lisbon?' },
  ]);
  expect(request.tools.map((tool: { name: string }) => tool.name)).toEqual(['get_weather', 'convert']);
  expect(request.tools[0].parameters).toEqual(tools[0].parameters);
});

test('executes a tool call with the parsed arguments and sends the assistant turn and the tool result back before the next call', async () => {
  const { tools, getWeather } = weatherTools();
  fakeModel.reply(respond.toolCall('get_weather', { city: 'Lisbon' }), respond.text('20 degrees in Lisbon.'));
  const result = await mod.runAgent(createModel(), { task: 'Weather in Lisbon?', tools, maxSteps: 5 });
  expect(getWeather).toHaveBeenCalledWith({ city: 'Lisbon' });
  expect(result).toEqual(expect.objectContaining({ status: 'done', answer: '20 degrees in Lisbon.', steps: 2 }));
  const second = fakeModel.requests[1];
  const callId = fakeModel.responses[0].toolCalls[0].id;
  expect(second.messages[0]).toEqual({ role: 'user', content: 'Weather in Lisbon?' });
  expect(second.messages[1].role).toBe('assistant');
  expect(second.messages[1].toolCalls).toEqual(fakeModel.responses[0].toolCalls);
  expect(toolMessages(second)).toEqual([{ role: 'tool', toolCallId: callId, content: JSON.stringify({ city: 'Lisbon', temperatureC: 20 }) }]);
  expect(result.messages.map((message: { role: string }) => message.role)).toEqual(['user', 'assistant', 'tool', 'assistant']);
});

test('runs every tool call of one response in order, one tool message per call id, and passes string results through unchanged', async () => {
  const { tools, getWeather, convert } = weatherTools();
  fakeModel.reply(
    respond.toolCalls([
      { name: 'get_weather', arguments: { city: 'Oslo' } },
      { name: 'convert', arguments: { celsius: 10 } },
    ]),
    respond.text('Oslo is cold.'),
  );
  await mod.runAgent(createModel(), { task: 'Weather in Oslo, in Fahrenheit?', tools, maxSteps: 5 });
  expect(getWeather).toHaveBeenCalledTimes(1);
  expect(convert).toHaveBeenCalledWith({ celsius: 10 });
  const ids = fakeModel.responses[0].toolCalls.map((call: { id: string }) => call.id);
  const results = toolMessages(fakeModel.requests[1]);
  expect(results.map((message) => message.toolCallId)).toEqual(ids);
  expect(results[1].content).toBe('50 F');
});

test('survives invalid arguments and unknown tools: no tool runs, the model gets an error result for that call id, and the loop continues', async () => {
  await forEachSeed(12, async () => {
    const { tools, getWeather, convert } = weatherTools();
    fakeModel.reply(respond.oneOf([respond.invalidToolArguments('get_weather'), respond.unknownTool(), respond.unknownTool('send_email')]), respond.text('Sorry, let me answer directly.'));
    const result = await mod.runAgent(createModel(), { task: 'Weather?', tools, maxSteps: 5 });
    expect(getWeather).not.toHaveBeenCalled();
    expect(convert).not.toHaveBeenCalled();
    const [failure] = toolMessages(fakeModel.requests[1]);
    expect(failure.toolCallId).toBe(fakeModel.responses[0].toolCalls[0].id);
    expect(failure.content).toMatch(/^Error:/);
    expect(result.status).toBe('done');
  });
});

test('turns a tool that throws into an error result containing its message, without crashing the loop', async () => {
  const flaky = fn(() => {
    throw new Error('weather service unavailable');
  });
  const tools = [{ name: 'get_weather', description: 'Weather', parameters: { type: 'object' }, execute: flaky }];
  fakeModel.reply(respond.toolCall('get_weather', { city: 'Rome' }), respond.text('I could not fetch the weather.'));
  const result = await mod.runAgent(createModel(), { task: 'Weather in Rome?', tools, maxSteps: 3 });
  const [failure] = toolMessages(fakeModel.requests[1]);
  expect(failure.content).toMatch(/^Error:/);
  expect(failure.content).toContain('weather service unavailable');
  expect(result.status).toBe('done');
});

test('stops with max_steps after exactly maxSteps model calls when the model never gives a final answer', async () => {
  const { tools, getWeather } = weatherTools();
  fakeModel.handle(() => respond.toolCall('get_weather', { city: 'Lisbon' }));
  const result = await mod.runAgent(createModel(), { task: 'Weather?', tools, maxSteps: 4 });
  expect(result.status).toBe('max_steps');
  expect(result.answer).toBeNull();
  expect(result.steps).toBe(4);
  expect(fakeModel.requests).toHaveLength(4);
  expect(getWeather).toHaveBeenCalledTimes(4);
});

test('stops with refused on a refusal or content filter, and reaches the answer across seeds when the model reacts to tool results', async () => {
  await forEachSeed(6, async () => {
    fakeModel.reply(respond.oneOf([respond.refusal(), respond.contentFilter()]), respond.text('should not be requested'));
    const result = await mod.runAgent(createModel(), { task: 'Something risky', tools: weatherTools().tools, maxSteps: 5 });
    expect(result.status).toBe('refused');
    expect(result.answer).toBeNull();
    expect(fakeModel.requests).toHaveLength(1);
  });

  await forEachSeed(12, async () => {
    const { tools } = weatherTools();
    fakeModel.handle((request: any) => {
      const results = toolMessages(request);
      if (results.length === 0) return respond.toolCall('get_weather', { city: 'Lisbon' });
      if (results.length === 1) return respond.toolCall('convert', { celsius: JSON.parse(results[0].content).temperatureC });
      return respond.text([`It is ${results[1].content} in Lisbon.`, `Lisbon: ${results[1].content}.`]);
    });
    const result = await mod.runAgent(createModel(), { task: 'Weather in Lisbon in Fahrenheit?', tools, maxSteps: 6 });
    expect(result.status).toBe('done');
    expect(result.steps).toBe(3);
    expect(result.answer).toContain('68 F');
  });
});
