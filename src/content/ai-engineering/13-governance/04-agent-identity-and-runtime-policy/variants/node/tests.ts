const { createModel } = require('@dojo/ai');
const { createHash } = require('node:crypto');

const AGENTS = [
  { id: 'support-agent', owner: 'ana', riskTier: 'medium', scopes: ['tickets:read', 'tickets:write', 'email:send'], purposes: ['customer-support'], clearance: 'confidential', status: 'active' },
  { id: 'billing-agent', owner: 'bruno', riskTier: 'high', scopes: ['invoices:read', 'refunds:write'], purposes: ['billing'], clearance: 'restricted', status: 'active' },
  { id: 'reporting-agent', owner: 'carla', riskTier: 'low', scopes: ['tickets:read'], purposes: ['analytics'], clearance: 'internal', status: 'active' },
  { id: 'old-agent', owner: 'carla', riskTier: 'low', scopes: ['tickets:read'], purposes: ['analytics'], clearance: 'restricted', status: 'suspended' },
];

const TOOLS = [
  { name: 'read_ticket', scope: 'tickets:read', classification: 'confidential', sideEffect: 'read' },
  { name: 'update_ticket', scope: 'tickets:write', classification: 'confidential', sideEffect: 'write' },
  { name: 'send_email', scope: 'email:send', classification: 'confidential', sideEffect: 'external' },
  { name: 'read_invoice', scope: 'invoices:read', classification: 'restricted', sideEffect: 'read' },
  { name: 'issue_refund', scope: 'refunds:write', classification: 'restricted', sideEffect: 'write' },
];

const pdp = () => mod.createPolicyDecisionPoint({ agents: AGENTS.map((agent) => ({ ...agent })), tools: TOOLS });
function parses(text: string) {
  try {
    JSON.parse(text);
    return true;
  } catch {
    return false;
  }
}

const sha256 = (text: string) => createHash('sha256').update(text).digest('hex');

function clock(start = Date.parse('2026-10-31T09:00:00Z'), step = 1000) {
  let current = start - step;
  return () => (current += step);
}

test('allows a call within the agent scopes, purposes and clearance, echoing who asked and for whom', () => {
  const policy = pdp();
  expect(policy.decide({ agentId: 'support-agent', tool: 'read_ticket', purpose: 'customer-support', onBehalfOf: 'customer-4411' })).toEqual({
    agentId: 'support-agent',
    tool: 'read_ticket',
    purpose: 'customer-support',
    onBehalfOf: 'customer-4411',
    effect: 'allow',
    reasons: ['within-policy'],
  });
  expect(policy.decide({ agentId: 'support-agent', tool: 'update_ticket', purpose: 'customer-support' })).toMatchObject({ effect: 'allow', reasons: ['within-policy'] });
  expect(policy.decide({ agentId: 'billing-agent', tool: 'read_invoice', purpose: 'billing' })).toMatchObject({ effect: 'allow' });
});

test('denies unknown agents, suspended agents and unknown tools, and suspend() works as a kill switch', () => {
  const policy = pdp();
  expect(policy.decide({ agentId: 'ghost-agent', tool: 'read_ticket', purpose: 'analytics' })).toMatchObject({ effect: 'deny', reasons: ['unknown-agent'] });
  expect(policy.decide({ agentId: 'old-agent', tool: 'read_ticket', purpose: 'analytics' })).toMatchObject({ effect: 'deny', reasons: ['agent-suspended'] });
  expect(policy.decide({ agentId: 'support-agent', tool: 'drop_database', purpose: 'customer-support' })).toMatchObject({ effect: 'deny', reasons: ['unknown-tool'] });
  expect(policy.suspend('support-agent')).toBe(true);
  expect(policy.decide({ agentId: 'support-agent', tool: 'read_ticket', purpose: 'customer-support' })).toMatchObject({ effect: 'deny', reasons: ['agent-suspended'] });
  expect(policy.suspend('ghost-agent')).toBe(false);
  expect(pdp().decide({ agentId: 'support-agent', tool: 'read_ticket', purpose: 'customer-support' }).effect).toBe('allow');
});

test('collects every deny reason: missing scope, purpose not allowed, classification above clearance', () => {
  const policy = pdp();
  expect(policy.decide({ agentId: 'reporting-agent', tool: 'read_ticket', purpose: 'analytics' })).toMatchObject({ effect: 'deny', reasons: ['above-clearance'] });
  expect(policy.decide({ agentId: 'support-agent', tool: 'read_ticket', purpose: 'marketing' })).toMatchObject({ effect: 'deny', reasons: ['purpose-not-allowed'] });
  expect(policy.decide({ agentId: 'reporting-agent', tool: 'issue_refund', purpose: 'billing' })).toMatchObject({ effect: 'deny', reasons: ['missing-scope', 'purpose-not-allowed', 'above-clearance'] });
});

test('asks a human for external side effects and high-risk writes, so the same tool depends on the agent identity', () => {
  const policy = pdp();
  expect(policy.decide({ agentId: 'support-agent', tool: 'send_email', purpose: 'customer-support' })).toMatchObject({ effect: 'ask', reasons: ['external-side-effect'] });
  expect(policy.decide({ agentId: 'billing-agent', tool: 'issue_refund', purpose: 'billing' })).toMatchObject({ effect: 'ask', reasons: ['high-risk-write'] });
  const effects = ['support-agent', 'reporting-agent', 'billing-agent'].map((agentId) => policy.decide({ agentId, tool: 'read_ticket', purpose: 'customer-support' }).effect);
  expect(effects).toEqual(['allow', 'deny', 'deny']);
});

