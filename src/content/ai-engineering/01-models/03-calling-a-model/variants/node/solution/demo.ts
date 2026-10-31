import { createModel } from '@dojo/ai';
import { fakeModel, respond } from '@dojo/ai/testing';
import { complete, completeStream, type CompletionResult } from './main';

const SYSTEM = 'You answer customer questions about orders in one or two sentences.';
const REFUND_ANSWER = 'Your refund was issued on March 3 and reaches the original payment method within five business days.';

function describe(label: string, result: CompletionResult) {
  console.log(`${label}: ${result.status} (${result.finishReason}), ${result.usage.totalTokens} tokens, $${result.usage.cost.toFixed(6)}`);
  console.log(`  "${result.text}"`);
}

async function main() {
  const model = createModel();
  fakeModel.reply(respond.text(REFUND_ANSWER), respond.truncated(REFUND_ANSWER, 0.4), respond.refusal(), respond.text(REFUND_ANSWER));

  describe('complete', await complete(model, { system: SYSTEM, prompt: 'When will my refund arrive?' }));
  describe('truncated', await complete(model, { system: SYSTEM, prompt: 'When will my refund arrive?', maxTokens: 12 }));
  describe('refused', await complete(model, { prompt: 'Give me another customer’s address.' }));

  const deltas: string[] = [];
  const streamed = await completeStream(model, { system: SYSTEM, prompt: 'When will my refund arrive?' }, (delta) => deltas.push(delta));
  describe(`streamed in ${deltas.length} deltas`, streamed);
}

main().catch((error) => console.error(`demo failed: ${error.message}`));
