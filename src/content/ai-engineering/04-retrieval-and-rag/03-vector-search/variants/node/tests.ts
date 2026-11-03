const { embed, cosineSimilarity } = require('@dojo/ai');
const { PASSAGES } = modules['corpus.ts'];

type Result = { id: string; text: string; metadata: Record<string, unknown>; score: number };

function loadedIndex(extra: Record<string, unknown> = {}) {
  const index = mod.createVectorIndex(extra);
  index.add(PASSAGES);
  return index;
}

function spyEmbedder() {
  return fn((texts: string[]) => embed(texts));
}

test('similarity computes cosine similarity: 1 for the same direction, 0 for orthogonal, -1 for opposite, 0 for a zero vector', () => {
  expect(mod.similarity([1, 0], [0, 1])).toBeCloseTo(0, 9);
  expect(mod.similarity([2, 2], [1, 1])).toBeCloseTo(1, 9);
  expect(mod.similarity([1, 2, 3], [-1, -2, -3])).toBeCloseTo(-1, 9);
  expect(mod.similarity([0, 0, 0], [1, 2, 3])).toBe(0);
  const [refund, timing, chat] = embed([PASSAGES[1].text, PASSAGES[2].text, PASSAGES[9].text]);
  expect(mod.similarity(refund, timing)).toBeCloseTo(cosineSimilarity(refund, timing), 9);
  expect(mod.similarity(refund, chat)).toBeCloseTo(cosineSimilarity(refund, chat), 9);
  expect(() => mod.similarity([1, 2], [1, 2, 3])).toThrow();
});

test('search returns the topK passages ranked by cosine similarity to the query, each with its score and metadata', () => {
  const query = 'How long do refunds take to reach my card?';
  const results: Result[] = loadedIndex().search(query, { topK: 4 });
  expect(results).toHaveLength(4);
  expect(results[0].id).toBe('billing-refund-timing');
  const queryVector = embed(query);
  results.forEach((result, position) => {
    const passage = PASSAGES.find((candidate: { id: string }) => candidate.id === result.id);
    expect(result.text).toBe(passage.text);
    expect(result.metadata).toEqual(passage.metadata);
    expect(result.score).toBeCloseTo(cosineSimilarity(queryVector, embed(passage.text)), 9);
    if (position > 0) {
      expect(result.score).toBeLessThanOrEqual(results[position - 1].score);
    }
  });
  expect(loadedIndex().search(query)).toHaveLength(3);
});

test('embeds documents once, in one batch, when they are added, and only the query at search time', () => {
  const embedder = spyEmbedder();
  const index = mod.createVectorIndex({ embedder });
  index.add(PASSAGES);
  expect(embedder.mock.calls).toHaveLength(1);
  expect(embedder.mock.calls[0][0]).toEqual(PASSAGES.map((passage: { text: string }) => passage.text));
  index.search('refund', { topK: 2 });
  index.search('single sign-on', { topK: 2 });
  expect(embedder.mock.calls).toHaveLength(3);
  expect(embedder.mock.calls[1][0]).toEqual(['refund']);
  expect(embedder.mock.calls[2][0]).toEqual(['single sign-on']);
});

test('filters by metadata before ranking, so topK is filled with matching passages even when others score higher', () => {
  const index = loadedIndex();
  const security: Result[] = index.search('How long do refunds take to reach my card?', { topK: 3, filter: { product: 'security' } });
  expect(security).toHaveLength(3);
  security.forEach((result) => expect(result.metadata.product).toBe('security'));
  const scaleSecurity: Result[] = index.search('login', { topK: 10, filter: { product: 'security', plan: 'scale' } });
  expect(scaleSecurity.map((result) => result.id).sort()).toEqual(['security-audit-log', 'security-sso']);
  const anyOf: Result[] = index.search('plan', { topK: 10, filter: { plan: ['growth', 'scale'] } });
  expect(anyOf).toHaveLength(6);
  expect(index.search('plan', { topK: 10, filter: { region: 'eu' } })).toEqual([]);
  expect(mod.matchesFilter({ product: 'inbox', plan: 'all' }, {})).toBe(true);
  expect(mod.matchesFilter({ product: 'inbox' }, { product: ['billing', 'inbox'] })).toBe(true);
  expect(mod.matchesFilter({ product: 'inbox' }, { product: 'inbox', plan: 'all' })).toBe(false);
});

test('minScore drops weak neighbors, so a query with nothing relevant can return no passages at all', () => {
  const index = loadedIndex();
  expect(index.search('zebra quantum banana', { topK: 3 })).toHaveLength(3);
  expect(index.search('zebra quantum banana', { topK: 3, minScore: 0.35 })).toEqual([]);
  const refunds: Result[] = index.search('refund', { topK: 5, minScore: 0.35 });
  expect(refunds.map((result) => result.id)).toEqual(['billing-refund-timing', 'billing-refund-window']);
});

test('adding an existing id replaces its text and vector, and remove deletes a passage from every later search', () => {
  const index = loadedIndex();
  expect(index.count()).toBe(PASSAGES.length);
  index.add([{ id: 'billing-refund-timing', text: 'Refunds are paid as account credit only, never to the card.', metadata: { product: 'billing', plan: 'all', updated: '2026-10-01' } }]);
  expect(index.count()).toBe(PASSAGES.length);
  const [updated]: Result[] = index.search('refunds paid as account credit', { topK: 1 });
  expect(updated.id).toBe('billing-refund-timing');
  expect(updated.text).toMatch(/account credit only/);
  expect(updated.metadata.updated).toBe('2026-10-01');
  expect(index.remove('billing-refund-timing')).toBe(true);
  expect(index.remove('billing-refund-timing')).toBe(false);
  expect(index.count()).toBe(PASSAGES.length - 1);
  const results: Result[] = index.search('refund', { topK: 20 });
  expect(results.some((result) => result.id === 'billing-refund-timing')).toBe(false);
});

test('rejects vectors from an embedder with a different dimension and keeps the index unchanged', () => {
  let dimensions = 64;
  const index = mod.createVectorIndex({ embedder: (texts: string[]) => embed(texts, { dimensions }) });
  index.add(PASSAGES.slice(0, 4));
  dimensions = 128;
  expect(() => index.add(PASSAGES.slice(4))).toThrow(/dimension/i);
  expect(index.count()).toBe(4);
  dimensions = 64;
  index.add(PASSAGES.slice(4));
  expect(index.count()).toBe(PASSAGES.length);
});
