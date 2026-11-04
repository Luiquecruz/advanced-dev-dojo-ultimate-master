import { createModel } from '@dojo/ai';
import { fakeModel, respond } from '@dojo/ai/testing';
import { applyRetention, checkModelCall, classifyRecord, DataPolicyError, eraseSubject, governedGenerate, type DataPolicy, type ProcessingRecord } from './main';

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.parse('2026-10-31T12:00:00Z');

const policy: DataPolicy = {
  fields: {
    name: { classification: 'confidential', personal: true },
    email: { classification: 'confidential', personal: true },
    orderId: { classification: 'internal', personal: false },
    issue: { classification: 'internal', personal: false },
    plan: { classification: 'internal', personal: false },
    cpf: { classification: 'restricted', personal: true },
  },
  purposes: {
    'customer-support': { allowedFields: ['name', 'orderId', 'issue', 'plan'], requiresConsent: false, maxClassification: 'confidential', retentionDays: 30 },
    marketing: { allowedFields: ['name', 'plan'], requiresConsent: true, maxClassification: 'confidential', retentionDays: 7 },
  },
};

const ticket = { name: 'Maria Souza', email: 'maria@example.com', orderId: 'A-1001', issue: 'Package arrived damaged', cpf: '123.456.789-09', plan: 'premium', referrer: 'newsletter-2026-09' };
const maria = { id: 'customer-4411', consents: ['customer-support'] };
const joao = { id: 'customer-5120', consents: ['customer-support', 'marketing'] };

async function main() {
  const model = createModel();
  const store: ProcessingRecord[] = [];
  let clock = NOW;
  const now = () => clock;

  const labels = classifyRecord(ticket, policy);
  console.log(`classification: highest ${labels.highest}, unlabeled ${labels.unlabeled.join(', ')}`);
  const check = checkModelCall({ record: ticket, subject: maria, purpose: 'customer-support' }, policy);
  if (check.allowed) {
    console.log(`support call keeps ${Object.keys(check.payload).join(', ')}; drops ${check.droppedFields.join(', ')}`);
  }

  fakeModel.reply(respond.text('Sorry about the damaged package, Maria. A replacement for order A-1001 ships tomorrow.'));
  const support = await governedGenerate(model, { record: ticket, subject: maria, purpose: 'customer-support', instruction: 'Draft a short reply to the customer.' }, policy, { now, store });
  console.log(`support reply: ${support.text}`);
  console.log(`  the model saw: ${fakeModel.requests[0].messages[1].content}`);

  try {
    await governedGenerate(model, { record: ticket, subject: maria, purpose: 'marketing', instruction: 'Write an upgrade offer.' }, policy, { now, store });
  } catch (error) {
    if (error instanceof DataPolicyError) {
      console.log(`marketing for Maria refused before any model call: ${error.reasons.join(', ')}`);
    }
  }

  clock = NOW + 2 * DAY;
  fakeModel.reply(respond.text('João, premium members get early access to the new plan this week.'));
  const offer = await governedGenerate(model, { record: { ...ticket, name: 'João Lima' }, subject: joao, purpose: 'marketing', instruction: 'Write an upgrade offer.' }, policy, { now, store });
  console.log(`marketing for João (consented): ${offer.text}`);

  console.log('\nprocessing records:');
  store.forEach((record) => console.log(`  ${record.subjectId} ${record.purpose.padEnd(16)} fields ${record.fields.join(',').padEnd(26)} expires ${record.expiresAt.slice(0, 10)}`));

  const tenDaysLater = applyRetention(store, NOW + 10 * DAY);
  console.log(`\nretention job after 10 days: kept ${tenDaysLater.kept.length}, purged ${tenDaysLater.purged.map((record) => `${record.subjectId}/${record.purpose}`).join(', ')}`);
  const erased = eraseSubject(tenDaysLater.kept, 'customer-4411');
  console.log(`Maria asks for erasure: removed ${erased.erased} record(s), ${erased.kept.length} left`);
}

main().catch((error) => console.error(`demo failed: ${error.message}`));
