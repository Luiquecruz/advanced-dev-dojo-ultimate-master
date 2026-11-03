export const adr = {
  id: 3,
  title: 'Reach Relay tools through MCP, delegate carrier claims over A2A and load tools on demand',
  status: 'accepted',
  layer: 'harness',
  context:
    'Relay needs five systems. The knowledge base and the CRM are shared with the internal chat assistant, IDE agents and the sales assistant, and the CRM vendor ships an MCP server. Refunds move money and must be approved by a human support agent. ShipFast handles lost-parcel claims through its own agent over 2 to 10 days. The company MCP gateway exposes 64 tools (about 22 400 tokens of definitions) while one request may spend at most 6 000 tokens on tools, a tool round takes 1.2 s at p95 and a reply must be ready within 8 s.',
  decision:
    'We will call the order database and the refund service with in-process function calling, connect the knowledge base and the CRM over MCP, delegate carrier claims to ShipFast over A2A, load gateway tools on demand within a 4 000-token budget, require human approval for every write tool and stop after 5 tool rounds.',
  alternatives: [
    { option: 'Send all 64 gateway tools on every request', reason: 'About 22 400 tokens of definitions is almost four times the 6 000-token budget, and similar tools would hurt selection.' },
    { option: 'Wrap the carrier claims agent as a synchronous tool', reason: 'Claims take 2 to 10 days and may ask for photos; a tool call cannot wait that long or pause for input, while A2A tasks can.' },
    { option: 'Our own MCP server for the CRM', reason: 'The vendor already ships an official MCP server; writing our own duplicates work and drifts from their API.' },
    { option: 'Let Relay issue refunds autonomously', reason: 'Refunds move money and the briefing requires a human support agent to approve every one.' },
  ],
  consequences: {
    positive: [
      'Tool definitions per request stay under 4 000 tokens, leaving room in the 6 000-token budget for the tools a task loads.',
      'Knowledge base and CRM integrations are shared with the other assistants instead of being rebuilt per application.',
      'No money moves without a human approval, and long carrier claims do not block the conversation.',
    ],
    negative: [
      'On-demand loading adds one model round when a needed tool is not loaded yet.',
      'The MCP gateway and the vendor CRM server become dependencies we must pin, monitor and review for tool description changes.',
      'A2A tasks need persistence and webhook handling for updates that arrive days later.',
    ],
  },
};

export const integrations = [
  { system: 'orders-db', mechanism: 'function-calling', reason: 'Only Relay uses it and the same team owns both, so an in-process tool avoids a protocol hop.' },
  { system: 'refunds', mechanism: 'function-calling', reason: 'Only Relay uses it; keeping it in-process lets our code enforce the human approval step before calling it.' },
  { system: 'knowledge-base', mechanism: 'mcp', reason: 'Shared by Relay, the internal chat assistant and IDE agents, so one MCP server serves every host.' },
  { system: 'crm', mechanism: 'mcp', reason: 'Shared with the sales assistant, and the vendor already ships an official MCP server.' },
  { system: 'carrier-claims', mechanism: 'a2a', reason: 'An opaque external agent with multi-day tasks that may ask for input: an A2A task, not a tool call.' },
];

export const toolPlan = {
  tools: [
    {
      name: 'search_orders',
      system: 'orders-db',
      description: "Find a customer's orders by checkout email, most recent first, with id, status, total and date.",
      readOnly: true,
      requiresApproval: false,
      maxOutputTokens: 800,
      errorContract: 'Invalid arguments and unknown customers come back as an error text naming the field and a hint.',
    },
    {
      name: 'get_order',
      system: 'orders-db',
      description: 'Fetch one order by id (format A-1234) with its items, shipping status and tracking number.',
      readOnly: true,
      requiresApproval: false,
      maxOutputTokens: 600,
      errorContract: 'An unknown order id returns an error text suggesting search_orders.',
    },
    {
      name: 'request_refund',
      system: 'refunds',
      description: 'Propose a refund for a delivered order; a human support agent must approve it before money moves.',
      readOnly: false,
      requiresApproval: true,
      maxOutputTokens: 300,
      errorContract: 'Rejected or ineligible refunds return isError with the policy rule that blocked them.',
    },
    {
      name: 'search_articles',
      system: 'knowledge-base',
      description: 'Search help center articles by keywords and return titles, ids and a one-line summary.',
      readOnly: true,
      requiresApproval: false,
      maxOutputTokens: 1000,
      errorContract: 'Server failures return isError with a sentence telling the model to answer without articles.',
    },
    {
      name: 'find_customer',
      system: 'crm',
      description: 'Look up a customer record by email: name, plan, open cases and preferred language.',
      readOnly: true,
      requiresApproval: false,
      maxOutputTokens: 500,
      errorContract: 'No match returns an error text asking to confirm the email with the customer.',
    },
    {
      name: 'open_carrier_claim',
      system: 'carrier-claims',
      description: 'Start a lost-parcel claim with ShipFast for an order; returns the claim task id to track later.',
      readOnly: false,
      requiresApproval: true,
      maxOutputTokens: 300,
      errorContract: 'A rejected A2A task returns an error text with the carrier reason and the next step.',
    },
  ],
  loading: { strategy: 'search-on-demand', budgetTokens: 4000, alwaysLoaded: ['search_orders', 'get_order', 'search_articles'] },
  maxToolRounds: 5,
  contextFile: 'AGENTS.md',
};
