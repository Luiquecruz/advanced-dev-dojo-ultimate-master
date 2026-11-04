export const adr = {
  id: 13,
  title: 'Govern Lumen Pay AI with owned assets, runtime policy and a dated BR and EU regulatory map',
  status: 'accepted',
  layer: 'governance',
  context:
    'Lumen Pay runs 23 agents with 9 orphaned owners, 3 shared keys without expiry, shadow AI in marketing and a 40% budget overrun from a runaway loop. Its credit-limit agent decides about consumers, analysts approve 99.6% of suggestions, the pinned model retires on 2027-01-15, and the March 2027 launch in Portugal adds the GDPR and the EU AI Act to the LGPD that applies in Brazil today.',
  decision:
    'We will register every AI asset with an owner and expiring credentials, give each agent its own identity behind a deny-by-default decision point with a hash-chained audit log, gate data by purpose and models by evals, enforce budgets at the gateway, keep humans reviewing every credit decision at a sustainable volume, and maintain a quarterly BR and EU regulatory map.',
  alternatives: [
    {
      option: 'Keep the AI policy document and train employees',
      reason: 'A document with no runtime enforcement is policy theater: it did not stop shared keys, shadow AI or the runaway loop last quarter.',
    },
    {
      option: 'Ban external AI tools to stop shadow AI',
      reason: 'Marketing uses a personal chatbot because no sanctioned tool exists; a ban without a good alternative only hides the usage.',
    },
    {
      option: 'Auto-approve small credit-limit increases without review',
      reason: 'Credit decisions are an EU AI Act high-risk use from December 2027 and trigger GDPR Art. 22 and LGPD Art. 20 rights today; removing the human removes the review path.',
    },
  ],
  consequences: {
    positive: [
      'Every agent action is attributable to an identity and an owner, with tamper-evident evidence for five years.',
      'The Portugal launch starts with obligations mapped to controls instead of a compliance scramble.',
      'Spend is attributed per team and feature, and a runaway loop is stopped by rate limits within minutes.',
    ],
    negative: [
      'Credit reviews capped at 80 per analyst per day need more analysts or slower growth of the credit feature.',
      'The decision point and the gateway become critical components that need their own availability targets.',
      'Legal and the AI platform team must review the regulatory map every quarter.',
    ],
  },
};

