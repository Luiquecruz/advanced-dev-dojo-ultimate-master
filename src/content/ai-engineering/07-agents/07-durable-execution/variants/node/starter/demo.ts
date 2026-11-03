import { readFileSync } from 'node:fs';
import { createModel } from '@dojo/ai';
import type { GenerateRequest } from '@dojo/ai';
import { fakeModel, respond } from '@dojo/ai/testing';
import { createFileStore, runDurableAgent } from './main';
import type { Checkpoint, CheckpointStore, DurableTool } from './main';

const paymentsProvider = new Map<string, number>();
const sideEffects: string[] = [];

const tools: DurableTool[] = [
  {
    name: 'charge_card',
    description: 'Charge the customer card; the provider deduplicates by idempotency key',
    parameters: { type: 'object', properties: { amount: { type: 'number' } } },
    execute: ({ amount }, { idempotencyKey }) => {
      if (paymentsProvider.has(idempotencyKey)) {
        sideEffects.push(`charge $${amount} ignored by the provider (key ${idempotencyKey} already used)`);
      } else {
        paymentsProvider.set(idempotencyKey, Number(amount));
        sideEffects.push(`charged $${amount} (key ${idempotencyKey})`);
      }
      return { charged: amount };
    },
  },
  {
    name: 'reserve_stock',
    description: 'Reserve items in the warehouse',
    parameters: { type: 'object', properties: { sku: { type: 'string' } } },
    execute: ({ sku }) => {
      sideEffects.push(`reserved ${sku}`);
      return { reserved: sku };
    },
  },
];

const toolResults = (request: GenerateRequest) => request.messages.filter((message) => message.role === 'tool').length;

function crashOnceAfterCharge(inner: CheckpointStore): CheckpointStore {
  let crashed = false;
  return {
    load: (runId) => inner.load(runId),
    async save(checkpoint: Checkpoint) {
      if (!crashed && checkpoint.messages.some((message) => message.role === 'tool')) {
        crashed = true;
        throw new Error('the worker was killed by a deploy');
      }
      await inner.save(checkpoint);
    },
  };
}

async function main() {
  fakeModel.handle((request) => {
    switch (toolResults(request)) {
      case 0:
        return respond.toolCall('charge_card', { amount: 120 });
      case 1:
        return respond.toolCall('reserve_stock', { sku: 'LAMP-01' });
      default:
        return respond.text('Order paid and stock reserved.');
    }
  });
  const options = { runId: 'order-1042', task: 'Fulfil order 1042: charge $120 and reserve LAMP-01.', tools, maxSteps: 6 };

  try {
    await runDurableAgent(createModel(), { ...options, store: crashOnceAfterCharge(createFileStore('/app/checkpoints')) });
  } catch (error) {
    console.log(`Attempt 1 crashed: ${(error as Error).message}`);
  }
  const result = await runDurableAgent(createModel(), { ...options, store: createFileStore('/app/checkpoints') });
  console.log(`Attempt 2: status=${result.status} resumed=${result.resumed} steps=${result.steps} answer="${result.answer}"\n`);

  console.log('Side effects, in order:');
  sideEffects.forEach((entry) => console.log(`  ${entry}`));
  console.log(`\nCharges recorded by the payment provider: ${paymentsProvider.size}`);

  const checkpoint: Checkpoint = JSON.parse(readFileSync('/app/checkpoints/order-1042.json', 'utf8'));
  console.log(`Checkpoint file: status=${checkpoint.status}, ${checkpoint.messages.length} messages, roles ${checkpoint.messages.map((message) => message.role).join(' > ')}`);

  const replay = await runDurableAgent(createModel(), { ...options, store: createFileStore('/app/checkpoints') });
  console.log(`Running the finished order again: answer="${replay.answer}", no new model calls (${fakeModel.requests.length} in total)`);
}

main().catch((error) => console.error(`demo failed: ${error.message}`));
