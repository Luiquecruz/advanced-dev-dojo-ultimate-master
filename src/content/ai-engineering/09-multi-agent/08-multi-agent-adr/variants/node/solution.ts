export const adr = {
  id: 9,
  title: 'Use orchestrator-workers for market scans and a single agent for report editing',
  status: 'accepted',
  layer: 'loop',
  context:
    'Scoutline must reach a 0.80 pass rate on both features. Market scans compare 4 to 12 independent vendors within $5 and a 6-minute p95; report edits touch the whole document within $0.50 and 60 seconds. The pilot showed a single agent too slow and inaccurate for scans, a handoff swarm too costly, and multi-agent editing worse and more expensive than one agent. Pilot incidents included unusable plans, invented citations, workers spawning workers and one failed worker sinking a scan.',
  decision:
    'We will run market scans as orchestrator-workers with at most 8 workers, 4 at a time, two planner attempts, schema and citation checks before synthesis and no delegation below the workers, keep report editing in a single agent, and reach the compliance partner over A2A and the vendor database over MCP.',
  alternatives: [
    {
      option: 'A single agent for both features',
      reason: 'Scans passed only 64% of pilot tasks with an 11-minute p95, below both the quality and the latency requirements.',
    },
    {
      option: 'A handoff swarm for market scans',
      reason: 'It cost $5.40 per scan with a 13-minute p95 and a 0.71 pass rate, failing every requirement.',
    },
    {
      option: 'Orchestrator-workers for report editing as well',
      reason: 'Parallel editors make conflicting style decisions on one document: 0.81 pass rate at $1.10 and 70 seconds, over the cost and latency limits.',
    },
  ],
  consequences: {
    positive: [
      'Scans pass 86% of pilot tasks at about a quarter of the latency of a single agent.',
      'A failed worker leaves a listed gap instead of failing the whole report.',
    ],
    negative: [
      'Scans cost about four times as much as a single agent, so the budget cap needs monitoring.',
      'Scans with more than 8 vendors give some workers several vendors, which lowers depth per vendor.',
    ],
  },
};

export const multiAgentPlan = {
  architectures: {
    'market-scan': 'orchestrator-workers',
    'report-editing': 'single-agent',
  },
  orchestrator: {
    maxWorkers: 8,
    concurrency: 4,
    maxPlanAttempts: 2,
    budgetUsd: 5,
  },
  limits: {
    maxDelegationDepth: 1,
  },
  validation: ['schema', 'citations'],
  failurePolicy: {
    onWorkerFailure: 'continue',
    minSuccessfulShare: 0.5,
  },
  integrations: {
    'vendor-database': 'mcp',
    'certifyhub-compliance': 'a2a',
    'research-workers': 'in-process',
  },
};
