const { createModel, embed } = require('@dojo/ai');
const { DOCUMENTS, PEOPLE } = modules['documents.ts'];

type Result = { id: string; text: string; score: number };

function loadedIndex(extra: Record<string, unknown> = {}) {
  const index = mod.createSecureIndex(extra);
  DOCUMENTS.forEach((document: unknown) => index.upsert(document));
  return index;
}

const ids = (results: Result[]) => results.map((result) => result.id);
const byId = (id: string) => DOCUMENTS.find((document: { id: string }) => document.id === id);

test('canRead requires the same tenant and a shared group or an explicit user grant, and denies by default', () => {
  expect(mod.canRead(PEOPLE.maria, byId('acme-salary-bands'))).toBe(true);
  expect(mod.canRead(PEOPLE.sam, byId('acme-salary-bands'))).toBe(false);
  expect(mod.canRead(PEOPLE.lee, byId('acme-salary-bands'))).toBe(false);
  expect(mod.canRead(PEOPLE.lee, byId('globex-salary-bands'))).toBe(true);
  expect(mod.canRead(PEOPLE.dana, byId('acme-performance-review-dana'))).toBe(true);
  expect(mod.canRead(PEOPLE.sam, byId('acme-performance-review-dana'))).toBe(false);
  expect(mod.canRead({ userId: 'dana', tenantId: 'globex', groups: ['hr'] }, byId('acme-performance-review-dana'))).toBe(false);
  expect(mod.canRead(PEOPLE.maria, { id: 'draft', tenantId: 'acme', text: 'Draft', allowedGroups: [] })).toBe(false);
});

test('never returns another tenant’s documents, even when they match the query best and share group names', () => {
  const index = loadedIndex();
  const results: Result[] = index.search(PEOPLE.lee, 'Acme salary bands for engineers in euros', { topK: 10 });
  expect(results.length).toBeGreaterThan(0);
  results.forEach((result) => expect(result.id.startsWith('globex-')).toBe(true));
  const acmeHr: Result[] = index.search(PEOPLE.maria, 'Globex salary bands in dollars', { topK: 10 });
  acmeHr.forEach((result) => expect(result.id.startsWith('acme-')).toBe(true));
  expect(ids(acmeHr)).toContain('acme-salary-bands');
});

test('filters by permission before ranking, so topK fills with readable documents however high forbidden ones score', () => {
  const index = loadedIndex();
  for (let copy = 0; copy < 5; copy++) {
    index.upsert({ id: `acme-salary-copy-${copy}`, tenantId: 'acme', text: 'Acme salary bands for engineers and support agents.', allowedGroups: ['hr'] });
  }
  const results: Result[] = index.search(PEOPLE.dana, 'salary bands for engineers', { topK: 2 });
  expect(results).toHaveLength(2);
  results.forEach((result) => expect(mod.canRead(PEOPLE.dana, byId(result.id))).toBe(true));
  expect(ids(index.search(PEOPLE.maria, 'salary bands for engineers', { topK: 2 })).every((id) => id.includes('salary'))).toBe(true);
  expect(index.search({ userId: 'guest', tenantId: 'acme', groups: [] }, 'leave', { topK: 3 })).toEqual([]);
});

test('a permission change takes effect on the next search without re-embedding unchanged text', () => {
  const embedder = fn((texts: string[]) => embed(texts));
  const index = loadedIndex({ embedder });
  const embeddedDocuments = embedder.mock.calls.length;
  expect(ids(index.search(PEOPLE.dana, 'October outage certificate', { topK: 1 }))).toEqual(['acme-incident-review']);
  index.upsert({ ...byId('acme-incident-review'), allowedGroups: ['security'] });
  expect(embedder.mock.calls.length).toBe(embeddedDocuments + 1);
  expect(ids(index.search(PEOPLE.dana, 'October outage certificate', { topK: 5 }))).not.toContain('acme-incident-review');
  expect(index.count()).toBe(DOCUMENTS.length);
  index.upsert({ ...byId('acme-handbook-leave'), text: 'Acme employees get 30 days of paid leave a year from 2027.' });
  const calls = embedder.mock.calls.map((call: string[][]) => call[0]);
  expect(calls).toContainEqual(['Acme employees get 30 days of paid leave a year from 2027.']);
  const [leave]: Result[] = index.search(PEOPLE.sam, 'paid leave days', { topK: 1 });
  expect(leave.text).toMatch(/30 days/);
});

test('deleted documents disappear from every later search', () => {
  const index = loadedIndex();
  expect(ids(index.search(PEOPLE.maria, 'performance review Dana raise', { topK: 1 }))).toEqual(['acme-performance-review-dana']);
  expect(index.remove('acme-performance-review-dana')).toBe(true);
  expect(index.remove('acme-performance-review-dana')).toBe(false);
  expect(index.count()).toBe(DOCUMENTS.length - 1);
  expect(ids(index.search(PEOPLE.maria, 'performance review Dana raise', { topK: 10 }))).not.toContain('acme-performance-review-dana');
});

test('moving a document to another tenant hides it from the old tenant immediately', () => {
  const index = loadedIndex();
  index.upsert({ ...byId('acme-incident-review'), tenantId: 'globex' });
  expect(ids(index.search(PEOPLE.dana, 'October outage certificate', { topK: 10 }))).not.toContain('acme-incident-review');
  expect(ids(index.search({ userId: 'kim', tenantId: 'globex', groups: ['engineering'] }, 'October outage certificate', { topK: 1 }))).toEqual(['acme-incident-review']);
});

test('answerQuestion sends only passages the user may read and skips the model when nothing readable matches', async () => {
  const index = loadedIndex();
  fakeModel.handle(() => respond.text(['Employees get 25 days of paid leave [1].', 'You have 25 days of leave a year [1].']));
  const answered = await mod.answerQuestion(createModel(), index, PEOPLE.sam, 'How many days of paid leave and what are the salary bands?');
  expect(answered.answer).toMatch(/\[1\]/);
  expect(answered.sourceIds).toContain('acme-handbook-leave');
  answered.sourceIds.forEach((id: string) => expect(mod.canRead(PEOPLE.sam, byId(id))).toBe(true));
  const prompt = fakeModel.requests[0].messages.map((message: { content: string }) => message.content).join('\n');
  expect(prompt).toContain(byId('acme-handbook-leave').text);
  for (const forbidden of ['acme-salary-bands', 'acme-performance-review-dana', 'globex-salary-bands', 'globex-handbook-leave']) {
    expect(prompt).not.toContain(byId(forbidden).text);
  }
  const outsider = await mod.answerQuestion(createModel(), index, { userId: 'guest', tenantId: 'initech', groups: ['all-staff'] }, 'How many days of paid leave?');
  expect(outsider).toEqual({ answer: null, sourceIds: [] });
  expect(fakeModel.requests).toHaveLength(1);
});
