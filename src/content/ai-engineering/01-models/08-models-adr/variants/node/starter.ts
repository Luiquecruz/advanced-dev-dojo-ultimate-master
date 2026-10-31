export const adr = {
  id: 1,
  // TODO: a short title naming the decision
  title: '',
  // TODO: accept the decision
  status: 'proposed',
  layer: 'model',
  // TODO: the forces from the briefing: volume, latency budget, quality target, budget, EU data rule, availability
  context: '',
  // TODO: one sentence starting with "We will", naming the primary, the escalation and the fallback
  decision: '',
  // TODO: at least two { option, reason } you considered and rejected, each reason citing a fact from the briefing
  alternatives: [] as Array<{ option: string; reason: string }>,
  // TODO: what the team gains and what it pays or must watch
  consequences: { positive: [] as string[], negative: [] as string[] },
};

export const modelPlan = {
  // TODO: model ids from the briefing table (pinned snapshots, no -latest aliases)
  primary: 'atlas-mini-latest',
  escalation: null as string | null,
  // TODO: a mechanical rule: when does an answer escalate?
  escalationRule: '',
  fallback: 'atlas-pro-latest',
  // TODO: 1 800 x (primary cost per 1 000 + rejection rate x escalation cost per 1 000) + fixed monthly costs
  projectedMonthlyUsd: 0,
};
