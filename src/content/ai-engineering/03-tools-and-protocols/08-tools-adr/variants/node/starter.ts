export const adr = {
  id: 3,
  // TODO: a short title naming the decision
  title: '',
  // TODO: accept the decision
  status: 'proposed',
  layer: 'harness',
  // TODO: the forces from the briefing: shared systems, approvals for refunds, the external agent, 64 tools vs the 6 000-token budget, latency
  context: '',
  // TODO: one sentence starting with "We will", naming the mechanisms, the loading strategy, approvals and the round limit
  decision: '',
  // TODO: at least two { option, reason } you rejected, each reason citing a fact from the briefing
  alternatives: [] as Array<{ option: string; reason: string }>,
  // TODO: what the team gains and what it pays or must watch
  consequences: { positive: [] as string[], negative: [] as string[] },
};

// TODO: one { system, mechanism: 'function-calling' | 'mcp' | 'a2a', reason } per system id of the briefing
export const integrations: Array<{ system: string; mechanism: string; reason: string }> = [
  { system: 'orders-db', mechanism: 'mcp', reason: '' },
];

export const toolPlan = {
  // TODO: at least 4 tools { name, system, description, readOnly, requiresApproval, maxOutputTokens, errorContract }
  tools: [] as Array<{ name: string; system: string; description: string; readOnly: boolean; requiresApproval: boolean; maxOutputTokens: number; errorContract: string }>,
  // TODO: choose the strategy and a budget that fit the briefing
  loading: { strategy: 'all-upfront', budgetTokens: 22400, alwaysLoaded: [] as string[] },
  maxToolRounds: 20,
  contextFile: 'CLAUDE.md',
};
