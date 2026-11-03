export const adr = {
  id: 1,
  title: '',
  status: 'proposed',
  layer: 'loop',
  context: '',
  decision: '',
  alternatives: [] as Array<{ option: string; reason: string }>,
  consequences: { positive: [] as string[], negative: [] as string[] },
};

export const multiAgentPlan = {
  architectures: {
    'market-scan': 'handoff-swarm',
    'report-editing': 'orchestrator-workers',
  } as Record<string, string>,
  orchestrator: {
    maxWorkers: 12,
    concurrency: 12,
    maxPlanAttempts: 1,
    budgetUsd: 10,
  },
  limits: {
    maxDelegationDepth: 3,
  },
  validation: [] as string[],
  failurePolicy: {
    onWorkerFailure: 'abort' as 'continue' | 'abort',
    minSuccessfulShare: 1,
  },
  integrations: {
    'vendor-database': 'a2a',
    'certifyhub-compliance': 'mcp',
    'research-workers': 'a2a',
  } as Record<string, string>,
};
