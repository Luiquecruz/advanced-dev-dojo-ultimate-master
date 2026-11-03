export interface McpServer {
  handle(message: string): Promise<string | undefined>;
}

export interface FixtureTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  run(args: Record<string, any>): string;
}

const VERSION = '2026-07-28';

function stringParameter(name: string, description: string) {
  return { type: 'object', properties: { [name]: { type: 'string', description } }, required: [name], additionalProperties: false };
}

function reply(id: unknown, body: Record<string, unknown>): string {
  return JSON.stringify({ jsonrpc: '2.0', id, ...body });
}

/**
 * A small MCP 2026-07-28 server for the challenge: server/discover, paginated tools/list and tools/call.
 */
export function createFixtureServer({ name, tools, pageSize = 2 }: { name: string; tools: FixtureTool[]; pageSize?: number }): McpServer {
  return {
    async handle(message: string): Promise<string | undefined> {
      const request = JSON.parse(message);
      if (request.id === undefined) {
        return undefined;
      }
      const meta = request.params?._meta ?? {};
      if (typeof meta['io.modelcontextprotocol/protocolVersion'] !== 'string' || typeof meta['io.modelcontextprotocol/clientCapabilities'] !== 'object') {
        return reply(request.id, { error: { code: -32602, message: 'Missing required _meta fields' } });
      }
      if (meta['io.modelcontextprotocol/protocolVersion'] !== VERSION) {
        return reply(request.id, { error: { code: -32022, message: 'Unsupported protocol version', data: { supported: [VERSION], requested: meta['io.modelcontextprotocol/protocolVersion'] } } });
      }
      const complete = (result: Record<string, unknown>) => reply(request.id, { result: { resultType: 'complete', ...result, _meta: { 'io.modelcontextprotocol/serverInfo': { name, version: '1.0.0' } } } });
      switch (request.method) {
        case 'server/discover':
          return complete({ supportedVersions: [VERSION], capabilities: { tools: {} }, ttlMs: 60000, cacheScope: 'public' });
        case 'tools/list': {
          const start = request.params.cursor === undefined ? 0 : Number(request.params.cursor);
          const page = tools.slice(start, start + pageSize).map(({ name: toolName, description, inputSchema }) => ({ name: toolName, description, inputSchema }));
          const next = start + pageSize < tools.length ? { nextCursor: String(start + pageSize) } : {};
          return complete({ tools: page, ...next, ttlMs: 60000, cacheScope: 'public' });
        }
        case 'tools/call': {
          const tool = tools.find((candidate) => candidate.name === request.params.name);
          if (!tool) {
            return reply(request.id, { error: { code: -32602, message: `Unknown tool: ${request.params.name}` } });
          }
          try {
            return complete({ content: [{ type: 'text', text: tool.run(request.params.arguments ?? {}) }], isError: false });
          } catch (error) {
            return complete({ content: [{ type: 'text', text: (error as Error).message }], isError: true });
          }
        }
        default:
          return reply(request.id, { error: { code: -32601, message: `Method not found: ${request.method}` } });
      }
    },
  };
}

/**
 * A server that fails every request with an internal error, like a crashed or misconfigured process.
 */
export function createBrokenServer(): McpServer {
  return {
    async handle(message: string) {
      const request = JSON.parse(message);
      return request.id === undefined ? undefined : reply(request.id, { error: { code: -32603, message: 'Internal error: database unavailable' } });
    },
  };
}

