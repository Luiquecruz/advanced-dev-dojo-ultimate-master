import { createModel } from '@dojo/ai';
import type { Message } from '@dojo/ai';
import { fakeModel, respond } from '@dojo/ai/testing';
import { searchOrders } from './main';

async function main() {
  console.log('Definition the model sees:');
  console.log(JSON.stringify(searchOrders.definition, null, 2));

  fakeModel.reply(
    respond.toolCall('search_orders', { email: 'ada@example.com', status: 'in transit' }),
    respond.toolCall('search_orders', { customerEmail: 'ada@exmaple.com', status: 'shipped' }),
    respond.toolCall('search_orders', { customerEmail: 'ada@example.com', status: 'shipped' }),
    respond.text('You have two orders on the way: A-1010 and A-1009.'),
  );

  const model = createModel();
  const messages: Message[] = [{ role: 'user', content: 'My email is ada@example.com. Which of my orders are on the way?' }];
  for (let round = 1; round <= 5; round++) {
    const response = await model.generate({ messages, tools: [searchOrders.definition] });
    if (response.toolCalls.length === 0) {
      console.log(`\nFinal answer after ${round} calls: ${response.text}`);
      return;
    }
    messages.push({ role: 'assistant', content: response.text, toolCalls: response.toolCalls });
    for (const call of response.toolCalls) {
      const content = await searchOrders.call(call.arguments);
      console.log(`\n${call.name}(${call.arguments})\n${content}`);
      messages.push({ role: 'tool', toolCallId: call.id, content });
    }
  }
}

main().catch((error) => console.error(`demo failed: ${error.message}`));
