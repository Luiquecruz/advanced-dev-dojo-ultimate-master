const { adr, integrations, toolPlan } = mod;

const SYSTEMS = ['orders-db', 'refunds', 'knowledge-base', 'crm', 'carrier-claims'];
const SHARED_SYSTEMS = ['knowledge-base', 'crm'];
const EXTERNAL_AGENTS = ['carrier-claims'];
const GATEWAY_TOOLS = 64;
const TOKENS_PER_DEFINITION = 350;
const TOOL_BUDGET_TOKENS = 6000;
const ROUND_SECONDS = 1.2;
const REPLY_SECONDS = 8;
const MAX_OUTPUT_TOKENS = 1500;

type ToolEntry = { name: string; system: string; description: string; readOnly: boolean; requiresApproval: boolean; maxOutputTokens: number; errorContract: string };
type Integration = { system: string; mechanism: string; reason: string };

const mechanismOf = (system: string) => integrations.find((integration: Integration) => integration.system === system)?.mechanism;

test('the ADR is an accepted harness decision whose context names tools, the token budget and approvals, with a "We will" decision', () => {
  expect(Number.isInteger(adr.id) && adr.id > 0).toBe(true);
  expect(adr.status).toBe('accepted');
  expect(adr.layer).toBe('harness');
  expect(adr.title.trim().length).toBeGreaterThanOrEqual(10);
  expect(adr.context.trim().length).toBeGreaterThanOrEqual(80);
  expect(adr.context).toMatch(/tool|MCP/i);
  expect(adr.context).toMatch(/token|budget/i);
  expect(adr.context).toMatch(/approv|refund/i);
  expect(adr.decision.trim().length).toBeGreaterThanOrEqual(40);
  expect(adr.decision.trim()).toMatch(/^we will\b/i);
});

test('lists at least two distinct rejected alternatives with reasons, and positive and negative consequences', () => {
  expect(adr.alternatives.length).toBeGreaterThanOrEqual(2);
  adr.alternatives.forEach((alternative: { option: string; reason: string }) => {
    expect(alternative.option.trim().length).toBeGreaterThanOrEqual(3);
    expect(alternative.reason.trim().length).toBeGreaterThanOrEqual(20);
  });
  const options = adr.alternatives.map((alternative: { option: string }) => alternative.option.trim().toLowerCase());
  expect(new Set(options).size).toBe(options.length);
  ['positive', 'negative'].forEach((side) => {
    expect(adr.consequences[side].length).toBeGreaterThanOrEqual(1);
    adr.consequences[side].forEach((item: string) => expect(item.trim().length).toBeGreaterThanOrEqual(15));
  });
});

test('integrates every briefing system exactly once: shared systems over MCP, the external multi-day agent over A2A, nothing else over A2A', () => {
  expect(integrations.map((integration: Integration) => integration.system).sort()).toEqual([...SYSTEMS].sort());
  integrations.forEach((integration: Integration) => {
    expect(['function-calling', 'mcp', 'a2a']).toContain(integration.mechanism);
    expect(integration.reason.trim().length).toBeGreaterThanOrEqual(20);
  });
  SHARED_SYSTEMS.forEach((system) => expect(mechanismOf(system)).toBe('mcp'));
  EXTERNAL_AGENTS.forEach((system) => expect(mechanismOf(system)).toBe('a2a'));
  SYSTEMS.filter((system) => !EXTERNAL_AGENTS.includes(system)).forEach((system) => expect(mechanismOf(system)).not.toBe('a2a'));
});

test('the tool catalog has unique model-friendly names, real descriptions, error contracts, bounded outputs and approval on every write tool', () => {
  const tools: ToolEntry[] = toolPlan.tools;
  expect(tools.length).toBeGreaterThanOrEqual(4);
  const names = tools.map((tool) => tool.name);
  expect(new Set(names).size).toBe(names.length);
  tools.forEach((tool) => {
    expect(tool.name).toMatch(/^[a-z][a-z0-9_]*$/);
    expect(tool.name.length).toBeLessThanOrEqual(64);
    expect(SYSTEMS).toContain(tool.system);
    expect(tool.description.trim().length).toBeGreaterThanOrEqual(40);
    expect(Number.isInteger(tool.maxOutputTokens) && tool.maxOutputTokens > 0).toBe(true);
    expect(tool.maxOutputTokens).toBeLessThanOrEqual(MAX_OUTPUT_TOKENS);
    expect(tool.errorContract.trim().length).toBeGreaterThanOrEqual(20);
    expect(tool.errorContract).toMatch(/error/i);
    if (!tool.readOnly) {
      expect(tool.requiresApproval).toBe(true);
    }
  });
  expect(tools.some((tool) => tool.system === 'refunds' && !tool.readOnly)).toBe(true);
});

test('tools are loaded on demand because the gateway catalog exceeds the budget, and the always-loaded set fits within it', () => {
  expect(GATEWAY_TOOLS * TOKENS_PER_DEFINITION).toBeGreaterThan(TOOL_BUDGET_TOKENS);
  const { strategy, budgetTokens, alwaysLoaded } = toolPlan.loading;
  expect(strategy).toBe('search-on-demand');
  expect(budgetTokens).toBeGreaterThan(0);
  expect(budgetTokens).toBeLessThanOrEqual(TOOL_BUDGET_TOKENS);
  const names = toolPlan.tools.map((tool: ToolEntry) => tool.name);
  alwaysLoaded.forEach((name: string) => expect(names).toContain(name));
  expect(new Set(alwaysLoaded).size).toBe(alwaysLoaded.length);
  expect(alwaysLoaded.length * TOKENS_PER_DEFINITION).toBeLessThanOrEqual(budgetTokens);
});

test('the round limit fits the latency budget and the repository uses the vendor-neutral context file', () => {
  expect(Number.isInteger(toolPlan.maxToolRounds)).toBe(true);
  expect(toolPlan.maxToolRounds).toBeGreaterThanOrEqual(2);
  expect(toolPlan.maxToolRounds * ROUND_SECONDS).toBeLessThanOrEqual(REPLY_SECONDS);
  expect(toolPlan.contextFile).toBe('AGENTS.md');
});
