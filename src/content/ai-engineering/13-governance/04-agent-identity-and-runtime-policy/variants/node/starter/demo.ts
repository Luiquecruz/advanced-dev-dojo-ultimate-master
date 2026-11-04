import { createModel } from '@dojo/ai';
import { fakeModel, respond } from '@dojo/ai/testing';
import { createAuditLog, createPolicyDecisionPoint, runGovernedToolCalls, verifyAuditChain, type AgentIdentity, type ToolSpec } from './main';

const agents: AgentIdentity[] = [
  { id: 'support-agent', owner: 'ana', riskTier: 'medium', scopes: ['tickets:read', 'tickets:write', 'email:send'], purposes: ['customer-support'], clearance: 'confidential', status: 'active' },
  { id: 'billing-agent', owner: 'bruno', riskTier: 'high', scopes: ['invoices:read', 'refunds:write'], purposes: ['billing'], clearance: 'restricted', status: 'active' },
];

const tools: ToolSpec[] = [
  { name: 'read_ticket', scope: 'tickets:read', classification: 'confidential', sideEffect: 'read' },
  { name: 'update_ticket', scope: 'tickets:write', classification: 'confidential', sideEffect: 'write' },
  { name: 'send_email', scope: 'email:send', classification: 'confidential', sideEffect: 'external' },
  { name: 'read_invoice', scope: 'invoices:read', classification: 'restricted', sideEffect: 'read' },
  { name: 'issue_refund', scope: 'refunds:write', classification: 'restricted', sideEffect: 'write' },
];

const implementations = {
  read_ticket: (args: Record<string, unknown>) => `Ticket ${args.id}: customer asks for a refund of order 8812`,
  update_ticket: (args: Record<string, unknown>) => `Ticket ${args.id} set to ${args.status}`,
  read_invoice: (args: Record<string, unknown>) => `Invoice ${args.id}: 120.00 EUR, paid`,
  issue_refund: () => 'refund issued',
  send_email: () => 'email sent',
};

let clock = Date.parse('2026-10-31T09:00:00Z');
const now = () => (clock += 1500);

async function step(label: string, context: { agentId: string; purpose: string; onBehalfOf?: string }, policy: ReturnType<typeof createPolicyDecisionPoint>, audit: ReturnType<typeof createAuditLog>) {
  const response = await createModel().generate({ messages: [{ role: 'user', content: label }] });
  const messages = await runGovernedToolCalls(response, context, policy, audit, implementations);
  console.log(`${context.agentId}: ${label}`);
  response.toolCalls.forEach((call, index) => console.log(`  ${call.name.padEnd(14)} -> ${messages[index].content}`));
}

async function main() {
  const policy = createPolicyDecisionPoint({ agents, tools });
  const audit = createAuditLog({ now });
  fakeModel.reply(
    respond.toolCalls([
      { name: 'read_ticket', arguments: { id: 'T-1' } },
      { name: 'update_ticket', arguments: { id: 'T-1', status: 'waiting-on-billing' } },
      { name: 'issue_refund', arguments: { order: '8812', amount: 120 } },
    ]),
    respond.toolCalls([
      { name: 'read_invoice', arguments: { id: 'INV-8812' } },
      { name: 'issue_refund', arguments: { order: '8812', amount: 120 } },
    ]),
    respond.toolCalls([{ name: 'send_email', arguments: { to: 'maria@example.com', body: 'Your refund is on the way.' } }]),
    respond.toolCalls([{ name: 'read_ticket', arguments: { id: 'T-2' } }]),
  );

  await step('Handle ticket T-1 for Maria.', { agentId: 'support-agent', purpose: 'customer-support', onBehalfOf: 'customer-4411' }, policy, audit);
  await step('Refund order 8812.', { agentId: 'billing-agent', purpose: 'billing' }, policy, audit);
  await step('Tell Maria the refund is coming.', { agentId: 'support-agent', purpose: 'customer-support', onBehalfOf: 'customer-4411' }, policy, audit);
  policy.suspend('support-agent');
  console.log('kill switch: support-agent suspended');
  await step('Handle ticket T-2.', { agentId: 'support-agent', purpose: 'customer-support' }, policy, audit);

  const entries = audit.entries();
  console.log(`\naudit log: ${entries.length} entries`);
  for (const entry of entries) {
    console.log(`  #${entry.sequence} ${entry.timestamp} ${String(entry.event.agentId).padEnd(13)} ${String(entry.event.tool).padEnd(14)} ${String(entry.event.effect).padEnd(5)} ${(entry.event.reasons as string[]).join(', ')}  ${entry.hash.slice(0, 12)}`);
  }
  console.log(`chain check: ${JSON.stringify(verifyAuditChain(entries))}`);

  const tampered = audit.entries();
  tampered[2].event.effect = 'allow';
  console.log(`after someone edits entry #2 to allow: ${JSON.stringify(verifyAuditChain(tampered))}`);
}

main().catch((error) => console.error(`demo failed: ${error.message}`));