export const CRM_TOOLS: FixtureTool[] = [
  {
    name: 'search',
    description: 'Search customers by name or email address. Returns matching customer ids and names.',
    inputSchema: stringParameter('query', 'Part of a customer name or email'),
    run: ({ query }) => JSON.stringify([{ id: 'C-7', name: 'Ada Lovelace', email: 'ada@example.com' }].filter((customer) => `${customer.name} ${customer.email}`.toLowerCase().includes(String(query).toLowerCase()))),
  },
  {
    name: 'find_customer',
    description: 'Fetch one customer profile by customer id (format C-123): name, email, plan and signup date.',
    inputSchema: stringParameter('customerId', 'Customer id such as C-7'),
    run: ({ customerId }) => {
      if (customerId !== 'C-7') {
        throw new Error(`No customer ${customerId}. Use search to find the id.`);
      }
      return JSON.stringify({ id: 'C-7', name: 'Ada Lovelace', email: 'ada@example.com', plan: 'pro', since: '2024-02-01' });
    },
  },
  {
    name: 'update_customer_email',
    description: "Change a customer's contact email address after the customer confirmed the new address.",
    inputSchema: { type: 'object', properties: { customerId: { type: 'string' }, email: { type: 'string' } }, required: ['customerId', 'email'] },
    run: ({ customerId, email }) => `Email of ${customerId} changed to ${email}`,
  },
  {
    name: 'list_customer_notes',
    description: 'List the notes support agents wrote about a customer, newest first.',
    inputSchema: stringParameter('customerId', 'Customer id such as C-7'),
    run: () => JSON.stringify(['2026-10-01: asked about annual billing']),
  },
];

export const BILLING_TOOLS: FixtureTool[] = [
  {
    name: 'search',
    description: 'Search invoices by invoice number or customer id. Returns invoice numbers, amounts and status.',
    inputSchema: stringParameter('query', 'Invoice number such as INV-1001, or a customer id'),
    run: ({ query }) => JSON.stringify([{ invoice: 'INV-1001', customerId: 'C-7', amount: 49, status: 'paid' }].filter((invoice) => `${invoice.invoice} ${invoice.customerId}`.includes(String(query)))),
  },
  {
    name: 'list_invoices',
    description: 'List all invoices of a customer with amount, due date and payment status.',
    inputSchema: stringParameter('customerId', 'Customer id such as C-7'),
    run: () => JSON.stringify([{ invoice: 'INV-1001', amount: 49, status: 'paid' }]),
  },
  {
    name: 'refund_invoice',
    description: 'Refund a paid invoice to the original payment method. Requires the invoice number and a reason.',
    inputSchema: { type: 'object', properties: { invoice: { type: 'string', description: 'Invoice number such as INV-1001' }, reason: { type: 'string' } }, required: ['invoice', 'reason'] },
    run: ({ invoice }) => {
      if (invoice !== 'INV-1001') {
        throw new Error(`Invoice ${invoice} does not exist or is not paid.`);
      }
      return `Refund of INV-1001 (49 USD) issued`;
    },
  },
  {
    name: 'apply_credit',
    description: "Add account credit to a customer's balance, used for goodwill gestures.",
    inputSchema: { type: 'object', properties: { customerId: { type: 'string' }, amount: { type: 'number' } }, required: ['customerId', 'amount'] },
    run: ({ customerId, amount }) => `Credit of ${amount} USD added to ${customerId}`,
  },
];

export const DOCS_TOOLS: FixtureTool[] = [
  {
    name: 'search',
    description: 'Search the internal knowledge base articles about policies and procedures by keyword.',
    inputSchema: stringParameter('query', 'Keywords, such as "refund policy"'),
    run: () => JSON.stringify([{ id: 'KB-12', title: 'Refund policy: 30 days after delivery' }]),
  },
  {
    name: 'get_article',
    description: 'Read the full text of one knowledge base article by id (format KB-12).',
    inputSchema: stringParameter('articleId', 'Article id such as KB-12'),
    run: () => 'Refunds are accepted within 30 days of delivery, to the original payment method.',
  },
];

export function createCompanyServers() {
  return [
    { id: 'crm', server: createFixtureServer({ name: 'crm', tools: CRM_TOOLS }) },
    { id: 'billing', server: createFixtureServer({ name: 'billing', tools: BILLING_TOOLS }) },
    { id: 'docs', server: createFixtureServer({ name: 'docs', tools: DOCS_TOOLS }) },
  ];
}
