import { readFileSync } from 'node:fs';
import { createModel } from '@dojo/ai';
import { fakeModel, respond } from '@dojo/ai/testing';
import { initializeProject, readTasks, runSession, type Task } from './main';

const DIRECTORY = '/app/checkout-rewrite';

const PLAN = [
  { id: 'cart-model', title: 'Cart model with line items' },
  { id: 'totals', title: 'Totals with tax and discounts' },
  { id: 'checkout-api', title: 'POST /checkout endpoint' },
  { id: 'receipt-email', title: 'Receipt email after payment' },
  { id: 'gift-cards', title: 'Gift card redemption' },
];

const verify = (task: Task, output: string) => ({ passed: output.startsWith(`DONE ${task.id}`), feedback: `the tests for ${task.id} still fail` });

const taskIdOf = (content: string) => /^Task (\S+):/.exec(content)?.[1] ?? 'unknown';

async function main() {
  console.log(`initialized: ${initializeProject(DIRECTORY, PLAN)}`);
  console.log(`initialized again: ${initializeProject(DIRECTORY, PLAN)} (the plan is never overwritten)`);

  let giftCardAttempts = 0;
  fakeModel.handle((request) => {
    const id = taskIdOf(request.messages[1].content);
    if (id === 'gift-cards') {
      giftCardAttempts += 1;
      return respond.text('I could not find the payment provider docs.');
    }
    return respond.text(`DONE ${id}`);
  });
  fakeModel.reply(respond.text('DONE cart-model'), respond.text('DONE totals'), respond.text('DONE checkout-api'), respond.error(500));

  const model = createModel();
  const sessions = ['monday', 'tuesday', 'wednesday', 'thursday'];
  for (const sessionId of sessions) {
    try {
      const result = await runSession(DIRECTORY, { model, verify, sessionId, maxTasks: 2, maxAttempts: 2 });
      console.log(`session ${sessionId}: completed [${result.completed.join(', ')}], blocked [${result.blocked.join(', ')}], ${result.remaining} pending`);
    } catch (error) {
      console.log(`session ${sessionId}: crashed (${(error as Error).message}); state on disk is kept`);
    }
  }

  console.log('tasks.json:');
  for (const task of readTasks(DIRECTORY)) {
    console.log(`  ${task.id.padEnd(14)} ${task.status.padEnd(8)} attempts=${task.attempts}`);
  }
  console.log('progress.md:');
  console.log(readFileSync(`${DIRECTORY}/progress.md`, 'utf8').trimEnd().replace(/^/gm, '  '));
  console.log(`gift card attempts: ${giftCardAttempts}`);
}

main().catch((error) => console.error(`demo failed: ${error.message}`));
