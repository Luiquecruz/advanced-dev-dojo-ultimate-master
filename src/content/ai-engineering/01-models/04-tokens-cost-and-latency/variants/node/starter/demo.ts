import { createModel } from '@dojo/ai';
import type { Message } from '@dojo/ai';
import { fakeModel, respond } from '@dojo/ai/testing';
import { BudgetExceededError, createBudgetedClient, estimateCost } from './main';

const PRICING = { inputPerMillion: 3, outputPerMillion: 15 };
const SYSTEM: Message = { role: 'system', content: 'You are a support assistant for an online shop. Answer in at most three sentences.' };
const ask = (question: string): Message[] => [SYSTEM, { role: 'user', content: question }];
const dollars = (value: number) => `$${value.toFixed(6)}`;

async function main() {
  fakeModel.configure({ pricing: PRICING, tokenizerDrift: 0.12 });
  fakeModel.reply(
    respond.slow(80, respond.text('Order 1042 left the warehouse yesterday and arrives on Thursday.')),
    respond.slow(35, respond.text('Yes, returns are free within 30 days.')),
  );

  const question = ask('Where is order 1042?');
  const naive = estimateCost(question, 200, PRICING);
  const safe = estimateCost(question, 200, PRICING, 0.2);
  console.log(`input tokens: local count ${naive.inputTokens}, with 20% margin ${safe.inputTokens}`);

  const client = createBudgetedClient({ model: createModel(), pricing: PRICING, maxRequestCost: 0.004, maxSessionCost: 0.01 });
  for (const [prompt, maxTokens] of [['Where is order 1042?', 200], ['Are returns free?', 200], ['Paste of a 40-page contract...'.repeat(60), 200]] as const) {
    try {
      const result = await client.send(ask(prompt), maxTokens);
      console.log(`sent: reported ${result.usage.inputTokens} input tokens, estimated ${dollars(result.estimatedCost)}, paid ${dollars(result.usage.cost)}, ${result.latencyMs} ms`);
    } catch (error) {
      if (!(error instanceof BudgetExceededError)) {
        throw error;
      }
      console.log(`refused before sending (${error.scope} budget): ${error.message}`);
    }
  }
  const report = client.report();
  console.log(`session: ${report.requests} requests, ${report.inputTokens + report.outputTokens} tokens, ${dollars(report.cost)}, latencies ${report.latenciesMs.join(' / ')} ms`);
}

main().catch((error) => console.error(`demo failed: ${error.message}`));
