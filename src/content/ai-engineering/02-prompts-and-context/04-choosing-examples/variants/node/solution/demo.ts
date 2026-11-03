import { createModel } from '@dojo/ai';
import { fakeModel, respond } from '@dojo/ai/testing';
import { classifyWithExamples, exampleTokens, selectExamples, type Example } from './main';

const POOL: Example[] = [
  { id: 'refund-late', input: 'My refund has not arrived after two weeks.', output: 'billing' },
  { id: 'refund-late-copy', input: 'My refund has NOT arrived after two weeks!', output: 'billing' },
  { id: 'refund-card', input: 'Where is the refund for my card payment?', output: 'billing' },
  { id: 'invoice-vat', input: 'The invoice shows the wrong VAT number.', output: 'billing' },
  { id: 'parcel-stuck', input: 'The parcel tracking has not moved for a week.', output: 'shipping' },
  { id: 'parcel-damaged', input: 'My parcel arrived damaged and the box was open.', output: 'shipping' },
  { id: 'password-reset', input: 'I cannot reset my password.', output: 'account' },
  { id: 'email-change', input: 'How do I change the email on my account?', output: 'account' },
  { id: 'export-crash', input: 'The export button crashes the app.', output: 'bug' },
  { id: 'blank-screen', input: 'The checkout page shows a blank screen.', output: 'bug' },
];
const LABELS = ['billing', 'shipping', 'account', 'bug'];
const SYSTEM = 'Classify the support ticket. Answer with one of: billing, shipping, account, bug.';
const QUERIES = ['When will my refund arrive?', 'The parcel tracking page is stuck since Monday.', 'The app crashes when I export a report.'];

async function main() {
  fakeModel.reply(respond.text('Billing.'), respond.text('shipping'), respond.text('I would say this is a bug'));
  const model = createModel();
  for (const query of QUERIES) {
    const options = { k: 3, maxTokens: 60, minSimilarity: 0.3 };
    const chosen = selectExamples(query, POOL, options);
    const tokens = chosen.reduce((total, example) => total + exampleTokens(example), 0);
    console.log(`"${query}"`);
    chosen.forEach((example) => console.log(`  ${example.score.toFixed(2)}  ${example.id.padEnd(16)} ${example.output}`));
    const result = await classifyWithExamples(model, { system: SYSTEM, query, pool: POOL, labels: LABELS, ...options });
    console.log(`  ${chosen.length} examples, ${tokens} tokens -> label: ${result.label ?? 'unrecognized, send to review'}\n`);
  }
}

main().catch((error) => console.error(`demo failed: ${error.message}`));
