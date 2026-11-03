const GOLDEN = [
  { query: 'refund timing', relevance: { timing: 3, window: 1 } },
  { query: 'error E-4012', relevance: { forwarding: 3 } },
  { query: 'single sign-on', relevance: { sso: 3, audit: 1, ignored: 0 } },
];

const RANKINGS: Record<string, string[]> = {
  'refund timing': ['window', 'seats', 'timing'],
  'error E-4012': ['chat', 'sso', 'seats'],
  'single sign-on': ['sso', 'audit', 'chat'],
};

test('recallAtK is the share of relevant ids found in the top k, counting repeated ids once', () => {
  expect(mod.recallAtK(['a', 'b', 'c', 'd'], ['b', 'd', 'z'], 2)).toBeCloseTo(1 / 3, 9);
  expect(mod.recallAtK(['a', 'b', 'c', 'd'], ['b', 'd', 'z'], 4)).toBeCloseTo(2 / 3, 9);
  expect(mod.recallAtK(['a', 'a', 'a', 'b'], ['b'], 2)).toBe(1);
  expect(mod.recallAtK(['a'], ['a', 'b'], 10)).toBe(0.5);
  expect(mod.recallAtK([], ['a'], 5)).toBe(0);
  expect(() => mod.recallAtK(['a'], [], 5)).toThrow();
});

test('reciprocalRank is 1 / the position of the first relevant id, or 0 when none is retrieved', () => {
  expect(mod.reciprocalRank(['x', 'y', 'a', 'b'], ['a', 'b'])).toBeCloseTo(1 / 3, 9);
  expect(mod.reciprocalRank(['a', 'y'], ['a'])).toBe(1);
  expect(mod.reciprocalRank(['x', 'x', 'a'], ['a'])).toBe(0.5);
  expect(mod.reciprocalRank(['x', 'y'], ['a'])).toBe(0);
});

test('ndcgAtK uses graded gains 2^grade - 1 discounted by log2(position + 1) and divides by the ideal ordering', () => {
  const relevance = { a: 3, b: 1, c: 2 };
  const dcg = 1 / Math.log2(2) + 7 / Math.log2(3);
  const ideal = 7 / Math.log2(2) + 3 / Math.log2(3) + 1 / Math.log2(4);
  expect(mod.ndcgAtK(['b', 'a', 'x', 'c'], relevance, 3)).toBeCloseTo(dcg / ideal, 9);
  expect(mod.ndcgAtK(['a', 'c', 'b'], relevance, 3)).toBeCloseTo(1, 9);
  expect(mod.ndcgAtK(['a', 'c'], { a: 3, c: 2, b: 1 }, 2)).toBeCloseTo(1, 9);
  expect(mod.ndcgAtK(['a', 'b', 'c'], relevance, 3)).toBeLessThan(1);
  expect(mod.ndcgAtK(['a', 'b', 'c'], relevance, 3)).toBeGreaterThan(mod.ndcgAtK(['b', 'c', 'a'], relevance, 3));
  expect(mod.ndcgAtK(['x', 'y', 'a'], relevance, 2)).toBe(0);
  expect(mod.ndcgAtK(['a', 'a', 'c'], relevance, 2)).toBeCloseTo(1, 9);
  expect(mod.ndcgAtK(['a'], { a: 0 }, 3)).toBe(0);
});

test('metrics stay between 0 and 1 and recall never drops when k grows, for every ordering of a ranking', () => {
  const relevance = { a: 3, c: 1, e: 2 };
  const ids = ['a', 'b', 'c', 'd', 'e'];
  const orderings = ids.map((_, shift) => [...ids.slice(shift), ...ids.slice(0, shift)]).flatMap((ordering) => [ordering, [...ordering].reverse()]);
  for (const ordering of orderings) {
    let previous = 0;
    for (let k = 1; k <= ids.length; k++) {
      const recall = mod.recallAtK(ordering, ['a', 'c', 'e'], k);
      const ndcg = mod.ndcgAtK(ordering, relevance, k);
      expect(recall).toBeGreaterThanOrEqual(previous);
      expect(ndcg).toBeGreaterThanOrEqual(0);
      expect(ndcg).toBeLessThanOrEqual(1 + 1e-9);
      previous = recall;
    }
    expect(previous).toBe(1);
  }
});

test('evaluateRetriever asks for k ids per golden query, scores each one and averages recall@k, MRR and nDCG@k', async () => {
  const retrieve = fn(async (query: string) => RANKINGS[query]);
  const report = await mod.evaluateRetriever(retrieve, GOLDEN, { k: 3 });
  expect(retrieve.mock.calls).toEqual(GOLDEN.map((item) => [item.query, 3]));
  expect(report.k).toBe(3);
  expect(report.perQuery.map((result: { query: string }) => result.query)).toEqual(GOLDEN.map((item) => item.query));
  const [refund, error, signOn] = report.perQuery;
  expect(refund.retrieved).toEqual(RANKINGS['refund timing']);
  expect(refund.recall).toBe(1);
  expect(refund.reciprocalRank).toBe(1);
  expect(error.recall).toBe(0);
  expect(error.reciprocalRank).toBe(0);
  expect(error.ndcg).toBe(0);
  expect(signOn.recall).toBe(1);
  expect(signOn.ndcg).toBeCloseTo(1, 9);
  expect(refund.ndcg).toBeCloseTo((1 + 7 / Math.log2(4)) / (7 + 1 / Math.log2(3)), 9);
  expect(report.recallAtK).toBeCloseTo(2 / 3, 9);
  expect(report.mrr).toBeCloseTo(2 / 3, 9);
  expect(report.ndcgAtK).toBeCloseTo((refund.ndcg + 0 + 1) / 3, 9);
  const synchronous = await mod.evaluateRetriever((query: string) => RANKINGS[query], GOLDEN, { k: 1 });
  expect(synchronous.recallAtK).toBeCloseTo((1 / 2 + 0 + 1 / 2) / 3, 9);
  expect((await mod.evaluateRetriever((query: string) => RANKINGS[query], GOLDEN)).k).toBe(5);
});

test('compareRetrievers evaluates every retriever on the same golden set and sorts them by nDCG@k, best first', async () => {
  const perfect = (query: string) => ({ 'refund timing': ['timing', 'window'], 'error E-4012': ['forwarding'], 'single sign-on': ['sso', 'audit'] })[query] as string[];
  const empty = () => [];
  const rows = await mod.compareRetrievers({ empty, mixed: (query: string) => RANKINGS[query], perfect }, GOLDEN, { k: 3 });
  expect(rows.map((row: { name: string }) => row.name)).toEqual(['perfect', 'mixed', 'empty']);
  expect(rows[0]).toEqual({ name: 'perfect', k: 3, recallAtK: 1, mrr: 1, ndcgAtK: 1 });
  expect(rows[2]).toEqual({ name: 'empty', k: 3, recallAtK: 0, mrr: 0, ndcgAtK: 0 });
  expect(rows[1].recallAtK).toBeCloseTo(2 / 3, 9);
});
