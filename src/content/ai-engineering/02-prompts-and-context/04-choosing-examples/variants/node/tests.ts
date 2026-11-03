const { createModel, embed, cosineSimilarity, countTokens } = require('@dojo/ai');

const POOL = [
  { id: 'refund-late', input: 'My refund has not arrived after two weeks.', output: 'billing' },
  { id: 'refund-card', input: 'Where is the refund for my card payment?', output: 'billing' },
  { id: 'refund-late-copy', input: 'My refund has NOT arrived after two weeks!', output: 'billing' },
  { id: 'refund-still', input: 'My refund still has not arrived after two weeks.', output: 'billing' },
  {
    id: 'charged-twice',
    input:
      'I was charged twice for the same order and need a refund of the duplicate payment, my bank statement shows both charges on the same day and the support chat closed before I could explain everything about the refund.',
    output: 'billing',
  },
  { id: 'export-crash', input: 'The export button crashes the app.', output: 'bug' },
  { id: 'password-reset', input: 'I cannot reset my password.', output: 'account' },
  { id: 'invoice-vat', input: 'The invoice shows the wrong VAT number.', output: 'billing' },
  { id: 'parcel-stuck', input: 'The parcel tracking has not moved for a week.', output: 'shipping' },
];
const QUERY = 'When will my refund arrive?';
const LABELS = ['billing', 'shipping', 'account', 'bug'];

const ids = (selected: Array<{ id: string }>) => selected.map((example) => example.id);
const tokensOf = (selected: Array<{ input: string; output: string }>) => selected.reduce((total, example) => total + countTokens(example.input) + countTokens(example.output), 0);

test('picks the k most similar examples by embedding cosine similarity and returns them most similar last, with their scores', () => {
  const selected = mod.selectExamples(QUERY, POOL, { k: 3, maxTokens: 1000 });
  expect(ids(selected)).toEqual(['charged-twice', 'refund-late', 'refund-card']);
  selected.forEach((example: { input: string; output: string; score: number }) => {
    expect(example.score).toBeCloseTo(cosineSimilarity(embed(QUERY), embed(example.input)), 9);
    expect(POOL).toContainEqual({ id: (example as unknown as { id: string }).id, input: example.input, output: example.output });
  });
  const scores = selected.map((example: { score: number }) => example.score);
  expect([...scores].sort((left, right) => left - right)).toEqual(scores);
});

test('skips near-duplicates of an example already chosen, keeping the first one in pool order on equal scores', () => {
  const selected = mod.selectExamples(QUERY, POOL, { k: 3, maxTokens: 1000 });
  expect(ids(selected)).not.toContain('refund-late-copy');
  expect(ids(selected)).not.toContain('refund-still');
  const copyFirst = [POOL[2], ...POOL.filter((_, index) => index !== 2)];
  expect(ids(mod.selectExamples(QUERY, copyFirst, { k: 3, maxTokens: 1000 }))).toEqual(['charged-twice', 'refund-late-copy', 'refund-card']);
  const withoutDedupe = mod.selectExamples(QUERY, POOL, { k: 3, maxTokens: 1000, duplicateThreshold: 1.01 });
  expect(ids(withoutDedupe)).toEqual(['refund-late-copy', 'refund-late', 'refund-card']);
});

test('stays within the token budget, skipping a long example but still taking a shorter, less similar one', () => {
  const selected = mod.selectExamples(QUERY, POOL, { k: 3, maxTokens: 40 });
  expect(ids(selected)).toEqual(['export-crash', 'refund-late', 'refund-card']);
  expect(tokensOf(selected)).toBeLessThanOrEqual(40);
  expect(mod.selectExamples(QUERY, POOL, { k: 3, maxTokens: 5 })).toEqual([]);
});

test('drops examples below the minimum similarity, returning fewer than k or none', () => {
  expect(ids(mod.selectExamples(QUERY, POOL, { k: 3, maxTokens: 1000, minSimilarity: 0.3 }))).toEqual(['refund-late', 'refund-card']);
  expect(mod.selectExamples(QUERY, POOL, { k: 3, maxTokens: 1000, minSimilarity: 0.9 })).toEqual([]);
  expect(ids(mod.selectExamples('The app crashes when I export a report', POOL, { k: 1, maxTokens: 1000, minSimilarity: 0.3 }))).toEqual(['export-crash']);
});

test('builds the few-shot conversation: system, one user and assistant pair per example in order, then the query', () => {
  const examples = POOL.slice(0, 2);
  expect(mod.buildFewShotMessages('Classify tickets.', QUERY, examples)).toEqual([
    { role: 'system', content: 'Classify tickets.' },
    { role: 'user', content: POOL[0].input },
    { role: 'assistant', content: 'billing' },
    { role: 'user', content: POOL[1].input },
    { role: 'assistant', content: 'billing' },
    { role: 'user', content: QUERY },
  ]);
  expect(mod.buildFewShotMessages('Classify tickets.', QUERY, [])).toHaveLength(2);
});

test('classifyWithExamples sends the selected examples and normalizes any phrasing of the label, or returns null', async () => {
  const phrasings = ['billing', 'Billing.', '  BILLING\n', 'I think this is billing', 'refunds'];
  await forEachSeed(15, async () => {
    fakeModel.reply(respond.text(phrasings));
    const result = await mod.classifyWithExamples(createModel(), { system: 'Classify tickets.', query: QUERY, pool: POOL, labels: LABELS, k: 3, maxTokens: 40 });
    expect(result.exampleIds).toEqual(['export-crash', 'refund-late', 'refund-card']);
    const sent = fakeModel.requests[0].messages;
    expect(sent).toEqual(mod.buildFewShotMessages('Classify tickets.', QUERY, mod.selectExamples(QUERY, POOL, { k: 3, maxTokens: 40 })));
    const reply = fakeModel.responses[0].text;
    const expected = ['billing', 'Billing.', '  BILLING\n'].includes(reply) ? 'billing' : null;
    expect(result.label).toBe(expected);
  });
});
