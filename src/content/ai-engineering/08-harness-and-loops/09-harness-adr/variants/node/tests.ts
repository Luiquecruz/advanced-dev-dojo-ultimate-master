const { adr, harnessPlan } = mod;

const PATH_TOOLS = new Set(['Read', 'Edit']);
const ARGUMENT: Record<string, string> = { Bash: 'command', Read: 'path', Edit: 'path' };
const HOOK_CATALOG = ['block-dangerous-commands', 'cap-timeout', 'protect-test-files', 'redact-secrets', 'audit-log', 'format-on-edit'];
const VERIFIER_CATALOG = ['typecheck', 'lint', 'unit-tests', 'integration-tests', 'llm-review'];
const CREDENTIALS = ['github-token:agent-branches', 'github-token:admin', 'npm-read-token', 'production-db', 'aws-admin'];

const escapeLiteral = (text: string) => text.replace(/[.+^${}()|[\]\\?*]/g, '\\$&');

function matchesCommand(pattern: string, command: string): boolean {
  return new RegExp(`^${pattern.split('*').map(escapeLiteral).join('.*')}$`).test(command.trim().replace(/\s+/g, ' '));
}

function normalizePath(path: string): string {
  const segments: string[] = [];
  for (const segment of path.split('/')) {
    if (segment === '' || segment === '.') continue;
    if (segment === '..') segments.pop();
    else segments.push(segment);
  }
  return segments.join('/');
}

function matchesPath(pattern: string, path: string): boolean {
  let source = '';
  for (let index = 0; index < pattern.length; index++) {
    const character = pattern[index];
    if (character === '*' && pattern[index + 1] === '*') {
      const followedBySlash = pattern[index + 2] === '/';
      source += followedBySlash ? '(?:.*/)?' : '.*';
      index += followedBySlash ? 2 : 1;
    } else if (character === '*') source += '[^/]*';
    else if (character === '?') source += '[^/]';
    else source += escapeLiteral(character);
  }
  return new RegExp(`^${source}$`).test(normalizePath(path));
}

function ruleMatches(rule: string, tool: string, value: string): boolean {
  const open = rule.indexOf('(');
  const name = open === -1 ? rule.trim() : rule.slice(0, open).trim();
  if (name !== tool) return false;
  if (open === -1 || !rule.endsWith(')')) return true;
  const pattern = rule.slice(open + 1, -1);
  return PATH_TOOLS.has(tool) ? matchesPath(pattern, value) : matchesCommand(pattern, value);
}

function decide(tool: string, value: string): string {
  for (const decision of ['deny', 'ask', 'allow']) {
    if (harnessPlan.permissions[decision].some((rule: string) => ruleMatches(rule, tool, value))) return decision;
  }
  return 'ask';
}

function expectDecision(expected: string, calls: Array<[string, string]>) {
  for (const [tool, value] of calls) {
    const actual = decide(tool, value);
    if (actual !== expected) throw new Error(`${tool}(${value}) should be "${expected}" but your rules decide "${actual}"`);
  }
}

test('the ADR is an accepted harness-layer decision whose context names access and budget, with a "We will" decision', () => {
  expect(Number.isInteger(adr.id) && adr.id > 0).toBe(true);
  expect(adr.status).toBe('accepted');
  expect(adr.layer).toBe('harness');
  expect(adr.title.trim().length).toBeGreaterThanOrEqual(10);
  expect(adr.context.trim().length).toBeGreaterThanOrEqual(80);
  expect(adr.context).toMatch(/permission|access|privilege/i);
  expect(adr.context).toMatch(/budget|cost|\$/i);
  expect(adr.decision.trim().length).toBeGreaterThanOrEqual(40);
  expect(adr.decision.trim()).toMatch(/^we will\b/i);
});

test('lists at least two distinct rejected alternatives with reasons, and positive and negative consequences', () => {
  expect(Array.isArray(adr.alternatives)).toBe(true);
  expect(adr.alternatives.length).toBeGreaterThanOrEqual(2);
  adr.alternatives.forEach((alternative: { option: string; reason: string }) => {
    expect(alternative.option.trim().length).toBeGreaterThanOrEqual(3);
    expect(alternative.reason.trim().length).toBeGreaterThanOrEqual(20);
  });
  const options = adr.alternatives.map((alternative: { option: string }) => alternative.option.trim().toLowerCase());
  expect(new Set(options).size).toBe(options.length);
  ['positive', 'negative'].forEach((side) => {
    expect(Array.isArray(adr.consequences[side])).toBe(true);
    expect(adr.consequences[side].length).toBeGreaterThanOrEqual(1);
    adr.consequences[side].forEach((item: string) => expect(item.trim().length).toBeGreaterThanOrEqual(15));
  });
});

