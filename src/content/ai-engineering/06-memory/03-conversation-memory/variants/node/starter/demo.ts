import { countTokens, createModel } from '@dojo/ai';
import { fakeModel, respond } from '@dojo/ai/testing';
import type { Message } from '@dojo/ai';
import { createConversationMemory } from './main';

const TURNS: Message[] = [
  { role: 'user', content: 'Hi, I want to rent two e-bikes for Saturday morning.' },
  { role: 'assistant', content: 'Sure. Which station do you want to pick them up from?' },
  { role: 'user', content: 'The harbour station, around 9:00. We are two adults.' },
  { role: 'assistant', content: 'Booked: two e-bikes at the harbour station, Saturday 9:00, booking B-1042.' },
  { role: 'user', content: 'Do helmets come included or do we pay extra?' },
  { role: 'assistant', content: 'Helmets are included. Child seats cost 5 euros per day.' },
  { role: 'user', content: 'Great. Can I change the pickup to 10:30 instead?' },
  { role: 'assistant', content: 'Done: booking B-1042 now starts at 10:30.' },
  { role: 'user', content: 'If it rains, can I get a refund?' },
  { role: 'assistant', content: 'Yes, cancellations up to two hours before pickup are refunded in full.' },
  { role: 'user', content: 'So what time do we pick up the bikes, and where?' },
];

const SUMMARIES = [
  'The customer wants to rent two e-bikes for Saturday morning.',
  'Booking B-1042: two e-bikes at the harbour station, Saturday 9:00, for two adults.',
  'Booking B-1042: two e-bikes at the harbour station, Saturday 9:00, for two adults. Helmets are included; child seats cost 5 euros a day.',
  'Booking B-1042: two e-bikes at the harbour station, Saturday, pickup moved to 10:30. Helmets included; child seats 5 euros a day.',
  'Booking B-1042: two e-bikes, harbour station, Saturday 10:30. Helmets included. Full refund if cancelled up to two hours before pickup.',
];

async function main() {
  fakeModel.handle((_request, context) => {
    if (context.callIndex === 1) {
      return respond.refusal();
    }
    const successfulCalls = context.callIndex === 0 ? 0 : context.callIndex - 1;
    return respond.text(SUMMARIES[Math.min(successfulCalls, SUMMARIES.length - 1)]);
  });
  const memory = createConversationMemory({ model: createModel(), system: 'You are the support assistant of a bike rental shop. Answer briefly.', maxTokens: 110, keepRecent: 2, summaryMaxTokens: 80 });

  console.log('Budget: 110 tokens per call, the latest 2 messages always kept.\n');
  for (const [index, turn] of TURNS.entries()) {
    memory.add(turn);
    const requestsBefore = fakeModel.requests.length;
    const compacted = await memory.compact();
    const attempted = fakeModel.requests.length > requestsBefore;
    const event = compacted.summarized ? `folded ${compacted.folded} message${compacted.folded === 1 ? '' : 's'} into the summary` : attempted ? 'summary failed, history kept' : 'fits';
    const tokens = String(countTokens(memory.context())).padStart(3);
    const kept = String(memory.state().history.length).padStart(2);
    console.log(`turn ${String(index + 1).padStart(2)}  context ${tokens} tokens  history ${kept}  ${event}`);
  }

  console.log('\nRunning summary:', memory.state().summary);
  console.log('Messages sent with the last question:');
  memory.context().forEach((message) => console.log(`  ${message.role.padEnd(9)} ${message.content}`));
}

main().catch((error) => console.error(`demo failed: ${error.message}`));
