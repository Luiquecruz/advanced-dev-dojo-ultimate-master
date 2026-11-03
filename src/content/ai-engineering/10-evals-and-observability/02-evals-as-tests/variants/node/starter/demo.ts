import { createModel } from '@dojo/ai';
import { fakeModel, respond } from '@dojo/ai/testing';
import { z } from 'zod';
import { exactScorer, runEval, schemaScorer, semanticScorer } from './main';
import type { EvalCase, EvalReport } from './main';

const TicketSchema = z.object({
  category: z.enum(['billing', 'shipping', 'account']),
  priority: z.number().int().min(1).max(3),
});

const TRIAGE_SET: EvalCase[] = [
  { id: 'vat-number', input: 'My invoice shows the wrong VAT number.', expected: 'billing' },
  { id: 'stuck-parcel', input: 'The parcel tracking has not moved for a week.', expected: 'shipping' },
  { id: 'password-reset', input: 'I cannot reset my password.', expected: 'account' },
  { id: 'double-charge', input: 'I was charged twice for one order.', expected: 'billing' },
];

const ANSWER_SET: EvalCase[] = [
  { id: 'refund-timing', input: 'When do I get my money back?', expected: 'Refunds reach the original card within 5 business days.' },
  { id: 'return-window', input: 'How long do I have to return shoes?', expected: 'You can return shoes within 30 days of delivery.' },
];

const promptFor = (system: string) => (evalCase: EvalCase) => ({
  messages: [
    { role: 'system' as const, content: system },
    { role: 'user' as const, content: evalCase.input },
  ],
});

function print(title: string, report: EvalReport) {
  console.log(`\n${title}`);
  for (const result of report.cases) {
    const verdict = result.pass ? 'PASS' : 'FAIL';
    const reason = result.error ?? Object.entries(result.scores).map(([name, score]) => `${name}: ${score.detail}`).join(' | ');
    console.log(`  ${verdict}  ${result.id.padEnd(15)} ${reason}`);
  }
  const { passed, total, errored, passRate } = report.summary;
  console.log(`  ${passed}/${total} passed (${Math.round(passRate * 100)}%), ${errored} model error(s)`);
}

async function main() {
  const model = createModel();

  fakeModel.reply(respond.text('Billing.'), respond.text('account'), respond.text('account'), respond.error(503));
  print('Triage labels (exact)', await runEval({ model, dataset: TRIAGE_SET, prompt: promptFor('Answer with one category: billing, shipping or account.'), scorers: [exactScorer()] }));

  fakeModel.reply(
    respond.json({ category: 'billing', priority: 2 }),
    respond.malformedJson({ category: 'shipping', priority: 1 }),
    respond.json({ category: 'login', priority: 1 }),
    respond.json({ category: 'billing', priority: 3 }),
  );
  print('Triage JSON (schema)', await runEval({ model, dataset: TRIAGE_SET, prompt: promptFor('Reply with JSON: {"category", "priority"}.'), scorers: [schemaScorer(TicketSchema)] }));

  fakeModel.reply(respond.text('Your refund reaches the card you paid with in 5 business days.'), respond.text('Please contact our store for more details.'));
  print('Policy answers (semantic, threshold 0.6)', await runEval({ model, dataset: ANSWER_SET, prompt: promptFor('Answer from the return policy.'), scorers: [semanticScorer({ threshold: 0.6 })] }));
}

main().catch((error) => console.error(`demo failed: ${error.message}`));
