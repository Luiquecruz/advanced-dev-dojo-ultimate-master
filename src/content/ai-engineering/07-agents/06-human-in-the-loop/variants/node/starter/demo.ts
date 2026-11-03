import { createModel } from '@dojo/ai';
import type { GenerateRequest } from '@dojo/ai';
import { fakeModel, respond } from '@dojo/ai/testing';
import { resumeAgent, startAgent } from './main';
import type { AgentRun, ApprovalTool, Decision } from './main';

function createTools(log: string[]): ApprovalTool[] {
  return [
    {
      name: 'get_order',
      description: 'Read an order',
      parameters: { type: 'object', properties: { orderId: { type: 'string' } } },
      execute: ({ orderId }) => ({ orderId, total: 240, customer: 'ana@example.com' }),
    },
    {
      name: 'refund',
      description: 'Refund part or all of an order',
      parameters: { type: 'object', properties: { orderId: { type: 'string' }, amount: { type: 'number' } } },
      requiresApproval: ({ amount }) => Number(amount) > 50,
      execute: ({ orderId, amount }) => {
        log.push(`refunded $${amount} on ${orderId}`);
        return { refunded: amount };
      },
    },
    {
      name: 'email_customer',
      description: 'Send an email to the customer',
      parameters: { type: 'object', properties: { body: { type: 'string' } } },
      requiresApproval: true,
      execute: ({ body }) => {
        log.push(`emailed: ${body}`);
        return 'sent';
      },
    },
  ];
}

const toolResultCount = (request: GenerateRequest) => request.messages.filter((message) => message.role === 'tool').length;

function scriptAgent() {
  fakeModel.handle((request) => {
    switch (toolResultCount(request)) {
      case 0:
        return respond.toolCall('get_order', { orderId: 'A-77' });
      case 1:
        return respond.toolCalls([
          { name: 'refund', arguments: { orderId: 'A-77', amount: 240 } },
          { name: 'email_customer', arguments: { body: 'We refunded your full order, sorry!' } },
        ]);
      default:
        return respond.text('The refund and the email were handled as the reviewer decided.');
    }
  });
}

function show(label: string, run: AgentRun) {
  console.log(`${label}: status=${run.status} steps=${run.state.steps}`);
  if (run.status === 'interrupted') {
    run.pending.forEach((pending) => console.log(`  waiting for a human: ${pending.name}(${JSON.stringify(pending.arguments)})`));
  }
}

async function main() {
  scriptAgent();
  const firstLog: string[] = [];
  const interrupted = await startAgent(createModel(), { task: 'Customer says order A-77 arrived broken. Handle it.', tools: createTools(firstLog), maxSteps: 6 });
  show('Monday 17:58', interrupted);
  const saved = JSON.stringify(interrupted.state);
  console.log(`  state saved as ${saved.length} characters of JSON; side effects so far: ${firstLog.length}\n`);

  if (interrupted.status !== 'interrupted') {
    return;
  }
  const [refundCall, emailCall] = interrupted.pending;
  const decisions: Record<string, Decision> = {
    [refundCall.toolCallId]: { type: 'edit', arguments: { orderId: 'A-77', amount: 120 } },
    [emailCall.toolCallId]: { type: 'deny', reason: 'The email must mention the partial refund.' },
  };
  console.log('Tuesday 09:10: reviewer edits the refund to $120 and denies the email');
  const secondLog: string[] = [];
  const finished = await resumeAgent(createModel(), { tools: createTools(secondLog), maxSteps: 6 }, JSON.parse(saved), decisions);
  show('Tuesday 09:10', finished);
  secondLog.forEach((entry) => console.log(`  side effect: ${entry}`));
  finished.state.messages
    .filter((message) => message.role === 'tool')
    .forEach((message) => console.log(`  tool result: ${message.content}`));
  if (finished.status === 'done') {
    console.log(`  answer: ${finished.answer}`);
  }
}

main().catch((error) => console.error(`demo failed: ${error.message}`));
