import { createModel } from '@dojo/ai';
import type { GenerateRequest, Message } from '@dojo/ai';
import { fakeModel, respond } from '@dojo/ai/testing';
import { runWithTools } from './main';
import type { Tool } from './main';

const ORDERS: Record<string, { status: string; carrier: string; eta: string }> = {
  'A-1001': { status: 'shipped', carrier: 'ParcelGo', eta: '2026-11-03' },
};

const tools: Tool[] = [
  {
    name: 'get_order',
    description: 'Look up an order by its id (format A-1234). Returns status, carrier and estimated delivery date.',
    parameters: { type: 'object', properties: { orderId: { type: 'string' } }, required: ['orderId'] },
    execute: ({ orderId }) => {
      const order = ORDERS[String(orderId)];
      if (!order) {
        throw new Error(`No order with id ${orderId}. Ask the customer to check the id.`);
      }
      return { orderId, ...order };
    },
  },
];

function lastToolResult(request: GenerateRequest): string | undefined {
  const last = request.messages[request.messages.length - 1];
  return last.role === 'tool' ? last.content : undefined;
}

function describe(message: Message): string {
  if (message.toolCalls?.length) {
    return `assistant -> ${message.toolCalls.map((call) => `${call.name}(${call.arguments})`).join(', ')}`;
  }
  return `${message.role.padEnd(9)} ${message.content}`;
}

async function main() {
  fakeModel.reply(respond.invalidToolArguments('get_order'), respond.toolCall('get_order', { orderId: 'A-1001' }));
  fakeModel.handle((request) => {
    const result = lastToolResult(request);
    return result ? respond.text(`Good news: ${JSON.parse(result).status}, arriving ${JSON.parse(result).eta}.`) : respond.text('How can I help?');
  });

  const result = await runWithTools(createModel(), {
    messages: [
      { role: 'system', content: 'You are a support assistant. Use tools to answer order questions.' },
      { role: 'user', content: 'Where is my order A-1001?' },
    ],
    tools,
  });
  result.messages.forEach((message) => console.log(describe(message)));
  console.log(`\nAnswered in ${result.rounds} model calls: ${result.text}`);
}

main().catch((error) => console.error(`demo failed: ${error.message}`));
