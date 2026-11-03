import { createModel } from '@dojo/ai';
import { fakeModel, respond } from '@dojo/ai/testing';
import { createDelegationGuard, gatherClaims, voteIndependently } from './main';

async function main() {
  const model = createModel();

  console.log('1. Containing cascading errors');
  fakeModel.reply(
    respond.json({ claims: [{ text: 'Beacon costs $0.30 per GB ingested', sourceId: 'pricing-page' }, { text: 'Beacon offers unlimited free retention', sourceId: 'reddit-thread' }] }),
    respond.json({ claims: [{ text: 'Beacon costs $0.30 per GB ingested', sourceId: 'pricing-page' }] }),
    respond.truncated(JSON.stringify({ claims: [{ text: 'Retention is 30 days by default', sourceId: 'contract-v3' }] })),
    respond.json({ claims: [{ text: 'Retention is 30 days, extendable to 400 days', sourceId: 'legal-memo' }] }),
  );
  const gathered = await gatherClaims(
    [
      { id: 'pricing', instruction: 'Summarize Beacon pricing.', sourceIds: ['pricing-page', 'sales-deck'] },
      { id: 'retention', instruction: 'Summarize Beacon retention terms.', sourceIds: ['contract-v3'] },
    ],
    { model, maxAttempts: 2 },
  );
  for (const claim of gathered.accepted) {
    console.log(`  accepted [${claim.taskId}] ${claim.text} (${claim.sourceId})`);
  }
  for (const entry of gathered.quarantined) {
    console.log(`  quarantined [${entry.taskId}]: ${entry.problems.join('; ')}`);
  }

  console.log('2. Independent votes before discussion');
  fakeModel.reset().reply(
    respond.json({ answer: 'no' }),
    respond.json({ answer: 'yes' }),
    respond.error(503),
    respond.json({ answer: 'No' }),
    respond.json({ answer: 'no' }),
    respond.json({ answer: 'yes' }),
  );
  const vote = await voteIndependently('Does the Beacon contract meet our 90-day retention policy? Answer yes or no.', { model, voters: ['security', 'legal', 'finance'], quorum: 0.6 });
  vote.ballots.forEach((ballots, round) => console.log(`  round ${round + 1}: ${ballots.map((ballot) => ballot ?? 'abstained').join(', ')}`));
  console.log(`  ${vote.status}: ${vote.decision ?? 'escalate to a human'}`);

  console.log('3. Delegation limits');
  const guard = createDelegationGuard({ maxDepth: 2, maxFanOut: 3, maxTotal: 5 });
  const requests: Array<[string[], string]> = [
    [['lead'], 'pricing'],
    [['lead', 'pricing'], 'fx-rates'],
    [['lead', 'pricing', 'fx-rates'], 'bank-api'],
    [['lead', 'pricing'], 'lead'],
    [['lead'], 'retention'],
    [['lead'], 'support'],
    [['lead'], 'security'],
    [['lead', 'retention'], 'archive'],
    [['lead', 'retention'], 'legal'],
  ];
  for (const [chain, target] of requests) {
    const decision = guard.request(chain, target);
    console.log(`  ${chain.join(' > ')} -> ${target}: ${decision.allowed ? 'allowed' : `blocked (${decision.reason})`}`);
  }
  console.log(`  delegations allowed: ${guard.total}`);
}

main().catch((error) => console.error(`demo failed: ${error.message}`));
