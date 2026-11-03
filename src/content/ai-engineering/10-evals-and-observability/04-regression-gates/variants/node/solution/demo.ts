import { createModel } from '@dojo/ai';
import { fakeModel, respond } from '@dojo/ai/testing';
import { compareRuns, evaluateVariant } from './main';
import type { EvalCase, GateResult, Variant, VariantRun } from './main';

const DATASET: EvalCase[] = [
  { id: 'vat-number', input: 'My invoice shows the wrong VAT number.', expected: 'billing' },
  { id: 'stuck-parcel', input: 'The parcel tracking has not moved for a week.', expected: 'shipping' },
  { id: 'double-charge', input: 'I was charged twice for one order.', expected: 'billing', critical: true },
  { id: 'password-reset', input: 'I cannot reset my password.', expected: 'account' },
  { id: 'wrong-address', input: 'Can I change the delivery address of my order?', expected: 'shipping' },
];

const variant = (name: string, system: string): Variant => ({
  name,
  model: createModel({ model: name }),
  prompt: (evalCase) => ({
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: evalCase.input },
    ],
  }),
});

const score = (output: string, evalCase: EvalCase) => output.trim().toLowerCase() === evalCase.expected;

function printGate(baseline: VariantRun, candidate: VariantRun, gate: GateResult) {
  console.log(`\n${baseline.variant} vs ${candidate.variant} (${candidate.repeats} runs per case)`);
  for (const before of baseline.cases) {
    const after = candidate.cases.find((result) => result.id === before.id)!;
    const marker = before.critical ? ' (critical)' : '';
    console.log(`  ${(before.id + marker).padEnd(26)} ${before.passes}/${before.runs} -> ${after.passes}/${after.runs}`);
  }
  console.log(`  pass rate ${baseline.passRate.toFixed(2)} -> ${candidate.passRate.toFixed(2)}, flaky in candidate: ${candidate.flaky.join(', ') || 'none'}`);
  console.log(`  decision: ${gate.decision.toUpperCase()}${gate.reasons.map((reason) => `\n    - ${reason}`).join('')}`);
}

async function main() {
  fakeModel.seed(3).handle((request) => {
    const input = request.messages.at(-1)!.content;
    const expected = DATASET.find((evalCase) => evalCase.input === input)!.expected;
    if (request.model === 'triage-v2' && input.includes('charged twice')) {
      return respond.sometimes(0.5, respond.text('billing'), respond.text('shipping'));
    }
    if (request.model !== 'triage-v3' && input.includes('address')) {
      return respond.sometimes(0.6, respond.text('shipping'), respond.text('account'));
    }
    return respond.text([expected, `${expected[0].toUpperCase()}${expected.slice(1)}`]);
  });

  const options = { dataset: DATASET, score, repeats: 5 };
  const baseline = await evaluateVariant(variant('triage-v1', 'Classify the ticket as billing, shipping or account.'), options);
  const shorterPrompt = await evaluateVariant(variant('triage-v2', 'Category? billing/shipping/account'), options);
  printGate(baseline, shorterPrompt, compareRuns(baseline, shorterPrompt, { tolerance: 0.05, caseTolerance: 0.2 }));

  const withExamples = await evaluateVariant(variant('triage-v3', 'Classify the ticket as billing, shipping or account. Examples: ...'), options);
  printGate(baseline, withExamples, compareRuns(baseline, withExamples, { tolerance: 0.05, caseTolerance: 0.2 }));
}

main().catch((error) => console.error(`demo failed: ${error.message}`));
