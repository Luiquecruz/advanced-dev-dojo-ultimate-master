import { createModel } from '@dojo/ai';
import type { GenerateRequest } from '@dojo/ai';
import { fakeModel, respond } from '@dojo/ai/testing';
import { answerWithTools, buildToolIndex, definitionTokens } from './main';
import { createBrokenServer, createCompanyServers } from './servers';

function offeredTools(request: GenerateRequest): string {
  return (request.tools ?? []).map((tool) => tool.name).join(', ');
}

async function main() {
  const index = await buildToolIndex([...createCompanyServers(), { id: 'legacy', server: createBrokenServer() }]);
  const everything = index.definitionsFor(index.tools.map((tool) => tool.qualifiedName), Infinity);
  const everythingTokens = everything.reduce((total, definition) => total + definitionTokens(definition), 0);
  console.log(`Indexed ${index.tools.length} tools (${everythingTokens} tokens if all were sent on every call)`);
  index.failures.forEach((failure) => console.log(`Skipped server "${failure.serverId}": ${failure.message}`));
  console.log(`Search "refund an invoice": ${index.search('refund an invoice', 3).map((tool) => tool.qualifiedName).join(', ')}`);

  fakeModel.reply(
    respond.toolCall('search_tools', { query: 'refund an invoice' }),
    respond.toolCall('billing__refund_invoice', { invoice: 'INV-1001', reason: 'arrived damaged' }),
    respond.text('Done: INV-1001 was refunded to your original payment method.'),
  );
  const result = await answerWithTools(createModel(), index, 'Please refund invoice INV-1001, it arrived damaged.', { budgetTokens: 300, searchLimit: 2 });

  console.log('');
  fakeModel.requests.forEach((request, position) => console.log(`call ${position + 1} offered: ${offeredTools(request)}`));
  const lastRequest = fakeModel.requests[fakeModel.requests.length - 1];
  console.log(`tool result: ${lastRequest.messages[lastRequest.messages.length - 1].content}`);
  console.log(`\nAnswer after ${result.rounds} rounds: ${result.text}`);
  console.log(`Loaded on demand: ${result.loadedTools.join(', ')}`);
}

main().catch((error) => console.error(`demo failed: ${error.message}`));
