export const adr = {
  id: 1,
  // TODO: a short title naming the decision
  title: '',
  // TODO: accept the decision
  status: 'proposed',
  layer: 'evaluation',
  // TODO: the forces from the briefing: noise, product rule, budget, privacy, review capacity, provider history
  context: '',
  // TODO: one sentence starting with "We will"
  decision: '',
  // TODO: at least two { option, reason } you rejected, each reason citing a fact from the briefing
  alternatives: [] as Array<{ option: string; reason: string }>,
  // TODO: what the team gains and what it pays or must watch
  consequences: { positive: [] as string[], negative: [] as string[] },
};

export const evalPlan = {
  // TODO: golden cases and the critical scenario ids
  dataset: { cases: 50, criticalCases: [] as string[] },
  // TODO: { name, kind, checks } scorers covering the JSON shape, the refund rules and open qualities
  scorers: [{ name: 'vibes', kind: 'judge', checks: 'Looks good to the team.' }] as Array<{ name: string; kind: string; checks: string }>,
  // TODO: a judge from the table you can trust for this generator
  judge: { model: 'atlas-pro-2026-05-20', minKappa: 0.5, pairwiseBothOrders: false },
  // TODO: repeats, a tolerance between the noise and the product rule, the critical rule and the projected cost
  gate: { pullRequestCases: 50, repeats: 1, tolerance: 0.01, blockOnCriticalRegression: false, projectedCostUsd: 0 },
  tracing: { conventions: 'custom', captureContent: true },
  // TODO: a random share plus a weekly cap of triggered samples within the review capacity
  online: { randomSampleRate: 0, triggeredPerWeek: 1000, triggers: ['thumbs-down'] as string[] },
  drift: { scheduledSuite: 'never', alerts: [] as string[] },
};
