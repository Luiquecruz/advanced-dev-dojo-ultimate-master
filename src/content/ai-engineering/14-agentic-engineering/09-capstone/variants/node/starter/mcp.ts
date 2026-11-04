import { z } from 'zod';
import type { ToolDefinition } from '@dojo/ai';
import type { Invoice } from './briefing';
import type { Retriever } from './retrieval';

export const PROTOCOL_VERSION = '2026-07-28';
const PROTOCOL_VERSION_KEY = 'io.modelcontextprotocol/protocolVersion';
const CLIENT_CAPABILITIES_KEY = 'io.modelcontextprotocol/clientCapabilities';
const SERVER_INFO_KEY = 'io.modelcontextprotocol/serverInfo';

export interface McpTool {
  name: string;
  description: string;
  input: z.ZodType;
  handler(args: any): unknown;
}

export interface McpServer {
  handle(message: string): Promise<string | undefined>;
}

export interface ToolResult {
  isError: boolean;
  text: string;
  structuredContent?: unknown;
}

export interface McpClient {
  listTools(): Promise<ToolDefinition[]>;
  callTool(name: string, args: Record<string, unknown>): Promise<ToolResult>;
}

export class McpError extends Error {
  readonly code: number;

  constructor(code: number, message: string) {
    super(message);
    this.name = 'McpError';
    this.code = code;
  }
}

/**
 * A minimal MCP server for the 2026-07-28 revision: stateless JSON-RPC, protocol version in `_meta` on every request, tools only.
 */
