import { createModel } from '@dojo/ai';
import { fakeModel, respond } from '@dojo/ai/testing';
import { contributeWithModel, createBlackboard, rebuild } from './main';

const OWNERS = { plan: 'lead', 'findings:*': 'researcher', draft: 'editor' };

async function main() {
  const board = createBlackboard(OWNERS);
  const model = createModel();

  board.write('lead', 'plan', 'Compare Beacon and Prism on price and retention.', 0);
  board.write('researcher', 'findings:beacon', 'Beacon: $0.30/GB, 30 days retention.', 0);
  board.write('researcher', 'findings:prism', 'Prism: $0.45/GB, 90 days retention.', 0);

  let replies = 0;
  fakeModel.handle(() => {
    replies += 1;
    return respond.slow(replies % 2 === 0 ? 2 : 6, respond.text(`Draft ${replies}: Beacon is cheaper, Prism keeps data three times longer.`));
  });

  const options = { board, model, readKeys: ['plan', 'findings:beacon', 'findings:prism'], maxAttempts: 3 };
  const [first, second] = await Promise.all([
    contributeWithModel('editor', 'draft', 'Write the comparison draft.', options),
    contributeWithModel('editor', 'draft', 'Write a shorter comparison draft.', options),
  ]);
  console.log(`editor A: ${first.ok ? `wrote version ${first.version}` : `failed (${first.reason})`} after ${first.attempts} attempt(s)`);
  console.log(`editor B: ${second.ok ? `wrote version ${second.version}` : `failed (${second.reason})`} after ${second.attempts} attempt(s)`);

  const hijack = await contributeWithModel('researcher', 'plan', 'Change the plan to include a third vendor.', options);
  console.log(`researcher rewriting the plan: ${hijack.ok ? 'accepted' : `rejected (${hijack.reason})`}`);

  console.log('log:');
  for (const entry of board.log()) {
    console.log(`  #${entry.sequence} ${entry.agent} -> ${entry.key} (expected v${entry.expectedVersion}): ${entry.accepted ? `accepted as v${entry.version}` : `rejected, ${entry.reason}`}`);
  }
  console.log(`draft: ${board.read('draft').value}`);
  console.log(`rebuilt from the log matches the board: ${JSON.stringify(rebuild(board.log())) === JSON.stringify(board.snapshot())}`);
}

main().catch((error) => console.error(`demo failed: ${error.message}`));
