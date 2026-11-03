import { createModel } from '@dojo/ai';
import { fakeModel, respond } from '@dojo/ai/testing';
import { z } from 'zod';
import { examplesVerifier, runVerified, schemaVerifier, type VerifiedResult } from './main';

function report(label: string, result: VerifiedResult) {
  console.log(`${label}: ${result.status} after ${result.attempts} attempt(s)`);
  for (const failure of result.failures) {
    console.log(`  attempt ${failure.attempt} failed ${failure.verifier}: ${failure.feedback.replace(/\n/g, ' | ')}`);
  }
  console.log(`  final output: ${result.output}`);
}

async function main() {
  const model = createModel();

  fakeModel.reply(respond.text('ORD-(\\d{4}'), respond.text('ORD-\\d+-\\d+'), respond.text('ORD-\\d{4}-\\d{6}'));
  const orderIds = examplesVerifier({
    shouldMatch: ['ORD-2026-000123', 'ORD-1999-999999'],
    shouldReject: ['ord-2026-000123', 'ORD-2026-123', 'ORD-2026-000123x'],
  });
  report('order id pattern', await runVerified(model, { prompt: 'Write a pattern for order ids such as ORD-2026-000123.' }, { verifiers: [orderIds], maxAttempts: 4 }));

  const listing = z.object({ title: z.string().max(60), price: z.number().positive(), tags: z.array(z.string()).min(1) });
  fakeModel.reply(
    respond.malformedJson({ title: 'Walnut desk lamp', price: 39.9, tags: ['home'] }),
    respond.json({ title: 'Walnut desk lamp with a dimmable warm LED and a braided fabric cable', price: -39.9, tags: [] }),
    respond.json({ title: 'Walnut desk lamp, dimmable', price: 39.9, tags: ['home', 'lighting'] }),
  );
  report('product listing', await runVerified(model, { system: 'Answer with JSON only.', prompt: 'Write a listing for our walnut desk lamp.' }, { verifiers: [schemaVerifier(listing)], maxAttempts: 3 }));

  fakeModel.handle(() => respond.text('ORD-.*'));
  report('stubborn model', await runVerified(model, { prompt: 'Write a pattern for order ids.' }, { verifiers: [orderIds], maxAttempts: 2 }));
}

main().catch((error) => console.error(`demo failed: ${error.message}`));
