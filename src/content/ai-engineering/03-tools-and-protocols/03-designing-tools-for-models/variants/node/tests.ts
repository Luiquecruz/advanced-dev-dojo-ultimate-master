const { z } = require('zod');
const { createModel } = require('@dojo/ai');

const STACK_LINE = /\n\s+at\s/;

function weatherTool(run = fn((args: { city: string; days: number }) => ({ city: args.city, forecast: Array(args.days).fill('sunny') }))) {
  const tool = mod.defineTool({
    name: 'get_forecast',
    description: 'Daily weather forecast for a city, up to seven days ahead.',
    input: z.object({ city: z.string().min(2).describe('City name'), days: z.number().int().min(1).max(7).default(3).describe('Days ahead') }).strict(),
    run,
  });
  return { tool, run };
}

async function search(args: unknown): Promise<string> {
  return mod.searchOrders.call(typeof args === 'string' ? args : JSON.stringify(args));
}

test('defineTool derives JSON Schema parameters from the Zod schema, with defaults optional and no $schema key', () => {
  const { tool } = weatherTool();
  expect(tool.definition.name).toBe('get_forecast');
  expect(tool.definition.description).toBe('Daily weather forecast for a city, up to seven days ahead.');
  const parameters = tool.definition.parameters;
  expect(parameters.type).toBe('object');
  expect(parameters.$schema).toBeUndefined();
  expect(parameters.required).toEqual(['city']);
  expect(parameters.additionalProperties).toBe(false);
  expect(parameters.properties.days).toEqual(expect.objectContaining({ type: 'integer', minimum: 1, maximum: 7, default: 3, description: 'Days ahead' }));
});

test('call runs the tool with validated arguments (defaults applied) and returns strings as is and other values as JSON', async () => {
  const { tool, run } = weatherTool();
  expect(JSON.parse(await tool.call('{"city":"Lisbon"}'))).toEqual({ city: 'Lisbon', forecast: ['sunny', 'sunny', 'sunny'] });
  expect(run).toHaveBeenCalledWith({ city: 'Lisbon', days: 3 });
  const textTool = mod.defineTool({ name: 'echo', description: 'Echo the text back.', input: z.object({ text: z.string() }), run: ({ text }: { text: string }) => text });
  expect(await textTool.call('{"text":"plain words"}')).toBe('plain words');
});

test('call answers broken JSON and schema violations with an error the model can act on, naming every invalid field, without running the tool', async () => {
  const { tool, run } = weatherTool();
  fakeModel.reply(respond.invalidToolArguments('get_forecast'));
  const brokenArguments = (await createModel().generate({ messages: [{ role: 'user', content: 'Weather?' }] })).toolCalls[0].arguments;
  const broken = await tool.call(brokenArguments);
  expect(broken).toMatch(/^Error/);
  expect(broken).toContain('get_forecast');

  const invalid = await tool.call('{"city":"X","days":9,"units":"kelvin"}');
  expect(invalid).toMatch(/^Error/);
  expect(invalid).toContain('get_forecast');
  expect(invalid).toMatch(/^- city: /m);
  expect(invalid).toMatch(/^- days: /m);
  expect(invalid).toContain('units');
  expect(await tool.call('[1, 2]')).toMatch(/^Error/);
  expect(run).not.toHaveBeenCalled();
});

test('call passes a ToolError message and hint to the model, and hides the details of unexpected failures', async () => {
  const { tool: expected } = weatherTool(fn(() => { throw new mod.ToolError('Unknown city "Atlantis".', 'Use a real city name, such as "Lisbon".'); }));
  const known = await expected.call('{"city":"Atlantis"}');
  expect(known).toMatch(/^Error/);
  expect(known).toContain('Unknown city "Atlantis".');
  expect(known).toContain('Use a real city name');

  const { tool: crashing } = weatherTool(fn(() => { throw new Error('connect ECONNREFUSED 10.0.0.5:5432 user=forecast_admin'); }));
  const unexpected = await crashing.call('{"city":"Lisbon"}');
  expect(unexpected).toMatch(/^Error/);
  expect(unexpected).toContain('get_forecast');
  expect(unexpected).not.toContain('10.0.0.5');
  expect(unexpected).not.toContain('forecast_admin');
  expect(unexpected).not.toMatch(STACK_LINE);
});

test('search_orders is described for the model: snake_case name, a useful description, every field described, unknown keys rejected, limit bounded', () => {
  const { definition } = mod.searchOrders;
  expect(definition.name).toBe('search_orders');
  expect(definition.description.length).toBeGreaterThanOrEqual(60);
  const { properties, required, additionalProperties } = definition.parameters;
  expect(Object.keys(properties).sort()).toEqual(['customerEmail', 'limit', 'status']);
  expect(required).toEqual(['customerEmail']);
  expect(additionalProperties).toBe(false);
  Object.values(properties).forEach((property: { description?: string }) => expect((property.description ?? '').length).toBeGreaterThanOrEqual(10));
  expect(properties.status.enum).toEqual(['pending', 'shipped', 'delivered', 'cancelled']);
  expect(properties.limit).toEqual(expect.objectContaining({ minimum: 1, maximum: 20, default: 5 }));
});

test('search_orders returns only the fields the model needs, most recent first, with the match count and a hint when the list is truncated', async () => {
  const result = JSON.parse(await search({ customerEmail: 'Ada@Example.com' }));
  expect(result.total).toBe(12);
  expect(result.truncated).toBe(true);
  expect(result.orders.map((order: { id: string }) => order.id)).toEqual(['A-1012', 'A-1011', 'A-1010', 'A-1009', 'A-1008']);
  result.orders.forEach((order: Record<string, unknown>) => expect(Object.keys(order).sort()).toEqual(['id', 'placedAt', 'status', 'total']));
  expect(typeof result.hint).toBe('string');
  expect(result.hint).toMatch(/status|limit/);
  expect(JSON.stringify(result)).not.toMatch(/tok_|WH-|Picked by/);

  const shipped = JSON.parse(await search({ customerEmail: 'ada@example.com', status: 'shipped' }));
  expect(shipped).toEqual({
    orders: [
      { id: 'A-1010', status: 'shipped', total: 132, placedAt: '2026-10-02' },
      { id: 'A-1009', status: 'shipped', total: 89, placedAt: '2026-09-12' },
    ],
    total: 2,
    truncated: false,
  });
  expect(JSON.parse(await search({ customerEmail: 'ada@example.com', limit: 20 })).orders).toHaveLength(12);
});

test('search_orders reports invalid values, an unknown customer and an empty filter in ways the model can recover from', async () => {
  const tooMany = await search({ customerEmail: 'ada@example.com', limit: 50 });
  expect(tooMany).toMatch(/^Error/);
  expect(tooMany).toMatch(/^- limit: /m);
  const badStatus = await search({ customerEmail: 'ada@example.com', status: 'lost' });
  expect(badStatus).toMatch(/^- status: /m);
  expect(badStatus).toContain('shipped');
  expect(await search({ customerEmail: 'not-an-email' })).toMatch(/^- customerEmail: /m);
  expect(await search({ email: 'ada@example.com' })).toMatch(/^Error/);

  const unknown = await search({ customerEmail: 'nobody@example.com' });
  expect(unknown).toMatch(/^Error/);
  expect(unknown).toContain('nobody@example.com');
  expect(unknown).toMatch(/Hint: .{10,}/);

  expect(JSON.parse(await search({ customerEmail: 'linus@example.com', status: 'pending' }))).toEqual({ orders: [], total: 0, truncated: false });
});
