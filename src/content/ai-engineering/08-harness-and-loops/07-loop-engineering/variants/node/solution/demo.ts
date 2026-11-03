import { createModel } from '@dojo/ai';
import { fakeModel, respond } from '@dojo/ai/testing';
import { createMemoryStore, handleTrigger, type Escalation, type LoopEvent, type LoopState } from './main';

const FIXES: Record<string, string> = {
  'ci-failure:build-4812': 'PATCH: round half up in cartTotal',
  'ci-failure:build-4813': 'PATCH: await the queue before asserting',
};

function verify(output: string, event: LoopEvent) {
  return output === FIXES[event.key] ? { passed: true, feedback: '' } : { passed: false, feedback: `npm test still fails after "${output}"` };
}

function describe(state: LoopState) {
  const outcome = state.status === 'escalated' ? `escalated (${state.escalationReason})` : state.status;
  console.log(`  ${state.key}: ${outcome} after ${state.iterations} iteration(s), ${state.failures} failure(s), $${state.spentUsd.toFixed(6)}`);
}

async function main() {
  const store = createMemoryStore();
  const escalations: Escalation[] = [];
  const deps = { model: createModel(), store, verify, escalate: (escalation: Escalation) => void escalations.push(escalation), limits: { maxFailures: 3, budgetUsd: 0.05 } };

  fakeModel.forModel('dojo-fake-1').reply(
    respond.text('PATCH: truncate cents'),
    respond.error(503),
    respond.text('PATCH: round half up in cartTotal'),
    respond.text('PATCH: add a retry to the test'),
    respond.text('PATCH: add a retry to the test'),
    respond.text('PATCH: skip the test'),
  );

  console.log('trigger: CI build 4812 failed');
  describe(await handleTrigger({ key: 'ci-failure:build-4812', task: 'Build 4812: cart total expects 30.00, got 29.99.' }, deps));

  console.log('trigger: the webhook for build 4812 is delivered again');
  const callsBefore = fakeModel.requests.length;
  describe(await handleTrigger({ key: 'ci-failure:build-4812', task: 'Build 4812: cart total expects 30.00, got 29.99.' }, deps));
  console.log(`  model calls for the duplicate: ${fakeModel.requests.length - callsBefore}`);

  console.log('trigger: CI build 4813 failed');
  describe(await handleTrigger({ key: 'ci-failure:build-4813', task: 'Build 4813: queue test is flaky.' }, deps));

  for (const escalation of escalations) {
    console.log(`escalated to the owner: ${escalation.key} (${escalation.reason}), last feedback: ${escalation.state.lastFeedback}`);
  }
}

main().catch((error) => console.error(`demo failed: ${error.message}`));
