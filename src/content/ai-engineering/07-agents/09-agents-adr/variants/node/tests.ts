const { adr, agentPlan } = mod;

const CATALOG: Record<string, 'read' | 'write'> = {
  get_order: 'read',
  get_tracking: 'read',
  get_payment: 'read',
  read_policy: 'read',
  issue_refund: 'write',
  send_message: 'write',
  ban_seller: 'write',
  run_sql: 'write',
};

const REQUIRED_TOOLS = ['get_order', 'get_tracking', 'get_payment', 'read_policy', 'issue_refund', 'send_message'];
const P95_STEPS = 11;
const MAX_STEPS_CAP = 25;
const COST_PER_STEP_USD = 0.006;
const SECONDS_PER_STEP = 2;
const MAX_COST_PER_TICKET_USD = 0.15;
const MAX_DURATION_MS = 180000;

test('the ADR is an accepted loop-layer decision whose context names the pilot or steps, the cost budget and human approval, with a "We will" decision', () => {
  expect(Number.isInteger(adr.id) && adr.id > 0).toBe(true);
  expect(adr.status).toBe('accepted');
  expect(adr.layer).toBe('loop');
  expect(adr.title.trim().length).toBeGreaterThanOrEqual(10);
  expect(adr.context.trim().length).toBeGreaterThanOrEqual(80);
  expect(adr.context).toMatch(/step|pilot/i);
  expect(adr.context).toMatch(/cost|budget|\$/i);
  expect(adr.context).toMatch(/approv|human/i);
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

test('the pilot rules out a fixed workflow, and the agent gets exactly the tools a refund needs (least privilege)', () => {
  expect(['agent', 'hybrid']).toContain(agentPlan.pattern);
  expect(agentPlan.goal.trim().length).toBeGreaterThanOrEqual(20);
  agentPlan.tools.forEach((tool: string) => expect(Object.keys(CATALOG)).toContain(tool));
  REQUIRED_TOOLS.forEach((tool) => expect(agentPlan.tools).toContain(tool));
  expect(agentPlan.tools).not.toContain('ban_seller');
  expect(agentPlan.tools).not.toContain('run_sql');
  expect(new Set(agentPlan.tools).size).toBe(agentPlan.tools.length);
});

test('refunds above $50 need approval, approvals only gate tools the agent has, and no read-only tool is gated', () => {
  const refundApproval = agentPlan.approvals.find((approval: { tool: string }) => approval.tool === 'issue_refund');
  expect(refundApproval).toBeDefined();
  expect(refundApproval.rule).toMatch(/50/);
  agentPlan.approvals.forEach((approval: { tool: string; rule: string }) => {
    expect(agentPlan.tools).toContain(approval.tool);
    expect(CATALOG[approval.tool]).toBe('write');
    expect(approval.rule.trim().length).toBeGreaterThanOrEqual(10);
  });
});

test('budgets let the p95 run finish and stay within the per-ticket cost and time targets, with stuck detection and a human handoff', () => {
  const { maxSteps, maxCostUsd, maxDurationMs } = agentPlan.budget;
  expect(Number.isInteger(maxSteps)).toBe(true);
  expect(maxSteps).toBeGreaterThanOrEqual(P95_STEPS);
  expect(maxSteps).toBeLessThanOrEqual(MAX_STEPS_CAP);
  expect(maxCostUsd).toBeLessThanOrEqual(MAX_COST_PER_TICKET_USD);
  expect(maxCostUsd).toBeGreaterThanOrEqual(maxSteps * COST_PER_STEP_USD - 1e-9);
  expect(maxDurationMs).toBeLessThanOrEqual(MAX_DURATION_MS);
  expect(maxDurationMs).toBeGreaterThanOrEqual(maxSteps * SECONDS_PER_STEP * 1000);
  expect(Number.isInteger(agentPlan.stuckRepeatLimit)).toBe(true);
  expect(agentPlan.stuckRepeatLimit).toBeGreaterThanOrEqual(2);
  expect(agentPlan.stuckRepeatLimit).toBeLessThanOrEqual(5);
  expect(agentPlan.onBudgetExhausted).toBe('handoff_to_human');
});

test('runs are durable across redeploys and every write tool is idempotent; failure modes have mitigations', () => {
  expect(agentPlan.durability.checkpointEveryStep).toBe(true);
  agentPlan.tools.filter((tool: string) => CATALOG[tool] === 'write').forEach((tool: string) => expect(agentPlan.durability.idempotentTools).toContain(tool));
  expect(agentPlan.failureModes.length).toBeGreaterThanOrEqual(3);
  agentPlan.failureModes.forEach((mode: { failure: string; mitigation: string }) => {
    expect(mode.failure.trim().length).toBeGreaterThanOrEqual(15);
    expect(mode.mitigation.trim().length).toBeGreaterThanOrEqual(20);
  });
  const failures = agentPlan.failureModes.map((mode: { failure: string }) => mode.failure.trim().toLowerCase());
  expect(new Set(failures).size).toBe(failures.length);
});
