const { createModel, countTokens } = require('@dojo/ai');
const fixtures = () => modules['servers.ts'];

const tokensOf = (definition: unknown) => countTokens(JSON.stringify(definition));
const totalTokens = (definitions: unknown[]) => definitions.reduce((total: number, definition) => total + tokensOf(definition), 0);

function spyServer(reply: (request: any) => unknown) {
  const received: any[] = [];
  const server = {
    handle: fn(async (message: string) => {
      const request = JSON.parse(message);
      received.push(request);
      return JSON.stringify({ jsonrpc: '2.0', id: request.id, ...(reply(request) as object) });
    }),
  };
  return { server, received };
}

async function companyIndex(extra: Array<{ id: string; server: unknown }> = []) {
  return mod.buildToolIndex([...fixtures().createCompanyServers(), ...extra]);
}

test('createMcpClient sends JSON-RPC requests with unique ids and the protocol version, capabilities and identity in _meta, and throws McpError on errors', async () => {
  const { server, received } = spyServer((request) => (request.method === 'tools/call' ? { error: { code: -32602, message: 'Unknown tool: nope', data: { name: 'nope' } } } : { result: { resultType: 'complete', tools: [] } }));
  const client = mod.createMcpClient(server, { name: 'support-agent', version: '2.1.0' });
  expect(await client.request('tools/list')).toEqual({ resultType: 'complete', tools: [] });
  await client.request('tools/list', { cursor: '2' });
  const error = await captureError(client.request('tools/call', { name: 'nope', arguments: {} }));
  expect(error).toBeInstanceOf(mod.McpError);
  expect(error.code).toBe(-32602);
  expect(error.data).toEqual({ name: 'nope' });

  expect(received.map((request) => request.jsonrpc)).toEqual(['2.0', '2.0', '2.0']);
  expect(new Set(received.map((request) => request.id)).size).toBe(3);
  expect(received[1].params.cursor).toBe('2');
  received.forEach((request) => {
    expect(request.params._meta['io.modelcontextprotocol/protocolVersion']).toBe('2026-07-28');
    expect(request.params._meta['io.modelcontextprotocol/clientCapabilities']).toEqual({});
    expect(request.params._meta['io.modelcontextprotocol/clientInfo']).toEqual({ name: 'support-agent', version: '2.1.0' });
  });
});

test('buildToolIndex discovers every tool across servers, following nextCursor pages, and namespaces colliding names as server__tool', async () => {
  const index = await companyIndex();
  expect(index.tools.map((tool: { qualifiedName: string }) => tool.qualifiedName)).toEqual([
    'crm__search',
    'crm__find_customer',
    'crm__update_customer_email',
    'crm__list_customer_notes',
    'billing__search',
    'billing__list_invoices',
    'billing__refund_invoice',
    'billing__apply_credit',
    'docs__search',
    'docs__get_article',
  ]);
  const refund = index.tools.find((tool: { qualifiedName: string }) => tool.qualifiedName === 'billing__refund_invoice');
  expect(refund).toEqual({ qualifiedName: 'billing__refund_invoice', serverId: 'billing', toolName: 'refund_invoice', description: fixtures().BILLING_TOOLS[2].description, inputSchema: fixtures().BILLING_TOOLS[2].inputSchema });
  expect(index.failures).toEqual([]);
});

test('buildToolIndex keeps working when one server fails and reports which one', async () => {
  const index = await companyIndex([{ id: 'legacy', server: fixtures().createBrokenServer() }]);
  expect(index.tools).toHaveLength(10);
  expect(index.failures).toHaveLength(1);
  expect(index.failures[0].serverId).toBe('legacy');
  expect(index.failures[0].message).toContain('database unavailable');
});

test('search ranks tools by similarity to the task and returns at most the limit', async () => {
  const index = await companyIndex();
  const top = (query: string, limit = 1) => index.search(query, limit).map((tool: { qualifiedName: string }) => tool.qualifiedName);
  expect(top('refund an invoice')).toEqual(['billing__refund_invoice']);
  expect(top('add credit to balance')).toEqual(['billing__apply_credit']);
  expect(top('find customer profile')).toEqual(['crm__find_customer']);
  expect(top('customer email address', 3)).toHaveLength(3);
  expect(top('customer email address', 3)[0]).toBe('crm__update_customer_email');
  expect(index.search('anything', 50)).toHaveLength(10);
});

