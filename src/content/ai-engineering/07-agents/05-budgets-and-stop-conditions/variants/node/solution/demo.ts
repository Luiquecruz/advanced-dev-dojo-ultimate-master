import { createModel } from '@dojo/ai';
import { fakeModel, respond } from '@dojo/ai/testing';
import { runBudgetedAgent } from './main';
import type { AgentTool, Budget, BudgetedResult } from './main';

let clock = 0;
let toolLatencyMs = 1000;

const tools: AgentTool[] = [
  {
    name: 'search_docs',
    description: 'Search the product documentation',
    parameters: { type: 'object', properties: { query: { type: 'string' }, page: { type: 'number' } }, required: ['query'] },
    execute: ({ query, page = 1 }) => {
      clock += toolLatencyMs;
      return { query, page, hits: [`Doc about ${query}, page ${page}`] };
    },
  },
];

const budget: Budget = { maxSteps: 8, maxTokens: 5000, maxCostUsd: 0.25, maxDurationMs: 6000 };

function report(scenario: string, result: BudgetedResult) {
  const { usage, stop } = result;
  console.log(`${scenario.padEnd(22)} ${stop.reason.padEnd(10)} steps=${usage.steps} tokens=${String(usage.totalTokens).padStart(4)} cost=$${usage.costUsd.toFixed(4)} elapsed=${result.elapsedMs} ms`);
  console.log(`${''.padEnd(22)} ${stop.detail}`);
}

async function run(scenario: string, script: () => void, latencyMs = 1000) {
  clock = 0;
  toolLatencyMs = latencyMs;
  fakeModel.reset().configure({ pricing: { inputPerMillion: 1000, outputPerMillion: 1000 } });
  script();
  report(scenario, await runBudgetedAgent(createModel(), { task: 'How do I rotate an API key?', tools, budget, now: () => clock }));
}

async function main() {
  console.log(`Budget: ${JSON.stringify(budget)}\n`);
  await run('answers in 3 steps', () => {
    fakeModel.reply(respond.toolCall('search_docs', { query: 'api key' }), respond.toolCall('search_docs', { query: 'rotate key' }), respond.text('Open Settings > API keys and click Rotate.'));
  });
  await run('repeats the same call', () => {
    fakeModel.handle(() => respond.toolCall('search_docs', { query: 'api key', page: 1 }));
  });
  await run('keeps paging', () => {
    let page = 0;
    fakeModel.handle(() => respond.toolCall('search_docs', { query: 'api key rotation and every related security setting', page: ++page }));
  });
  await run('slow tools', () => {
    let page = 0;
    fakeModel.handle(() => respond.toolCall('search_docs', { query: 'key', page: ++page }));
  }, 2500);
}

main().catch((error) => console.error(`demo failed: ${error.message}`));
