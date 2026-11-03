import { createModel } from '@dojo/ai';
import { fakeModel, respond } from '@dojo/ai/testing';
import { runSwarm, type AgentSpec, type SwarmResult } from './main';

const AGENTS: Record<string, AgentSpec> = {
  triage: { name: 'triage', instructions: 'You are triage for a SaaS help desk. Route the customer to the right specialist.', handoffs: ['billing', 'tech'] },
  billing: { name: 'billing', instructions: 'You are billing. Handle invoices, charges and plan changes.', handoffs: ['refunds', 'tech'] },
  tech: { name: 'tech', instructions: 'You are tech support. Handle bugs, outages and integrations.', handoffs: ['billing'] },
  refunds: { name: 'refunds', instructions: 'You are refunds. Decide and issue refunds within policy.', handoffs: [] },
};

function report(title: string, result: SwarmResult) {
  console.log(title);
  for (const handoff of result.handoffs) {
    console.log(`  ${handoff.from} -> ${handoff.to} (${handoff.reason})`);
  }
  console.log(`  status: ${result.status}, final agent: ${result.agent}, turns: ${result.turns}`);
  console.log(`  answer: ${result.answer ?? '(none: escalate to a human with the transcript)'}`);
}

async function main() {
  const model = createModel();

  fakeModel.reply(
    respond.toolCall('transfer_to_billing', { reason: 'customer reports a duplicate charge' }),
    respond.toolCall('transfer_to_refunds', { reason: 'duplicate charge confirmed on invoice INV-2031' }),
    respond.text('I refunded the duplicate charge of $49 on INV-2031; it will appear in 3 to 5 business days.'),
  );
  report('Case 1: duplicate charge', await runSwarm('I was charged twice for my March invoice.', { model, agents: AGENTS, entry: 'triage', maxHandoffs: 4, maxTurns: 8 }));

  fakeModel.reset();
  fakeModel.handle((request) =>
    request.messages[0].content === AGENTS.billing.instructions
      ? respond.toolCall('transfer_to_tech', { reason: 'the charge failed because of a webhook error' })
      : respond.toolCall('transfer_to_billing', { reason: 'the webhook works; this is a payment question' }),
  );
  report('Case 2: unclear ownership', await runSwarm('My upgrade payment failed and the webhook log shows an error.', { model, agents: AGENTS, entry: 'billing', maxHandoffs: 6, maxTurns: 10 }));
}

main().catch((error) => console.error(`demo failed: ${error.message}`));
