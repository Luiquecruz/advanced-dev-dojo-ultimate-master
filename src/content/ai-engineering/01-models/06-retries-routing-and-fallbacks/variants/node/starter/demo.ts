import { createModel } from '@dojo/ai';
import { fakeModel, respond } from '@dojo/ai/testing';
import { answer } from './main';

const CATEGORIES = ['billing', 'shipping', 'account', 'bug'];
const TICKETS = [
  'My invoice shows the wrong VAT number.',
  'The parcel tracking has not moved for a week.',
  'I cannot reset my password.',
  'The export button crashes the app.',
];

function isKnownCategory(text: string): boolean {
  try {
    return CATEGORIES.includes(JSON.parse(text).category);
  } catch {
    return false;
  }
}

async function main() {
  fakeModel.forModel('cheap').reply(
    respond.json({ category: 'billing' }),
    respond.malformedJson({ category: 'shipping' }),
    respond.error(429, { retryAfterMs: 120 }),
    respond.json({ category: 'account' }),
    respond.json({ category: 'crash' }),
  );
  fakeModel.forModel('strong').reply(respond.json({ category: 'shipping' }), respond.error(503), respond.error(503), respond.error(503));
  fakeModel.forModel('backup').reply(respond.json({ category: 'bug' }));

  const options = {
    retries: 2,
    baseMs: 50,
    maxMs: 400,
    models: { cheap: createModel({ model: 'cheap' }), strong: createModel({ model: 'strong' }), backup: createModel({ model: 'backup' }) },
    validate: isKnownCategory,
  };
  for (const ticket of TICKETS) {
    const callsBefore = fakeModel.requests.length;
    const routed = await answer({ messages: [{ role: 'user', content: `Classify: ${ticket}` }] }, options);
    const path = fakeModel.requests.slice(callsBefore).map((request) => request.model).join(' -> ');
    console.log(`${JSON.parse(routed.text).category.padEnd(8)} by ${routed.model.padEnd(6)} escalated=${routed.escalated}  calls: ${path}`);
  }
}

main().catch((error) => console.error(`demo failed: ${error.message}`));
