import { createModel } from '@dojo/ai';
import type { GenerateRequest } from '@dojo/ai';
import { fakeModel, respond } from '@dojo/ai/testing';
import { GateError, evaluatorOptimizer, parallelSections, promptChain, route, vote } from './main';

const ROUTES = {
  billing: { description: 'invoices, refunds and payments', system: 'You are the billing specialist.' },
  technical: { description: 'bugs, crashes and errors', system: 'You are the technical support engineer.' },
  general: { description: 'anything else', system: 'You are a friendly general assistant.' },
};

const lastUserContent = (request: GenerateRequest) => [...request.messages].reverse().find((message) => message.role === 'user')?.content ?? '';

async function demoRouting() {
  const tickets = ['I was charged twice for my invoice', 'The app crashes on export', 'Do you have a dark mode?'];
  fakeModel.reset().reply(
    respond.json({ route: 'billing' }),
    respond.text('Billing here: the duplicate charge will be refunded.'),
    respond.malformedJson({ route: 'technical' }),
    respond.text('Happy to help with anything!'),
    respond.json({ route: 'sales' }),
    respond.text('Dark mode is in Settings > Appearance.'),
  );
  console.log('Routing');
  for (const ticket of tickets) {
    const result = await route(createModel(), ticket, ROUTES, 'general');
    console.log(`  ${ticket.padEnd(36)} -> ${result.route.padEnd(9)} ${result.text}`);
  }
}

async function demoChain() {
  fakeModel.reset().reply(respond.text('1. Problem 2. Fix 3. Next steps'), respond.text('Incident report: export crash fixed in 2.0.1.'), respond.refusal());
  const steps = [
    { name: 'outline', prompt: (previous: string) => `Outline an incident report for: ${previous}`, gate: (output: string) => output.includes('1.') },
    { name: 'write', prompt: (previous: string) => `Write the report from this outline: ${previous}` },
  ];
  const result = await promptChain(createModel(), 'export crash on 2.0.0', steps);
  console.log(`\nPrompt chain: ${result.outputs.length} steps -> ${result.output}`);
  try {
    await promptChain(createModel(), 'another incident', steps);
  } catch (error) {
    if (error instanceof GateError) {
      console.log(`  second run stopped at gate "${error.step}" (reply: ${error.output})`);
    }
  }
}

async function demoSections() {
  fakeModel.reset().configure({ latencyMs: 20 });
  fakeModel.handle((request) => respond.text(`[${request.messages[0].content}] done`));
  const startedAt = Date.now();
  const result = await parallelSections(createModel(), 'CONTRACT TEXT', [
    { name: 'summary', instruction: 'Summarize the contract.' },
    { name: 'risks', instruction: 'List risky clauses.' },
    { name: 'deadlines', instruction: 'List every deadline.' },
  ]);
  console.log(`\nSectioning: three 20 ms calls finished in ${Date.now() - startedAt} ms (one after another they would take 60 ms or more)`);
  Object.entries(result).forEach(([name, text]) => console.log(`  ${name.padEnd(10)} ${text}`));
}

async function demoVoting() {
  fakeModel.reset().reply(respond.json({ label: 'Spam' }), respond.json({ label: 'spam ' }), respond.malformedJson({ label: 'ham' }), respond.json({ label: 'ham' }), respond.error(503));
  const result = await vote(createModel(), 'Is this spam? WIN A FREE PHONE', 5);
  console.log(`\nVoting: verdict=${result.verdict} votes=${JSON.stringify(result.votes)} abstentions=${result.abstentions}`);
}

async function demoEvaluator() {
  let drafts = 0;
  fakeModel.reset().handle((request) => {
    if (request.responseFormat?.type === 'json') {
      return lastUserContent(request).includes('v3') ? respond.json({ pass: true, feedback: 'Clear and complete.' }) : respond.json({ pass: false, feedback: 'Mention the breaking change.' });
    }
    drafts += 1;
    return respond.text(`Release note v${drafts}`);
  });
  const result = await evaluatorOptimizer(createModel(), 'Write the release note for 2.0', 4);
  console.log(`\nEvaluator-optimizer: accepted=${result.accepted} after ${result.rounds} rounds -> "${result.text}"`);
  result.feedback.forEach((feedback, index) => console.log(`  feedback ${index + 1}: ${feedback}`));
  console.log(`  model calls: ${fakeModel.requests.length}`);
}

async function main() {
  await demoRouting();
  await demoChain();
  await demoSections();
  await demoVoting();
  await demoEvaluator();
}

main().catch((error) => console.error(`demo failed: ${error.message}`));
