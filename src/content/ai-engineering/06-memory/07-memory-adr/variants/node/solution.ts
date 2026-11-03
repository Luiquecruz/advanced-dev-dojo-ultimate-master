export const adr = {
  id: 1,
  title: 'Give Concierge a budgeted conversation memory and a per-user temporal graph',
  status: 'accepted',
  layer: 'context',
  context:
    'Concierge serves 400 000 EU customers in conversations of up to 300 turns, and customers return every few weeks. Memory may use at most 6 000 tokens per call. Customers ask about preferences, past incidents and how things were at a given time, while plans, addresses and devices change often. Household members share contracts but not memories. Concierge reads untrusted emails, bills and status pages. The GDPR applies: erasure within 30 days including derived data, and at most 365 days of retention.',
  decision:
    'We will keep a 4 000-token window plus running summary per conversation, store long-term facts per user in a temporal graph retrieved by relevance, recency and importance (top 12), reject instructions from untrusted sources, and expire memories after 365 days with erasure that includes summaries.',
  alternatives: [
    {
      option: 'Vector store for long-term memory',
      reason: 'It scores 90% on preference questions but only 58% on "at the time" questions, below the 85% target, because it cannot tell which fact was valid when.',
    },
    {
      option: 'Full conversation history on every call',
      reason: 'Sessions of up to 300 turns would blow through the 6 000-token memory budget and grow cost and latency with every turn.',
    },
    {
      option: 'One shared memory per contract',
      reason: 'Household members share contracts, so per-contract memory would show one person\'s chats and preferences to the others.',
    },
    {
      option: 'Let the agent rewrite playbooks from experience',
      reason: 'Playbook changes must be reviewed before use; automatic procedural updates would also turn one poisoned memory into behavior for every customer.',
    },
  ],
  consequences: {
    positive: [
      'Time-dependent questions reach 91% on the eval, and preference questions 89%, both above target.',
      'Every call stays within 6 000 tokens: 4 000 for the conversation and at most 960 for 12 memories.',
      'Erasure and expiry cover summaries and graph facts, so retention promises hold for derived data.',
    ],
    negative: [
      'Graph extraction, entity resolution and contradiction rules become critical components to evaluate and maintain.',
      'Retrieval p95 rises to 180 ms from 60 ms with a vector store, which adds to every reply.',
      'Rejected instruction-like text from emails can occasionally drop a legitimate fact, so refusals must be monitored.',
    ],
  },
};

export const memoryPlan = {
  types: ['working', 'episodic', 'semantic', 'procedural'],
  procedureUpdates: 'reviewed',
  conversation: { strategy: 'window-plus-summary', maxTokens: 4000, keepRecentMessages: 6 },
  longTerm: { store: 'temporal-graph', topK: 12, weights: { relevance: 1, recency: 0.6, importance: 0.8 } },
  isolation: 'per-user',
  untrustedInstructions: 'reject',
  retentionDays: 365,
  erasure: { maxDays: 30, includesDerived: true },
};