export function createMcpServer({ name, version, tools }: { name: string; version: string; tools: McpTool[] }): McpServer {
  const failure = (id: unknown, code: number, message: string) => JSON.stringify({ jsonrpc: '2.0', id: id ?? null, error: { code, message } });
  const success = (id: unknown, result: Record<string, unknown>) =>
    JSON.stringify({ jsonrpc: '2.0', id, result: { resultType: 'complete', ...result, _meta: { [SERVER_INFO_KEY]: { name, version } } } });

  async function callTool(params: Record<string, any>) {
    const tool = tools.find((candidate) => candidate.name === params.name);
    if (!tool) {
      throw new McpError(-32602, `Unknown tool: ${params.name}`);
    }
    const parsed = tool.input.safeParse(params.arguments ?? {});
    if (!parsed.success) {
      const issues = parsed.error.issues.map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`).join('; ');
      return { content: [{ type: 'text', text: `Invalid arguments for ${tool.name}: ${issues}` }], isError: true };
    }
    try {
      const value = await tool.handler(parsed.data);
      return typeof value === 'string'
        ? { content: [{ type: 'text', text: value }], isError: false }
        : { content: [{ type: 'text', text: JSON.stringify(value) }], structuredContent: value, isError: false };
    } catch (error) {
      return { content: [{ type: 'text', text: `${tool.name} failed: ${(error as Error).message}` }], isError: true };
    }
  }

  return {
    async handle(message) {
      let request: any;
      try {
        request = JSON.parse(message);
      } catch {
        return failure(null, -32700, 'Parse error');
      }
      if (request?.jsonrpc !== '2.0' || typeof request.method !== 'string') {
        return failure(request?.id, -32600, 'Invalid Request');
      }
      if (!('id' in request)) {
        return undefined;
      }
      const params = request.params ?? {};
      if (params._meta?.[PROTOCOL_VERSION_KEY] !== PROTOCOL_VERSION || typeof params._meta?.[CLIENT_CAPABILITIES_KEY] !== 'object') {
        return failure(request.id, -32602, `Every request must carry protocol version ${PROTOCOL_VERSION} and client capabilities in _meta`);
      }
      try {
        switch (request.method) {
          case 'server/discover':
            return success(request.id, { supportedVersions: [PROTOCOL_VERSION], capabilities: { tools: {} }, ttlMs: 60_000, cacheScope: 'public' });
          case 'tools/list':
            return success(request.id, {
              tools: tools.map((tool) => {
                const { $schema, ...inputSchema } = z.toJSONSchema(tool.input, { io: 'input' }) as Record<string, unknown>;
                return { name: tool.name, description: tool.description, inputSchema };
              }),
              ttlMs: 60_000,
              cacheScope: 'public',
            });
          case 'tools/call':
            return success(request.id, await callTool(params));
          default:
            return failure(request.id, -32601, `Method not found: ${request.method}`);
        }
      } catch (error) {
        return error instanceof McpError ? failure(request.id, error.code, error.message) : failure(request.id, -32603, 'Internal error');
      }
    },
  };
}

/**
 * A client over the in-memory transport: every request carries the protocol version and the client capabilities.
 */
export function createMcpClient(server: McpServer): McpClient {
  let nextId = 1;

  async function request(method: string, params: Record<string, unknown> = {}) {
    const message = { jsonrpc: '2.0', id: nextId++, method, params: { ...params, _meta: { [PROTOCOL_VERSION_KEY]: PROTOCOL_VERSION, [CLIENT_CAPABILITIES_KEY]: {} } } };
    const response = JSON.parse((await server.handle(JSON.stringify(message))) ?? 'null');
    if (response?.error) {
      throw new McpError(response.error.code, response.error.message);
    }
    return response.result;
  }

  return {
    async listTools() {
      const result = await request('tools/list');
      return result.tools.map((tool: { name: string; description: string; inputSchema: Record<string, unknown> }) => ({ name: tool.name, description: tool.description, parameters: tool.inputSchema }));
    },
    async callTool(name, args) {
      const result = await request('tools/call', { name, arguments: args });
      const text = result.content.map((block: { text: string }) => block.text).join('\n');
      return result.structuredContent === undefined ? { isError: result.isError, text } : { isError: result.isError, text, structuredContent: result.structuredContent };
    },
  };
}

export interface SupportServer {
  server: McpServer;
  executed: { name: string; arguments: Record<string, unknown> }[];
  refunds: { refundId: string; invoiceId: string; amountUsd: number; reason: string }[];
  outbox: { to: string; subject: string; body: string }[];
}

/**
 * The support tools behind MCP: help center search, invoice lookup, refunds and an email tool the policy must keep closed.
 */
export function createSupportServer({ retriever, invoices }: { retriever: Retriever; invoices: Invoice[] }): SupportServer {
  const executed: SupportServer['executed'] = [];
  const refunds: SupportServer['refunds'] = [];
  const outbox: SupportServer['outbox'] = [];
  const findInvoice = (invoiceId: string) => {
    const invoice = invoices.find((candidate) => candidate.id === invoiceId);
    if (!invoice) {
      throw new Error(`Invoice ${invoiceId} not found`);
    }
    return invoice;
  };
  const logged = (name: string, handler: (args: any) => unknown) => (args: any) => {
    executed.push({ name, arguments: args });
    return handler(args);
  };

  const tools: McpTool[] = [
    {
      name: 'search_docs',
      description: 'Search the help center and internal support procedures. Returns the best matching documents with their ids; cite them as [id].',
      input: z.object({ query: z.string().min(1), topK: z.number().int().min(1).max(5).optional() }),
      handler: logged('search_docs', ({ query, topK }) => ({ hits: retriever.search(query, { topK: topK ?? 3 }) })),
    },
    {
      name: 'get_invoice',
      description: 'Look up one invoice by id (for example INV-1001): customer, amount in USD, status and the note the customer wrote.',
      input: z.object({ invoiceId: z.string() }),
      handler: logged('get_invoice', ({ invoiceId }) => findInvoice(invoiceId)),
    },
    {
      name: 'issue_refund',
      description: 'Refund part or all of a paid invoice. Requires a reason.',
      input: z.object({ invoiceId: z.string(), amountUsd: z.number().positive(), reason: z.string().min(3) }),
      handler: logged('issue_refund', ({ invoiceId, amountUsd, reason }) => {
        const invoice = findInvoice(invoiceId);
        if (amountUsd > invoice.amountUsd) {
          throw new Error(`Refund of ${amountUsd} USD is above the invoice amount of ${invoice.amountUsd} USD`);
        }
        const refund = { refundId: `RF-${refunds.length + 1}`, invoiceId, amountUsd, reason };
        refunds.push(refund);
        return refund;
      }),
    },
    {
      name: 'send_email',
      description: 'Send an email to any address.',
      input: z.object({ to: z.string(), subject: z.string(), body: z.string() }),
      handler: logged('send_email', (email) => {
        outbox.push(email);
        return `Email sent to ${email.to}`;
      }),
    },
  ];

  return { server: createMcpServer({ name: 'ledgerly-support', version: '1.0.0', tools }), executed, refunds, outbox };
}