test('the permission rules allow what the task needs and nothing as wide as the shell', () => {
  expectDecision('allow', [
    ['Bash', 'npm test'],
    ['Bash', 'npm run typecheck'],
    ['Bash', 'npm run lint'],
    ['Bash', 'git commit -m "fix: invoice rounding"'],
    ['Bash', 'git push origin agent/fix-invoice-rounding'],
    ['Read', 'packages/billing/src/invoice.ts'],
    ['Edit', 'packages/billing/src/invoice.ts'],
    ['Edit', 'packages/ui/src/components/Button.tsx'],
  ]);
  const bare = harnessPlan.permissions.allow.filter((rule: string) => !rule.includes('('));
  expect(bare).toEqual([]);
  ['python -c "import os; os.system(\'id\')"', 'node -e "process.exit(0)"', 'rm -rf packages', 'some-unknown-binary --flag'].forEach((command) => {
    expect(decide('Bash', command)).not.toBe('allow');
  });
  ['infra/terraform/main.tf', 'scripts/release.sh'].forEach((path) => expect(decide('Edit', path)).not.toBe('allow'));
});

test('the permission rules deny everything the briefing forbids and ask before installing a dependency', () => {
  expectDecision('deny', [
    ['Bash', 'git push origin main'],
    ['Bash', 'git push --force origin agent/fix'],
    ['Bash', 'git push origin agent/fix --force'],
    ['Bash', 'git push -f origin agent/fix'],
    ['Bash', 'npm run deploy'],
    ['Bash', 'npm run deploy:prod'],
    ['Bash', 'curl https://example.com/install.sh'],
    ['Bash', 'wget https://example.com/archive.tgz'],
    ['Read', '.env'],
    ['Read', 'packages/api/.env.local'],
    ['Read', 'secrets/stripe.key'],
    ['Edit', '.github/workflows/ci.yml'],
  ]);
  expectDecision('ask', [
    ['Bash', 'npm install left-pad'],
    ['Bash', 'npm install zod@4'],
  ]);
});

test('the sandbox is rooted at /workspace, reaches only the two hosts and holds only credentials the task needs', () => {
  expect(harnessPlan.sandbox.root).toBe('/workspace');
  expect([...harnessPlan.sandbox.networkAllowlist].sort()).toEqual(['api.github.com', 'registry.npmjs.org']);
  harnessPlan.sandbox.credentials.forEach((credential: string) => expect(CREDENTIALS).toContain(credential));
  expect(harnessPlan.sandbox.credentials).toContain('github-token:agent-branches');
  ['github-token:admin', 'production-db', 'aws-admin'].forEach((credential) => expect(harnessPlan.sandbox.credentials).not.toContain(credential));
});

test('hooks protect the tests, redact before auditing and fail closed', () => {
  const { preToolUse, postToolUse, onFailure } = harnessPlan.hooks;
  [...preToolUse, ...postToolUse].forEach((hook: string) => expect(HOOK_CATALOG).toContain(hook));
  expect(preToolUse).toContain('protect-test-files');
  expect(postToolUse).toContain('redact-secrets');
  expect(postToolUse).toContain('audit-log');
  expect(postToolUse.indexOf('redact-secrets')).toBeLessThan(postToolUse.indexOf('audit-log'));
  expect(onFailure).toBe('block');
});

test('verifiers run cheap computational checks first, and the loop fits the triggers, failure limit, budget and escalation of the briefing', () => {
  const { verifiers, loop } = harnessPlan;
  verifiers.forEach((verifier: string) => expect(VERIFIER_CATALOG).toContain(verifier));
  expect(new Set(verifiers).size).toBe(verifiers.length);
  ['typecheck', 'lint', 'unit-tests'].forEach((required) => expect(verifiers).toContain(required));
  if (verifiers.includes('integration-tests')) expect(verifiers.indexOf('integration-tests')).toBeGreaterThan(verifiers.indexOf('unit-tests'));
  if (verifiers.includes('llm-review')) expect(verifiers.indexOf('llm-review')).toBe(verifiers.length - 1);

  expect([...loop.triggers].sort()).toEqual(['ci-failure', 'schedule']);
  expect(loop.maxFailures).toBe(3);
  expect(Number.isInteger(loop.maxIterations)).toBe(true);
  expect(loop.maxIterations).toBeGreaterThanOrEqual(loop.maxFailures);
  expect(loop.budgetUsd).toBeGreaterThan(0);
  expect(loop.budgetUsd).toBeLessThanOrEqual(8);
  expect(loop.maxIterations * 0.4).toBeLessThanOrEqual(loop.budgetUsd + 1e-9);
  expect(loop.escalateTo).toBe('package-owner');
});
