export const adr = {
  id: 7,
  // TODO: a short title naming the decision
  title: '',
  // TODO: accept the decision
  status: 'proposed',
  layer: 'loop',
  // TODO: the forces from the briefing: pilot results and steps, cost and time per ticket, approvals, redeploys
  context: '',
  // TODO: one sentence starting with "We will", naming the pattern, the gated tool, the budgets, durability and the handoff
  decision: '',
  // TODO: at least two { option, reason } you considered and rejected, each reason citing a fact from the briefing
  alternatives: [] as Array<{ option: string; reason: string }>,
  // TODO: what the team gains and what it pays or must watch
  consequences: { positive: [] as string[], negative: [] as string[] },
};

export const agentPlan = {
  // TODO: does the pilot support a fixed workflow?
  pattern: 'workflow',
  goal: '',
  // TODO: only the tools a refund needs
  tools: ['get_order', 'issue_refund', 'run_sql'],
  // TODO: which risky calls need a human, and when?
  approvals: [] as Array<{ tool: string; rule: string }>,
  // TODO: enough for the p95 run, within $0.15 and 3 minutes per ticket
  budget: { maxSteps: 100, maxCostUsd: 1, maxDurationMs: 600000 },
  stuckRepeatLimit: 0,
  // TODO: what happens to a ticket the agent cannot finish?
  onBudgetExhausted: 'retry',
  // TODO: survive redeploys during 24-hour approvals without paying twice
  durability: { checkpointEveryStep: false, idempotentTools: [] as string[] },
  // TODO: at least three { failure, mitigation }
  failureModes: [] as Array<{ failure: string; mitigation: string }>,
};
