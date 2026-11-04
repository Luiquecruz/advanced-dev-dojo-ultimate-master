const { createModel } = require('@dojo/ai');

const NOW = Date.parse('2026-10-31T12:00:00Z');
const DAY = 24 * 60 * 60 * 1000;

const POLICY = {
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
    'fraud-review': { allowedFields: ['orderId', 'cpf'], requiresConsent: false, maxClassification: 'confidential', retentionDays: 90 },
  },
};

const RECORD = { name: 'Maria Souza', email: 'maria@example.com', orderId: 'A-1001', issue: 'Package arrived damaged', cpf: '123.456.789-09', plan: 'premium', referrer: 'newsletter-2026-09' };
const MARIA = { id: 'customer-4411', consents: ['customer-support'] };

test('classifyRecord labels every field and treats unlabeled fields as restricted', () => {
  expect(mod.classifyRecord({ orderId: 'A-1', plan: 'basic' }, POLICY)).toEqual({ fields: { orderId: 'internal', plan: 'internal' }, highest: 'internal', unlabeled: [] });
  const result = mod.classifyRecord({ name: 'Maria', referrer: 'x', orderId: 'A-1' }, POLICY);
  expect(result.fields).toEqual({ name: 'confidential', referrer: 'restricted', orderId: 'internal' });
  expect(result.highest).toBe('restricted');
  expect(result.unlabeled).toEqual(['referrer']);
  expect(mod.classifyRecord({}, POLICY).highest).toBe('public');
});

test('checkModelCall denies unknown purposes and purposes that need a consent the subject did not give', () => {
  expect(mod.checkModelCall({ record: RECORD, subject: MARIA, purpose: 'training' }, POLICY)).toEqual({ allowed: false, reasons: ['unknown-purpose'] });
  expect(mod.checkModelCall({ record: RECORD, subject: MARIA, purpose: 'marketing' }, POLICY)).toEqual({ allowed: false, reasons: ['missing-consent'] });
  const consenting = { id: 'customer-7', consents: ['customer-support', 'marketing'] };
  expect(mod.checkModelCall({ record: RECORD, subject: consenting, purpose: 'marketing' }, POLICY)).toMatchObject({ allowed: true, payload: { name: 'Maria Souza', plan: 'premium' } });
});

test('checkModelCall minimizes the payload to the labeled fields the purpose allows', () => {
  const copy = { ...RECORD };
  const check = mod.checkModelCall({ record: copy, subject: MARIA, purpose: 'customer-support' }, POLICY);
  expect(check).toEqual({
    allowed: true,
    payload: { name: 'Maria Souza', orderId: 'A-1001', issue: 'Package arrived damaged', plan: 'premium' },
    droppedFields: ['email', 'cpf', 'referrer'],
  });
  expect(copy).toEqual(RECORD);
  const unlabeledAllowed = { ...POLICY, purposes: { ...POLICY.purposes, support: { ...POLICY.purposes['customer-support'], allowedFields: ['orderId', 'referrer'] } } };
  expect(mod.checkModelCall({ record: RECORD, subject: MARIA, purpose: 'support' }, unlabeledAllowed)).toEqual({ allowed: true, payload: { orderId: 'A-1001' }, droppedFields: ['name', 'email', 'issue', 'cpf', 'plan', 'referrer'] });
});

test('checkModelCall denies a purpose whose allowed fields exceed its classification ceiling, collecting every reason', () => {
  expect(mod.checkModelCall({ record: RECORD, subject: MARIA, purpose: 'fraud-review' }, POLICY)).toEqual({ allowed: false, reasons: ['above-purpose-classification'] });
  const strict = { ...POLICY, purposes: { ...POLICY.purposes, marketing: { ...POLICY.purposes.marketing, maxClassification: 'internal' } } };
  expect(mod.checkModelCall({ record: RECORD, subject: MARIA, purpose: 'marketing' }, strict)).toEqual({ allowed: false, reasons: ['missing-consent', 'above-purpose-classification'] });
  expect(mod.checkModelCall({ record: { orderId: 'A-1' }, subject: MARIA, purpose: 'fraud-review' }, POLICY)).toMatchObject({ allowed: true, payload: { orderId: 'A-1' } });
});

test('governedGenerate refuses before calling the model, and otherwise sends only the minimized payload and records the processing', async () => {
  const model = createModel();
  const store: unknown[] = [];
  const error = await captureError(mod.governedGenerate(model, { record: RECORD, subject: MARIA, purpose: 'marketing', instruction: 'Write an offer.' }, POLICY, { now: () => NOW, store }));
  expect(error).toBeInstanceOf(mod.DataPolicyError);
  expect(error.reasons).toEqual(['missing-consent']);
  expect(fakeModel.requests).toHaveLength(0);
  expect(store).toEqual([]);

  await forEachSeed(8, async () => {
    const records: Array<Record<string, unknown>> = [];
    fakeModel.reply(respond.text(['Sorry about the damaged package, Maria. A replacement is on the way.', 'We have opened a replacement for order A-1001.', 'Thanks for reporting it. Can you send a photo of the package?']));
    const result = await mod.governedGenerate(model, { record: RECORD, subject: MARIA, purpose: 'customer-support', instruction: 'Draft a reply to the customer.' }, POLICY, { now: () => NOW, store: records });
    const request = fakeModel.requests[0];
    expect(request.messages[0]).toEqual({ role: 'system', content: 'Draft a reply to the customer.' });
    expect(JSON.parse(request.messages[1].content)).toEqual({ name: 'Maria Souza', orderId: 'A-1001', issue: 'Package arrived damaged', plan: 'premium' });
    expect(JSON.stringify(request.messages)).not.toMatch(/maria@example|123\.456|newsletter/);
    expect(result.text).toBe(fakeModel.responses[0].text);
    expect(records).toEqual([
      { subjectId: 'customer-4411', purpose: 'customer-support', fields: ['name', 'orderId', 'issue', 'plan'], output: result.text, responseId: fakeModel.responses[0].id, processedAt: new Date(NOW).toISOString(), expiresAt: new Date(NOW + 30 * DAY).toISOString() },
    ]);
    expect(result.record).toEqual(records[0]);
  });
});

test('a failed model call propagates and stores no processing record', async () => {
  fakeModel.reply(respond.error(503));
  const store: unknown[] = [];
  const error = await captureError(mod.governedGenerate(createModel(), { record: RECORD, subject: MARIA, purpose: 'customer-support', instruction: 'Reply.' }, POLICY, { now: () => NOW, store }));
  expect(error.status).toBe(503);
  expect(store).toEqual([]);
});

test('applyRetention purges records whose retention ended, and eraseSubject removes every record of one person', () => {
  const record = (subjectId: string, expiresInDays: number) => ({ subjectId, purpose: 'customer-support', fields: ['name'], output: 'x', responseId: 'r', processedAt: new Date(NOW - DAY).toISOString(), expiresAt: new Date(NOW + expiresInDays * DAY).toISOString() });
  const store = [record('a', -1), record('b', 0), record('a', 1), record('c', 30)];
  const { kept, purged } = mod.applyRetention(store, NOW);
  expect(purged).toEqual([store[0], store[1]]);
  expect(kept).toEqual([store[2], store[3]]);
  expect(mod.applyRetention(store, NOW + 31 * DAY).kept).toEqual([]);
  expect(mod.eraseSubject(store, 'a')).toEqual({ kept: [store[1], store[3]], erased: 2 });
  expect(mod.eraseSubject(store, 'nobody')).toEqual({ kept: store, erased: 0 });
});