test('definitionsFor returns namespaced definitions in the requested order and never exceeds the token budget', async () => {
  const index = await companyIndex();
  const [refund] = index.definitionsFor(['billing__refund_invoice'], 10_000);
  expect(refund).toEqual({ name: 'billing__refund_invoice', description: fixtures().BILLING_TOOLS[2].description, parameters: fixtures().BILLING_TOOLS[2].inputSchema });

  const names = index.tools.map((tool: { qualifiedName: string }) => tool.qualifiedName);
  const all = index.definitionsFor(names, 100_000);
  expect(all.map((definition: { name: string }) => definition.name)).toEqual(names);
  for (const budget of [0, 60, 150, 333, totalTokens(all) - 1]) {
    const chosen = index.definitionsFor(names, budget);
    expect(totalTokens(chosen)).toBeLessThanOrEqual(budget);
    expect(chosen.length).toBeLessThan(names.length);
  }
  const costs = all.map(tokensOf);
  const big = names[costs.indexOf(Math.max(...costs))];
  const small = names[costs.indexOf(Math.min(...costs))];
  expect(index.definitionsFor([big, 'ghost__tool', small], Math.min(...costs)).map((definition: { name: string }) => definition.name)).toEqual([small]);
});

test('call routes a namespaced call to the right server with the original tool name and reports tool errors without throwing', async () => {
  const index = await companyIndex();
  expect(await index.call('billing__refund_invoice', { invoice: 'INV-1001', reason: 'damaged' })).toEqual({ text: 'Refund of INV-1001 (49 USD) issued', isError: false });
  expect(JSON.parse((await index.call('crm__search', { query: 'ada' })).text)[0].id).toBe('C-7');
  expect(JSON.parse((await index.call('billing__search', { query: 'C-7' })).text)[0].invoice).toBe('INV-1001');
  const failed = await index.call('billing__refund_invoice', { invoice: 'INV-9', reason: 'x' });
  expect(failed.isError).toBe(true);
  expect(failed.text).toContain('INV-9');
  const unknown = await index.call('billing__delete_all', {});
  expect(unknown.isError).toBe(true);
  expect(unknown.text).toContain('billing__delete_all');
});

test('answerWithTools starts with only search_tools, loads matching tools on demand within the budget, and calls them through the index', async () => {
  const index = await companyIndex();
  fakeModel.reply(
    respond.toolCall('search_tools', { query: 'refund an invoice' }),
    respond.toolCall('billing__refund_invoice', { invoice: 'INV-1001', reason: 'arrived damaged' }),
    respond.text('Done: the refund for INV-1001 is on its way.'),
  );
  const result = await mod.answerWithTools(createModel(), index, 'Please refund invoice INV-1001, it arrived damaged.', { budgetTokens: 400, searchLimit: 2 });
  const [first, second, third] = fakeModel.requests;
  expect(first.tools.map((tool: { name: string }) => tool.name)).toEqual(['search_tools']);
  const offered = second.tools.map((tool: { name: string }) => tool.name);
  expect(offered[0]).toBe('search_tools');
  expect(offered).toContain('billing__refund_invoice');
  expect(offered.length).toBeLessThanOrEqual(3);
  expect(totalTokens(second.tools.slice(1))).toBeLessThanOrEqual(400);
  const toolMessage = third.messages[third.messages.length - 1];
  expect(toolMessage.role).toBe('tool');
  expect(toolMessage.toolCallId).toBe(fakeModel.responses[1].toolCalls[0].id);
  expect(toolMessage.content).toContain('Refund of INV-1001');
  expect(result.text).toBe('Done: the refund for INV-1001 is on its way.');
  expect(result.loadedTools).toContain('billing__refund_invoice');
  expect(result.rounds).toBe(3);
});

test('answerWithTools refuses tools that were not loaded, keeps every request within the budget and stops at maxRounds', async () => {
  await forEachSeed(10, async () => {
    const index = await companyIndex();
    fakeModel.reply(
      respond.toolCall('billing__refund_invoice', { invoice: 'INV-1001', reason: 'x' }),
      respond.oneOf([respond.toolCall('search_tools', { query: 'customer email address' }), respond.toolCall('search_tools', { query: 'knowledge base article' }), respond.toolCall('search_tools', { query: 'invoices and credit' })]),
      respond.toolCall('search_tools', { query: 'refund invoice customer search' }),
      respond.text('All set.'),
    );
    const result = await mod.answerWithTools(createModel(), index, 'Help me with my account.', { budgetTokens: 250, searchLimit: 3 });
    expect(result.text).toBe('All set.');
    const refused = fakeModel.requests[1].messages[fakeModel.requests[1].messages.length - 1];
    expect(JSON.parse(refused.content).error).toContain('search_tools');
    fakeModel.requests.forEach((request: { tools: Array<{ name: string }> }) => {
      expect(request.tools[0].name).toBe('search_tools');
      expect(totalTokens(request.tools.slice(1))).toBeLessThanOrEqual(250);
      expect(new Set(request.tools.map((tool) => tool.name)).size).toBe(request.tools.length);
    });
  });

  fakeModel.reset().handle(() => respond.toolCall('search_tools', { query: 'refund' }));
  const index = await companyIndex();
  const error = await captureError(mod.answerWithTools(createModel(), index, 'Loop forever', { maxRounds: 4 }));
  expect(error).toBeInstanceOf(mod.ToolLoopLimitError);
  expect(fakeModel.requests).toHaveLength(4);
});
