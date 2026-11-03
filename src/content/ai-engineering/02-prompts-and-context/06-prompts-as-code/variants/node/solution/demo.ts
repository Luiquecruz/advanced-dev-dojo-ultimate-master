import { createModel } from '@dojo/ai';
import { fakeModel, respond } from '@dojo/ai/testing';
import { createPromptRegistry, PromotionBlockedError, type PromptDefinition } from './main';

const LABELS = ['billing', 'shipping', 'account', 'bug'];
const TESTS = [
  { name: 'double charge is billing', variables: { product: 'Parcelly', ticket: 'I was charged twice.' }, check: (output: string) => output.trim().toLowerCase() === 'billing' },
  { name: 'crash is a bug', variables: { product: 'Parcelly', ticket: 'The app crashes on export.' }, check: (output: string) => output.trim().toLowerCase() === 'bug' },
  { name: 'answers with a known label', variables: { product: 'Parcelly', ticket: 'Where is my parcel?' }, check: (output: string) => LABELS.includes(output.trim().toLowerCase()) },
];

const version = (id: string, system: string): PromptDefinition => ({
  name: 'triage',
  version: id,
  template: { system, user: 'Ticket:\n{{ ticket }}' },
  tests: TESTS,
});

async function main() {
  const registry = createPromptRegistry();
  registry.register(version('1.0.0', 'You classify support tickets for {{product}}. Answer with one of: billing, shipping, account, bug.'));
  registry.register(version('1.1.0', 'You classify support tickets for {{product}}. Answer with one word.'));
  registry.register(version('1.2.0', 'You classify support tickets for {{product}}. Answer with exactly one of: billing, shipping, account, bug. Lowercase, no punctuation.'));

  const model = createModel();
  const plan: Array<[string, string]> = [['1.0.0', 'production'], ['1.1.0', 'production'], ['1.2.0', 'staging'], ['1.2.0', 'production']];
  fakeModel.reply(
    respond.text('billing'), respond.text('bug'), respond.text('shipping'),
    respond.text('Billing'), respond.text('Crash'), respond.text('Delivery'),
    respond.text('billing'), respond.text('bug'), respond.text('shipping'),
    respond.text('billing'), respond.text('bug'), respond.text('shipping'),
  );
  for (const [id, environment] of plan) {
    try {
      await registry.promote('triage', id, environment, model);
      console.log(`promoted triage@${id} to ${environment}`);
    } catch (error) {
      if (!(error instanceof PromotionBlockedError)) {
        throw error;
      }
      console.log(`blocked triage@${id} for ${environment}: failed ${error.failedTests.join(', ')}`);
    }
  }
  console.log(`active: production ${registry.activeVersion('triage', 'production')}, staging ${registry.activeVersion('triage', 'staging')}`);
  console.log(`incident in production, rolling back to ${registry.rollback('triage', 'production')}`);
  const rendered = registry.render('triage', { product: 'Parcelly', ticket: 'My invoice shows the wrong VAT number.' });
  console.log(`serving triage@${rendered.version}: ${rendered.messages[0].content}`);
  try {
    registry.render('triage', { product: 'Parcelly', tiket: 'typo' });
  } catch (error) {
    console.log(`render refused: ${(error as Error).message}`);
  }
}

main().catch((error) => console.error(`demo failed: ${error.message}`));
