import { createModel } from '@dojo/ai';
import type { GenerateRequest, Message } from '@dojo/ai';
import { fakeModel, respond } from '@dojo/ai/testing';
import { runAgent } from './main';
import type { AgentTool } from './main';

const ORDERS: Record<string, { status: string; total: number; shippedAt?: string }> = {
  'A-1001': { status: 'shipped', total: 84.5, shippedAt: '2026-10-27' },
  'A-1002': { status: 'processing', total: 19.9 },
};

const tools: AgentTool[] = [
  {
    name: 'find_orders',
    description: 'List order ids for a customer email',
    parameters: { type: 'object', properties: { email: { type: 'string' } }, required: ['email'] },
    execute: ({ email }) => (email === 'ana@example.com' ? ['A-1001', 'A-1002'] : []),
  },
  {
    name: 'get_order',
    description: 'Status, total and shipping date of one order',
    parameters: { type: 'object', properties: { orderId: { type: 'string' } }, required: ['orderId'] },
    execute: ({ orderId }) => {
      const order = ORDERS[String(orderId)];
      if (!order) {
        throw new Error(`order ${orderId} not found`);
      }
      return order;
    },
  },
];

function toolResults(request: GenerateRequest): Message[] {
  return request.messages.filter((message) => message.role === 'tool');
}

function scriptSupportModel() {
  fakeModel.handle((request) => {
    const results = toolResults(request);
    switch (results.length) {
      case 0:
        return respond.toolCall('find_orders', { email: 'ana@example.com' });
      case 1:
        return respond.invalidToolArguments('get_order');
      case 2:
        return respond.toolCalls([
          { name: 'get_order', arguments: { orderId: 'A-1001' } },
          { name: 'get_order', arguments: { orderId: 'A-9999' } },
        ]);
      case 4:
        return respond.unknownTool('refund_order');
      default:
        return respond.text('Order A-1001 shipped on 2026-10-27; order A-1002 is still being processed.');
    }
  });
}

function describe(message: Message): string {
  if (message.role === 'assistant' && message.toolCalls?.length) {
    return `assistant -> ${message.toolCalls.map((call) => `${call.name}(${call.arguments})`).join(', ')}`;
  }
  return `${message.role.padEnd(9)} ${message.content}`;
}

async function main() {
  scriptSupportModel();
  const result = await runAgent(createModel(), {
    system: 'You are a support agent. Use the tools to answer questions about orders.',
    task: 'Where are my orders? My email is ana@example.com.',
    tools,
    maxSteps: 8,
  });
  console.log(`status=${result.status} steps=${result.steps}\n`);
  result.messages.forEach((message) => console.log(describe(message)));

  fakeModel.reset().handle(() => respond.toolCall('find_orders', { email: 'ana@example.com' }));
  const looping = await runAgent(createModel(), { task: 'Where are my orders?', tools, maxSteps: 3 });
  console.log(`\nA model that never stops calling tools: status=${looping.status} after ${looping.steps} steps`);
}

main().catch((error) => console.error(`demo failed: ${error.message}`));