export const governancePlan = {
  layers: [
    { layer: 'organizational', owner: 'cto', controls: ['AI policy and acceptable use', 'AI asset registry with owners', 'risk tiers per feature', 'sanctioned AI assistant for all staff'], enforcement: 'process', evidence: 'Monthly registry audit report and quarterly risk-tier review minutes' },
    { layer: 'regulatory', owner: 'legal-compliance', controls: ['BR and EU regulatory map', 'impact reports (RIPD, FRIA preparation)'], enforcement: 'process', evidence: 'Dated regulatory map reviewed every quarter, with sources per obligation' },
    { layer: 'data', owner: 'data-protection-officer', controls: ['purpose and legal basis check before every model call', 'allowlist minimization', '90-day retention job', 'provider training opt-out'], enforcement: 'runtime', evidence: 'Processing records per call and retention job logs' },
    { layer: 'model', owner: 'ai-platform-team', controls: ['model registry with license checks', 'pinned versions', 'eval-gated promotion', 'deprecation warnings'], enforcement: 'ci', evidence: 'Promotion records with eval results and pin history per alias' },
    { layer: 'agent-identity', owner: 'security-team', controls: ['identity per agent', 'scoped expiring credentials', 'decision point per tool call', 'kill switch'], enforcement: 'runtime', evidence: 'Hash-chained decision log with verification reports' },
    { layer: 'application', owner: 'credit-product-team', controls: ['AI disclosure in the support chat', 'human review of credit decisions', 'appeal path', 'override rate dashboard'], enforcement: 'runtime', evidence: 'Review queue records, override rates and appeal outcomes' },
    { layer: 'operational-cost', owner: 'finance-finops', controls: ['budgets per team and feature', 'alerts at 50% and 80%', 'hard limits', 'rate limits per agent'], enforcement: 'runtime', evidence: 'Gateway cost attribution reports and alert history' },
    { layer: 'engineering', owner: 'engineering-leadership', controls: ['review and tests required for AI-assisted code', 'approved coding assistants only', 'secret scanning'], enforcement: 'ci', evidence: 'CI checks on every pull request and the coding assistant allowlist' },
    { layer: 'audit', owner: 'internal-audit', controls: ['quarterly sample review of decisions', 'audit chain verification', 'access reviews'], enforcement: 'process', evidence: 'Quarterly internal audit report' },
  ] as Array<{ layer: string; owner: string; controls: string[]; enforcement: 'runtime' | 'ci' | 'process'; evidence: string }>,
  inventory: {
    requireOwner: true,
    credentialMaxTtlDays: 30,
    auditEveryDays: 7,
    shadowAiResponse: 'sanctioned-alternative' as 'sanctioned-alternative' | 'ban-only' | 'ignore',
  },
  identity: {
    perAgentIdentity: true,
    sharedKeysAllowed: false,
    decisionPoint: 'every-tool-call' as 'every-tool-call' | 'session-start' | 'none',
    defaultEffect: 'deny' as 'allow' | 'deny',
    auditLog: 'hash-chained' as 'hash-chained' | 'plain',
    auditRetentionYears: 5,
    killSwitch: true,
  },
  data: {
    purposes: [
      { name: 'customer-support', feature: 'support-chat', legalBasis: 'contract' },
      { name: 'credit-limit-review', feature: 'credit-limit', legalBasis: 'credit-protection' },
      { name: 'collections', feature: 'collections-email', legalBasis: 'contract' },
    ],
    minimization: 'allowlist' as 'allowlist' | 'blocklist' | 'none',
    retentionDays: 90,
    providerTraining: 'opted-out' as 'opted-out' | 'allowed',
  },
  models: {
    pinnedVersions: true,
    requiredEvals: ['support-golden', 'credit-fairness', 'refusal-safety'],
    maxRegression: 0.02,
    migrationStartBy: '2026-11-30',
  },
  cost: {
    monthlyLimitUsd: 12000,
    budgets: [
      { id: 'support-chat', team: 'support', feature: 'support-chat', limitUsd: 4500 },
      { id: 'credit-limit', team: 'credit', feature: 'credit-limit', limitUsd: 2500 },
      { id: 'collections-email', team: 'collections', feature: 'collections-email', limitUsd: 1500 },
      { id: 'coding-assistant', team: 'engineering', feature: 'coding-assistant', limitUsd: 2500 },
    ],
    alertThresholds: [0.5, 0.8, 1],
    hardLimit: true,
    rateLimitPerAgent: true,
  },
  oversight: {
    creditDecisions: 'human-review-all' as 'human-review-all' | 'human-review-adverse' | 'none',
    reviewQueueMaxPerAnalystPerDay: 80,
    overrideRateTracked: true,
    appealPath: true,
  },
  regulatory: {
    markets: ['BR', 'EU'],
    reviewEveryDays: 90,
    obligations: [
      { feature: 'credit-limit', jurisdiction: 'BR', instrument: 'LGPD Art. 20 (review of automated decisions)', status: 'applies' },
      { feature: 'credit-limit', jurisdiction: 'EU', instrument: 'GDPR Art. 22 (automated individual decisions)', status: 'applies' },
      { feature: 'credit-limit', jurisdiction: 'EU', instrument: 'EU AI Act Annex III 5(b) high-risk credit scoring', status: 'upcoming' },
      { feature: 'support-chat', jurisdiction: 'EU', instrument: 'EU AI Act Art. 50(1) AI interaction disclosure', status: 'applies' },
      { feature: 'support-chat', jurisdiction: 'BR', instrument: 'LGPD Arts. 6 and 7 (purpose and legal basis)', status: 'applies' },
      { feature: 'credit-limit', jurisdiction: 'BR', instrument: 'PL 2338/2023 (AI bill pending in the Chamber)', status: 'proposed' },
    ] as Array<{ feature: string; jurisdiction: string; instrument: string; status: 'applies' | 'upcoming' | 'proposed' }>,
  },
};
