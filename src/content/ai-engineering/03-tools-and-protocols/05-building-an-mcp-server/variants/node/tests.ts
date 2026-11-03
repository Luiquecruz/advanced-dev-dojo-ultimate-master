const { z } = require('zod');

const META = {
  'io.modelcontextprotocol/protocolVersion': '2026-07-28',
  'io.modelcontextprotocol/clientCapabilities': {},
  'io.modelcontextprotocol/clientInfo': { name: 'dojo-tests', version: '1.0.0' },
};

const ARTICLES = [
  { id: 'kb-1', title: 'Resetting your password', body: 'Use the "Forgot password" link on the sign-in page.' },
  { id: 'kb-2', title: 'Requesting a refund', body: 'Refunds are accepted within 30 days of delivery.' },
];

function helpdeskServer() {
  const searchArticles = fn(({ query, limit }: { query: string; limit: number }) =>
    ARTICLES.filter((article) => article.title.toLowerCase().includes(query.toLowerCase())).slice(0, limit).map(({ id, title }) => ({ id, title })),
  );
  const createTicket = fn(({ subject }: { subject: string }) => {
    if (subject.includes('outage')) {
      throw new Error('The ticketing backend is in maintenance until 14:00 UTC');
    }
    return `Created ticket T-42: ${subject}`;
  });
  const server = mod.createMcpServer({
    name: 'helpdesk',
    version: '1.4.0',
    instructions: 'Search articles before creating tickets.',
    tools: [
      { name: 'search_articles', description: 'Search help articles by title.', input: z.object({ query: z.string().min(2), limit: z.number().int().min(1).max(10).default(5) }), handler: searchArticles },
      { name: 'create_ticket', description: 'Open a support ticket.', input: z.object({ subject: z.string().min(5) }), handler: createTicket },
    ],
    resources: [{ uri: 'helpdesk://policies/refunds', name: 'Refund policy', mimeType: 'text/markdown', read: () => '# Refunds\nWithin 30 days of delivery.' }],
  });
  return { server, searchArticles, createTicket };
}

async function send(server: { handle(message: string): Promise<string | undefined> }, message: unknown) {
  const reply = await server.handle(typeof message === 'string' ? message : JSON.stringify(message));
  return reply === undefined ? undefined : JSON.parse(reply);
}

function rpc(server: { handle(message: string): Promise<string | undefined> }, method: string, params: Record<string, unknown> = {}, id: string | number = 1) {
  return send(server, { jsonrpc: '2.0', id, method, params: { ...params, _meta: META } });
}

function expectCompleteResult(response: any, id: string | number) {
  expect(response.jsonrpc).toBe('2.0');
  expect(response.id).toBe(id);
  expect(response.error).toBeUndefined();
  expect(response.result.resultType).toBe('complete');
  expect(response.result._meta['io.modelcontextprotocol/serverInfo']).toEqual({ name: 'helpdesk', version: '1.4.0' });
}

function expectCacheable(result: any) {
  expect(typeof result.ttlMs).toBe('number');
  expect(['public', 'private']).toContain(result.cacheScope);
}

test('server/discover advertises the supported version, capabilities, identity and instructions', async () => {
  const { server } = helpdeskServer();
  const response = await rpc(server, 'server/discover', {}, 'discover-1');
  expectCompleteResult(response, 'discover-1');
  expect(response.result.supportedVersions).toEqual(['2026-07-28']);
  expect(response.result.capabilities).toEqual(expect.objectContaining({ tools: expect.any(Object), resources: expect.any(Object) }));
  expect(response.result.instructions).toBe('Search articles before creating tickets.');
  expectCacheable(response.result);
});

test('every request must declare its protocol version and client capabilities in _meta; a legacy initialize is refused with the supported version', async () => {
  const { server } = helpdeskServer();
  const noMeta = await send(server, { jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} });
  expect(noMeta.error.code).toBe(-32602);
  expect(noMeta.id).toBe(1);
  const noParams = await send(server, { jsonrpc: '2.0', id: 2, method: 'tools/list' });
  expect(noParams.error.code).toBe(-32602);
  const noCapabilities = await send(server, { jsonrpc: '2.0', id: 3, method: 'tools/list', params: { _meta: { 'io.modelcontextprotocol/protocolVersion': '2026-07-28' } } });
  expect(noCapabilities.error.code).toBe(-32602);

  const old = await send(server, { jsonrpc: '2.0', id: 4, method: 'tools/list', params: { _meta: { ...META, 'io.modelcontextprotocol/protocolVersion': '2025-06-18' } } });
  expect(old.id).toBe(4);
  expect(old.error.code).toBe(-32022);
  expect(old.error.data).toEqual({ supported: ['2026-07-28'], requested: '2025-06-18' });

  const legacy = await send(server, { jsonrpc: '2.0', id: 5, method: 'initialize', params: { protocolVersion: '2025-11-25', capabilities: {}, clientInfo: { name: 'old', version: '1' } } });
  expect(legacy.id).toBe(5);
  expect(legacy.error.code).toBe(-32601);
  expect(legacy.error.message).toContain('2026-07-28');
});

