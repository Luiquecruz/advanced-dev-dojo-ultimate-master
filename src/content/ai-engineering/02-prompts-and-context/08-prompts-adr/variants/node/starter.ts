export const adr = {
  id: 2,
  // TODO: a short title naming the decision
  title: '',
  // TODO: accept the decision
  status: 'proposed',
  layer: 'context',
  // TODO: the forces from the briefing: volume, latency budget, schema and validity target, accuracy target, attachment sizes, backfill budget
  context: '',
  // TODO: one sentence starting with "We will", naming the output mode, examples, prefix, context cap, backfill and release path
  decision: '',
  // TODO: at least two { option, reason } you considered and rejected, each reason citing a fact from the briefing
  alternatives: [] as Array<{ option: string; reason: string }>,
  // TODO: what the team gains and what it pays or must watch
  consequences: { positive: [] as string[], negative: [] as string[] },
};

export const promptPlan = {
  // TODO: a semantic version of the claim-intake prompt
  promptVersion: 'claim-intake-latest',
  environments: ['production'],
  // TODO: output mode, local validation and the attempt limit that meets both the validity target and the latency budget
  output: { mode: 'json-mode', validateLocally: false, maxAttempts: 3 },
  // TODO: the example strategy that reaches the accuracy target, within the measured count range and the token budget
  examples: { strategy: 'static', count: 3, maxTokens: 800 },
  // TODO: stable parts first, varying parts after, the claim last
  layout: ['claim', 'instructions', 'output-schema', 'examples', 'attachment'],
  cacheBreakpointAfter: 'claim',
  // TODO: input budget plus output reserve within the context window, attachments capped
  context: { inputBudgetTokens: 32000, outputReserveTokens: 300, maxAttachmentTokens: 20000 },
  // TODO: interactive or batch for each path
  processing: { live: 'interactive', backfill: 'interactive' },
  // TODO: 1 200 000 x (3 000 x $2 + 300 x $8) / 1 000 000, halved for the batch API
  backfillCostUsd: 0,
};
