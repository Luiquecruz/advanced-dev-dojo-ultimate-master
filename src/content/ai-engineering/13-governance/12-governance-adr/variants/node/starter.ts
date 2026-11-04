export const adr = {
  id: 1,
  title: '',
  status: 'proposed',
  layer: 'governance',
  context: '',
  decision: '',
  alternatives: [] as Array<{ option: string; reason: string }>,
  consequences: { positive: [] as string[], negative: [] as string[] },
};

export const governancePlan = {
  layers: [
    { layer: 'organizational', owner: 'everyone', controls: ['AI policy document'] as string[], enforcement: 'process', evidence: '' },
  ] as Array<{ layer: string; owner: string; controls: string[]; enforcement: 'runtime' | 'ci' | 'process'; evidence: string }>,
  inventory: {
    requireOwner: false,
    credentialMaxTtlDays: 365,
    auditEveryDays: 365,
    shadowAiResponse: 'ban-only' as 'sanctioned-alternative' | 'ban-only' | 'ignore',
  },
  identity: {
    perAgentIdentity: false,
    sharedKeysAllowed: true,
    decisionPoint: 'session-start' as 'every-tool-call' | 'session-start' | 'none',
    defaultEffect: 'allow' as 'allow' | 'deny',
    auditLog: 'plain' as 'hash-chained' | 'plain',
    auditRetentionYears: 1,
    killSwitch: false,
  },
  data: {
    purposes: [] as Array<{ name: string; feature: string; legalBasis: string }>,
    minimization: 'none' as 'allowlist' | 'blocklist' | 'none',
    retentionDays: 365,
    providerTraining: 'allowed' as 'opted-out' | 'allowed',
  },
  models: {
    pinnedVersions: false,
    requiredEvals: [] as string[],
    maxRegression: 0.1,
    migrationStartBy: '2027-01-15',
  },
  cost: {
    monthlyLimitUsd: 20000,
    budgets: [] as Array<{ id: string; team?: string; feature?: string; limitUsd: number }>,
    alertThresholds: [1] as number[],
    hardLimit: false,
    rateLimitPerAgent: false,
  },
  oversight: {
    creditDecisions: 'none' as 'human-review-all' | 'human-review-adverse' | 'none',
    reviewQueueMaxPerAnalystPerDay: 600,
    overrideRateTracked: false,
    appealPath: false,
  },
  regulatory: {
    markets: ['BR'] as string[],
    reviewEveryDays: 365,
    obligations: [] as Array<{ feature: string; jurisdiction: string; instrument: string; status: 'applies' | 'upcoming' | 'proposed' }>,
  },
};
