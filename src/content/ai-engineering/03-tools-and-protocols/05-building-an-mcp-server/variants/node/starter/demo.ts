import { z } from 'zod';
import { createMcpServer, PROTOCOL_VERSION } from './main';

const server = createMcpServer({
  name: 'helpdesk',
  version: '1.0.0',
  instructions: 'Search articles before opening a ticket.',
  tools: [
    {
      name: 'search_articles',
      description: 'Search help articles by keyword. Returns id and title of each match.',
      input: z.object({ query: z.string().min(2).describe('Keyword to look for in article titles') }),
      handler: ({ query }: { query: string }) => [{ id: 'kb-2', title: `Requesting a ${query}` }],
    },
    {
      name: 'create_ticket',
      description: 'Open a support ticket. Use only when no article answers the question.',
      input: z.object({ subject: z.string().min(5).describe('One-line summary of the problem') }),
      handler: ({ subject }: { subject: string }) => `Created ticket T-42: ${subject}`,
    },
  ],
  resources: [{ uri: 'helpdesk://policies/refunds', name: 'Refund policy', mimeType: 'text/markdown', read: () => 'Refunds within 30 days of delivery.' }],
});

const meta = {
  'io.modelcontextprotocol/protocolVersion': PROTOCOL_VERSION,
  'io.modelcontextprotocol/clientCapabilities': {},
  'io.modelcontextprotocol/clientInfo': { name: 'demo-client', version: '1.0.0' },
};

let nextId = 1;

async function exchange(label: string, message: Record<string, unknown>) {
  const line = JSON.stringify({ jsonrpc: '2.0', id: nextId++, ...message });
  const reply = await server.handle(line);
  const parsed = reply === undefined ? undefined : JSON.parse(reply);
  const summary = parsed === undefined ? '(no response)' : parsed.error ? `error ${parsed.error.code}: ${parsed.error.message}` : JSON.stringify(parsed.result, (key, value) => (key === '_meta' || key === 'inputSchema' ? undefined : value));
  console.log(`${label.padEnd(26)} ${summary}`);
}

async function main() {
  await exchange('server/discover', { method: 'server/discover', params: { _meta: meta } });
  await exchange('tools/list', { method: 'tools/list', params: { _meta: meta } });
  await exchange('tools/call search', { method: 'tools/call', params: { _meta: meta, name: 'search_articles', arguments: { query: 'refund' } } });
  await exchange('tools/call invalid args', { method: 'tools/call', params: { _meta: meta, name: 'create_ticket', arguments: { subject: 'Hi' } } });
  await exchange('tools/call unknown tool', { method: 'tools/call', params: { _meta: meta, name: 'delete_everything', arguments: {} } });
  await exchange('resources/read', { method: 'resources/read', params: { _meta: meta, uri: 'helpdesk://policies/refunds' } });
  await exchange('legacy initialize', { method: 'initialize', params: { protocolVersion: '2025-11-25', capabilities: {} } });
  await exchange('old protocol version', { method: 'tools/list', params: { _meta: { ...meta, 'io.modelcontextprotocol/protocolVersion': '2025-06-18' } } });
  console.log(`${'notification'.padEnd(26)} ${(await server.handle(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/cancelled', params: { requestId: 3 } }))) ?? '(no response)'}`);
}

main().catch((error) => console.error(`demo failed: ${error.message}`));
