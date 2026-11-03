export const adr = {
  id: 1,
  title: '',
  status: 'proposed',
  layer: 'harness',
  context: '',
  decision: '',
  alternatives: [] as Array<{ option: string; reason: string }>,
  consequences: { positive: [] as string[], negative: [] as string[] },
};

export const harnessPlan = {
  permissions: {
    allow: ['Bash', 'Edit'] as string[],
    ask: [] as string[],
    deny: [] as string[],
  },
  sandbox: {
    root: '/',
    networkAllowlist: ['*'] as string[],
    credentials: ['github-token:admin'] as string[],
  },
  hooks: {
    preToolUse: [] as string[],
    postToolUse: ['audit-log'] as string[],
    onFailure: 'continue' as 'block' | 'continue',
  },
  verifiers: ['llm-review'] as string[],
  loop: {
    triggers: ['schedule'] as string[],
    maxIterations: 50,
    maxFailures: 10,
    budgetUsd: 20,
    escalateTo: '',
  },
};
