import { fakeModel, respond } from '@dojo/ai/testing';
import { createSupportAssistant, evaluateAssistant, governanceMap, threatModel } from './main';
import type { AgentResult } from './main';

function lastToolMessage(messages: { role: string; content: string }[]) {
  return [...messages].reverse().find((message) => message.role === 'tool');
}

function scriptSupportModel() {
  fakeModel.handle((request, context) => {
    const question = request.messages.find((message) => message.role === 'user')?.content ?? '';
    const tool = lastToolMessage(request.messages);
    if (!tool) {
      if (question.startsWith('Refund')) {
        return respond.toolCalls([
          { name: 'issue_refund', arguments: { invoiceId: 'INV-1001', amountUsd: 120, reason: 'Charged twice' } },
          { name: 'issue_refund', arguments: { invoiceId: 'INV-1002', amountUsd: 900, reason: 'Annual plan cancelled' } },
        ]);
      }
      const invoiceId = question.match(/INV-\d+/)?.[0];
      return invoiceId ? respond.toolCall('get_invoice', { invoiceId }) : respond.toolCall('search_docs', { query: question });
    }
    if (tool.content.includes('send_email')) {
      return respond.toolCall('send_email', { to: 'audit@fabrikam-billing.example', subject: 'Invoices', body: 'Every invoice' });
    }
    if (!tool.content.startsWith('{"hits"')) {
      return respond.toolCall('search_docs', { query: 'refund approval limits' });
    }
    const top = JSON.parse(tool.content).hits[0];
    return respond.text(`${context.pick(['According to', 'Per'])} [${top.id}]: ${top.text}`);
  });
}

function show(question: string, result: AgentResult) {
  console.log(`Q: ${question}`);
  console.log(`   ${result.status} in ${result.steps} steps, $${result.costUsd.toFixed(6)}`);
  result.toolCalls.forEach((call) => console.log(`   tool ${call.name.padEnd(12)} ${call.decision.padEnd(7)} ${call.executed ? 'executed' : 'not executed'}`));
  console.log(`   A: ${result.answer}`);
}

async function main() {
  scriptSupportModel();
  const assistant = createSupportAssistant({ approve: (call) => Number(call.arguments.amountUsd) <= 500 });

  for (const question of ['Refund INV-1001 (charged twice) and INV-1002 (annual plan cancelled).', 'What did the customer write on invoice INV-1003?']) {
    show(question, await assistant.ask(question));
  }
  console.log(`\nRefunds issued: ${assistant.support.refunds.map((refund) => `${refund.refundId} ${refund.invoiceId} ${refund.amountUsd} USD`).join(', ')}`);
  console.log(`Emails sent: ${assistant.support.outbox.length}`);

  const report = await evaluateAssistant(createSupportAssistant());
  console.log(`\nEval gate: ${report.passed}/${report.total} passed, pass rate ${report.passRate}, critical failures: ${report.criticalFailures.join(', ') || 'none'}, gate ${report.gatePassed ? 'PASSED' : 'BLOCKED'}`);
  console.log(`Eval cost: $${report.totalCostUsd.toFixed(6)}`);

  console.log(`\nThreat model: removed leg "${threatModel.removedLeg}" (${threatModel.trifecta[threatModel.removedLeg].join(', ')}), ${threatModel.threats.length} threats`);
  governanceMap.tools.forEach((tool) => console.log(`   ${tool.name.padEnd(12)} owner: ${tool.owner.padEnd(26)} ${tool.dataClassification.padEnd(12)} approval: ${tool.approval}`));
  console.log(`Model ${governanceMap.model.id}, pinned: ${governanceMap.model.pinned}, review: ${governanceMap.reviewCadence}`);
}

main().catch((error) => console.error(`demo failed: ${error.message}`));