test('speaks JSON-RPC 2.0: parse errors, invalid requests and unknown methods get the standard codes, notifications get no response', async () => {
  const { server } = helpdeskServer();
  expect(await send(server, '{"jsonrpc": "2.0", "id": 1, "method": ')).toEqual({ jsonrpc: '2.0', id: null, error: expect.objectContaining({ code: -32700 }) });
  const wrongVersion = await send(server, { jsonrpc: '1.0', id: 7, method: 'tools/list', params: { _meta: META } });
  expect(wrongVersion.error.code).toBe(-32600);
  expect(wrongVersion.id).toBe(7);
  expect((await send(server, { jsonrpc: '2.0', id: 8, params: {} })).error.code).toBe(-32600);
  expect((await send(server, [1, 2])).error.code).toBe(-32600);
  const unknown = await rpc(server, 'prompts/list', {}, 9);
  expect(unknown.id).toBe(9);
  expect(unknown.error.code).toBe(-32601);
  expect(await send(server, { jsonrpc: '2.0', method: 'notifications/cancelled', params: { requestId: 3 } })).toBeUndefined();
  expect(await send(server, { jsonrpc: '2.0', method: 'notifications/whatever' })).toBeUndefined();
});

test('tools/list describes every tool with a JSON Schema derived from its Zod input, in a stable order, without exposing handlers', async () => {
  const { server } = helpdeskServer();
  const first = await rpc(server, 'tools/list', {}, 'list-1');
  expectCompleteResult(first, 'list-1');
  expectCacheable(first.result);
  const tools = first.result.tools;
  expect(tools.map((tool: { name: string }) => tool.name)).toEqual(['search_articles', 'create_ticket']);
  expect(Object.keys(tools[0]).sort()).toEqual(['description', 'inputSchema', 'name']);
  expect(tools[0].description).toBe('Search help articles by title.');
  expect(tools[0].inputSchema.type).toBe('object');
  expect(tools[0].inputSchema.required).toEqual(['query']);
  expect(tools[0].inputSchema.properties.limit).toEqual(expect.objectContaining({ type: 'integer', default: 5 }));
  const second = await rpc(server, 'tools/list', {}, 'list-2');
  expect(second.result.tools).toEqual(tools);
});

test('tools/call returns text content, with structuredContent for object results, and isError false', async () => {
  const { server, searchArticles } = helpdeskServer();
  const search = await rpc(server, 'tools/call', { name: 'search_articles', arguments: { query: 'refund' } }, 10);
  expectCompleteResult(search, 10);
  expect(searchArticles).toHaveBeenCalledWith({ query: 'refund', limit: 5 });
  expect(search.result.isError).toBe(false);
  expect(search.result.structuredContent).toEqual([{ id: 'kb-2', title: 'Requesting a refund' }]);
  expect(search.result.content).toEqual([{ type: 'text', text: JSON.stringify([{ id: 'kb-2', title: 'Requesting a refund' }]) }]);

  const ticket = await rpc(server, 'tools/call', { name: 'create_ticket', arguments: { subject: 'Cannot log in' } }, 11);
  expect(ticket.result).toEqual(expect.objectContaining({ content: [{ type: 'text', text: 'Created ticket T-42: Cannot log in' }], isError: false }));
  expect(ticket.result.structuredContent).toBeUndefined();
});

test('tools/call separates protocol errors (unknown tool, malformed params) from tool execution errors the model can fix (isError: true)', async () => {
  const { server, createTicket } = helpdeskServer();
  const unknown = await rpc(server, 'tools/call', { name: 'delete_everything', arguments: {} }, 20);
  expect(unknown.error.code).toBe(-32602);
  expect(unknown.error.message).toContain('delete_everything');
  expect((await rpc(server, 'tools/call', { arguments: {} }, 21)).error.code).toBe(-32602);
  expect((await rpc(server, 'tools/call', { name: 'create_ticket', arguments: 'subject=help' }, 22)).error.code).toBe(-32602);

  const invalid = await rpc(server, 'tools/call', { name: 'create_ticket', arguments: { subject: 'Hi' } }, 23);
  expectCompleteResult(invalid, 23);
  expect(invalid.result.isError).toBe(true);
  expect(invalid.result.content[0].type).toBe('text');
  expect(invalid.result.content[0].text).toContain('subject');
  expect(createTicket).not.toHaveBeenCalled();

  const failing = await rpc(server, 'tools/call', { name: 'create_ticket', arguments: { subject: 'Report an outage' } }, 24);
  expect(failing.result.isError).toBe(true);
  expect(failing.result.content[0].text).toContain('maintenance until 14:00 UTC');
});

test('resources/list and resources/read expose resources by URI, and an unknown URI is an invalid-params error carrying the URI', async () => {
  const { server } = helpdeskServer();
  const list = await rpc(server, 'resources/list', {}, 30);
  expectCompleteResult(list, 30);
  expectCacheable(list.result);
  expect(list.result.resources).toEqual([{ uri: 'helpdesk://policies/refunds', name: 'Refund policy', mimeType: 'text/markdown' }]);

  const read = await rpc(server, 'resources/read', { uri: 'helpdesk://policies/refunds' }, 31);
  expectCompleteResult(read, 31);
  expectCacheable(read.result);
  expect(read.result.contents).toEqual([{ uri: 'helpdesk://policies/refunds', mimeType: 'text/markdown', text: '# Refunds\nWithin 30 days of delivery.' }]);

  const missing = await rpc(server, 'resources/read', { uri: 'helpdesk://policies/shipping' }, 32);
  expect(missing.id).toBe(32);
  expect(missing.error.code).toBe(-32602);
  expect(missing.error.data).toEqual({ uri: 'helpdesk://policies/shipping' });
});
