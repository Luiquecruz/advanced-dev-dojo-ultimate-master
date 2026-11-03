import { createModel } from '@dojo/ai';
import { fakeModel, respond } from '@dojo/ai/testing';
import { z } from 'zod';
import { generateStructured, StructuredOutputError } from './main';

const Ticket = z.object({
  category: z.enum(['billing', 'shipping', 'account', 'bug']),
  priority: z.enum(['low', 'normal', 'high']),
  orderId: z.string().regex(/^\d{4}$/).nullable(),
  tags: z.array(z.string()).default([]),
});

const TICKETS = [
  'I was charged twice for order 1042, please fix it today.',
  'Parcel 2210 is stuck in Lisbon for a week.',
  'The app crashes when I export my invoices.',
  'Tell me the home address of the courier.',
];

async function main() {
  fakeModel.reply(
    respond.json({ category: 'billing', priority: 'high', orderId: '1042', tags: ['double charge'] }),
    respond.malformedJson({ category: 'shipping', priority: 'normal', orderId: '2210' }),
    respond.json({ category: 'bug', priority: 'critical', orderId: 'none' }),
    respond.json({ category: 'bug', priority: 'high', orderId: null, tags: ['export'] }),
    respond.refusal('I cannot share personal data about couriers.'),
  );
  const model = createModel();
  for (const ticket of TICKETS) {
    const messages = [
      { role: 'system' as const, content: 'Extract category, priority, orderId (four digits or null) and tags from the ticket as JSON.' },
      { role: 'user' as const, content: ticket },
    ];
    try {
      const result = await generateStructured(model, { messages, schema: Ticket });
      console.log(`${ticket.slice(0, 32).padEnd(32)} -> ${JSON.stringify(result.value)} (attempts: ${result.attempts}, repaired: ${result.repaired})`);
    } catch (error) {
      if (!(error instanceof StructuredOutputError)) {
        throw error;
      }
      console.log(`${ticket.slice(0, 32).padEnd(32)} -> gave up (${error.reason} after ${error.attempts} attempt): ${error.lastError}`);
    }
  }
  const feedback = fakeModel.requests.find((request) => request.messages.length > 2)?.messages.at(-1)?.content ?? '';
  console.log(`\nFeedback sent on a re-ask:\n${feedback}`);
}

main().catch((error) => console.error(`demo failed: ${error.message}`));