test('the audit log chains every entry to the previous one with a sha256 hash and hands out copies', () => {
  const audit = mod.createAuditLog({ now: clock() });
  const first = audit.append({ type: 'tool-decision', agentId: 'support-agent', effect: 'allow' });
  const second = audit.append({ type: 'tool-decision', agentId: 'billing-agent', effect: 'ask' });
  expect(first).toMatchObject({ sequence: 0, timestamp: '2026-10-31T09:00:00.000Z', previousHash: mod.GENESIS_HASH });
  expect(first.hash).toBe(sha256(JSON.stringify([0, '2026-10-31T09:00:00.000Z', mod.GENESIS_HASH, { type: 'tool-decision', agentId: 'support-agent', effect: 'allow' }])));
  expect(second).toMatchObject({ sequence: 1, timestamp: '2026-10-31T09:00:01.000Z', previousHash: first.hash });
  expect(second.hash).toBe(sha256(JSON.stringify([1, '2026-10-31T09:00:01.000Z', first.hash, { type: 'tool-decision', agentId: 'billing-agent', effect: 'ask' }])));
  const copy = audit.entries();
  copy[0].event.effect = 'deny';
  copy.pop();
  expect(audit.entries()).toHaveLength(2);
  expect(audit.entries()[0].event.effect).toBe('allow');
});

test('verifyAuditChain finds edited, re-hashed, deleted and reordered entries', () => {
  const audit = mod.createAuditLog({ now: clock() });
  ['allow', 'deny', 'ask', 'allow'].forEach((effect, index) => audit.append({ type: 'tool-decision', index, effect }));
  expect(mod.verifyAuditChain(audit.entries())).toEqual({ valid: true });
  expect(mod.verifyAuditChain([])).toEqual({ valid: true });

  const edited = audit.entries();
  edited[1].event.effect = 'allow';
  expect(mod.verifyAuditChain(edited)).toEqual({ valid: false, brokenAt: 1 });

  const rehashed = audit.entries();
  rehashed[1].event.effect = 'allow';
  rehashed[1].hash = sha256(JSON.stringify([1, rehashed[1].timestamp, rehashed[1].previousHash, rehashed[1].event]));
  expect(mod.verifyAuditChain(rehashed)).toEqual({ valid: false, brokenAt: 2 });

  const deleted = audit.entries();
  deleted.splice(2, 1);
  expect(mod.verifyAuditChain(deleted)).toEqual({ valid: false, brokenAt: 2 });

  const reordered = audit.entries();
  [reordered[0], reordered[1]] = [reordered[1], reordered[0]];
  expect(mod.verifyAuditChain(reordered)).toEqual({ valid: false, brokenAt: 0 });
});

test('runGovernedToolCalls decides and audits every model tool call, runs only allowed ones and never logs raw arguments', async () => {
  const model = createModel();
  await forEachSeed(12, async () => {
    const policy = pdp();
    const audit = mod.createAuditLog({ now: clock() });
    const ran: string[] = [];
    const tools = {
      read_ticket: (args: { id: string }) => (ran.push('read_ticket'), `Ticket ${args.id}: refund requested`),
      update_ticket: (args: { id: string }) => (ran.push('update_ticket'), `Ticket ${args.id} updated`),
      send_email: () => (ran.push('send_email'), 'sent'),
      issue_refund: () => (ran.push('issue_refund'), 'refunded'),
    };
    fakeModel.reply(
      respond.oneOf([
        respond.toolCalls([{ name: 'read_ticket', arguments: { id: 'T-1' } }, { name: 'send_email', arguments: { to: 'maria@example.com', body: 'Your refund is on the way' } }]),
        respond.toolCalls([{ name: 'issue_refund', arguments: { amount: 120, card: '4111111111111111' } }, { name: 'update_ticket', arguments: { id: 'T-1', status: 'solved' } }]),
        respond.toolCalls([{ name: 'read_ticket', arguments: { id: 'T-2' } }, { name: 'drop_database', arguments: {} }]),
        respond.invalidToolArguments('read_ticket'),
      ]),
    );
    const response = await model.generate({ messages: [{ role: 'user', content: 'Handle ticket T-1.' }] });
    const messages = await mod.runGovernedToolCalls(response, { agentId: 'support-agent', purpose: 'customer-support', onBehalfOf: 'customer-4411' }, policy, audit, tools);
    expect(messages.map((message: { role: string; toolCallId: string }) => [message.role, message.toolCallId])).toEqual(response.toolCalls.map((call: { id: string }) => ['tool', call.id]));
    const entries = audit.entries();
    expect(entries).toHaveLength(response.toolCalls.length);
    expect(mod.verifyAuditChain(entries)).toEqual({ valid: true });
    response.toolCalls.forEach((call: { name: string; arguments: string }, index: number) => {
      const decision = policy.decide({ agentId: 'support-agent', tool: call.name, purpose: 'customer-support' });
      expect(entries[index].event).toMatchObject({ agentId: 'support-agent', onBehalfOf: 'customer-4411', tool: call.name, purpose: 'customer-support', effect: decision.effect, reasons: decision.reasons, argumentsHash: sha256(call.arguments) });
      const content = messages[index].content;
      if (decision.effect === 'deny') expect(content).toMatch(/^Denied: /);
      else if (decision.effect === 'ask') expect(content).toMatch(/^Approval required: /);
      else if (parses(call.arguments)) expect(content).toMatch(/^Ticket T-\d/);
      else expect(content).toMatch(/^Error:/);
    });
    expect(ran.every((name) => name === 'read_ticket' || name === 'update_ticket')).toBe(true);
    expect(JSON.stringify(entries)).not.toMatch(/maria@example|4111111111111111|Your refund/);
  });
});
