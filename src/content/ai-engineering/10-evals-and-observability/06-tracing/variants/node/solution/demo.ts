import { createModel } from '@dojo/ai';
import type { Message } from '@dojo/ai';
import { fakeModel, respond } from '@dojo/ai/testing';
import { createTracer, summarizeTrace, tracedModel, tracedTool } from './main';
import type { Span } from './main';

const PRICING = { 'atlas-mini': { inputPerMillion: 0.4, outputPerMillion: 1.6 } };

function printTree(spans: Span[], parentSpanId: string | null, depth: number) {
  spans
    .filter((span) => span.parentSpanId === parentSpanId)
    .sort((left, right) => left.startMs - right.startMs)
    .forEach((span) => {
      const usage = span.attributes['gen_ai.usage.input_tokens'] === undefined ? '' : ` in=${span.attributes['gen_ai.usage.input_tokens']} out=${span.attributes['gen_ai.usage.output_tokens']}`;
      const failure = span.status === 'error' ? ` error.type=${span.attributes['error.type']}` : '';
      console.log(`${'  '.repeat(depth + 1)}${span.name} [${span.kind}, ${span.status}, ${(span.endMs ?? span.startMs) - span.startMs} ms]${usage}${failure}`);
      printTree(spans, span.spanId, depth + 1);
    });
}

async function main() {
  let time = 0;
  const tracer = createTracer({ now: () => (time += 40) });
  fakeModel.forModel('atlas-mini').reply(
    respond.toolCall('get_order', { orderId: 'A-1' }),
    respond.error(503),
    respond.text('Your order A-1 shipped yesterday and arrives Friday.'),
  );

  const root = tracer.startSpan('invoke_agent support', { attributes: { 'gen_ai.operation.name': 'invoke_agent', 'gen_ai.agent.name': 'support' } });
  const model = tracedModel(createModel({ model: 'atlas-mini' }), tracer, { provider: 'atlas', parent: root });
  const getOrder = tracedTool({ name: 'get_order', description: 'Look up an order by id', execute: (args) => ({ orderId: args.orderId, status: 'shipped' }) }, tracer, { parent: root });

  const messages: Message[] = [{ role: 'user', content: 'Where is my order A-1? My email is ana@example.com.' }];
  const first = await model.generate({ messages });
  messages.push({ role: 'assistant', content: first.text, toolCalls: first.toolCalls });
  for (const call of first.toolCalls) {
    messages.push({ role: 'tool', toolCallId: call.id, content: JSON.stringify(await getOrder.execute(JSON.parse(call.arguments), call.id)) });
  }
  try {
    await model.generate({ messages });
  } catch {
    console.log('Second model call failed with 503; the agent retried once.');
  }
  const final = await model.generate({ messages });
  root.end('ok');

  console.log(`Answer: ${final.text}\n\nTrace ${root.traceId}`);
  printTree(tracer.spans, null, 0);
  const summary = summarizeTrace(tracer.spans, root.traceId, PRICING);
  console.log(`\nRollup: ${summary.modelCalls} model calls, ${summary.toolCalls} tool call, ${summary.errors} error, ${summary.inputTokens}+${summary.outputTokens} tokens, $${summary.costUsd.toFixed(6)}, ${summary.durationMs} ms`);
  const captured = JSON.stringify(tracer.spans).includes('ana@example.com');
  console.log(`Prompt content in spans: ${captured ? 'yes' : 'no (content capture is off by default)'}`);
}

main().catch((error) => console.error(`demo failed: ${error.message}`));
