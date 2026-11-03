export const adr = {
  id: 8,
  title: 'Run Nightwatch in a least-privilege harness that only opens draft pull requests',
  status: 'accepted',
  layer: 'harness',
  context:
    'Nightwatch runs unattended every night and on CI failures of main, fixing failing tests and patch updates in our TypeScript monorepo. It needs access to edit packages, run tests, type checks and lint, and push agent branches, but must never push to main, read secrets, deploy or edit CI. Audit logs leave the company, a previous agent deleted failing tests, and each run has an $8 budget at about $0.40 per iteration.',
  decision:
    'We will give Nightwatch narrow allow rules with deny-first permissions, a /workspace sandbox limited to the npm registry and the GitHub API with an agent-branch token, fail-closed hooks that protect tests and redact secrets before auditing, cheap-first verifiers, and a loop that escalates to the package owner after 3 failures or $8.',
  alternatives: [
    {
      option: 'Full shell and repository access for the agent',
      reason: 'One mistaken or injected command could push to main, read secrets or deploy; the task needs only tests, lint, type checks and agent branches.',
    },
    {
      option: 'Let Nightwatch merge its own pull requests',
      reason: 'Humans must review agent changes; an agent that merges turns every undetected mistake into a change on main.',
    },
    {
      option: 'Use llm-review as the only verifier',
      reason: 'A model reviewer is slower, costs money per call and can be wrong; type checks, lint and tests are deterministic and cheap.',
    },
  ],
  consequences: {
    positive: [
      'A bad run can at worst produce a draft pull request on an agent branch.',
      'Audit logs are complete and free of secrets, which satisfies the compliance rule.',
    ],
    negative: [
      'New dependencies stall the nightly run until a human answers, so some fixes wait a day.',
      'The protect-test-files and redact-secrets hooks become critical components that need their own tests.',
      'The permission rules must be updated whenever the repository adds scripts or folders.',
    ],
  },
};

export const harnessPlan = {
  permissions: {
    allow: [
      'Read(packages/**)',
      'Edit(packages/**)',
      'Read(package.json)',
      'Bash(npm test)',
      'Bash(npm run typecheck)',
      'Bash(npm run lint)',
      'Bash(git status)',
      'Bash(git diff*)',
      'Bash(git add *)',
      'Bash(git commit *)',
      'Bash(git checkout -b agent/*)',
      'Bash(git push origin agent/*)',
    ],
    ask: ['Bash(npm install *)'],
    deny: [
      'Read(**/.env*)',
      'Edit(**/.env*)',
      'Read(secrets/**)',
      'Edit(secrets/**)',
      'Edit(.github/**)',
      'Bash(git push --force*)',
      'Bash(git push -f*)',
      'Bash(git push * --force*)',
      'Bash(git push * -f*)',
      'Bash(git push origin main*)',
      'Bash(npm run deploy*)',
      'Bash(curl *)',
      'Bash(wget *)',
    ],
  },
  sandbox: {
    root: '/workspace',
    networkAllowlist: ['registry.npmjs.org', 'api.github.com'],
    credentials: ['github-token:agent-branches', 'npm-read-token'],
  },
  hooks: {
    preToolUse: ['block-dangerous-commands', 'protect-test-files', 'cap-timeout'],
    postToolUse: ['redact-secrets', 'audit-log'],
    onFailure: 'block' as 'block' | 'continue',
  },
  verifiers: ['typecheck', 'lint', 'unit-tests', 'integration-tests'],
  loop: {
    triggers: ['schedule', 'ci-failure'],
    maxIterations: 15,
    maxFailures: 3,
    budgetUsd: 8,
    escalateTo: 'package-owner',
  },
};
