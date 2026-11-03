const { PASSAGES } = modules['corpus.ts'];

const TINY = [
  { id: 'a', text: 'refund policy annual plans refund' },
  { id: 'b', text: 'annual plans billing invoices' },
  { id: 'c', text: 'sso login scale plans' },
  { id: 'd', text: 'error e 4012 forwarding verify' },
];

function idfFormula(total: number, containing: number): number {
  return Math.log(1 + (total - containing + 0.5) / (containing + 0.5));
}

function termScore(idf: number, frequency: number, length: number, averageLength: number, k1 = 1.2, b = 0.75): number {
  return (idf * frequency * (k1 + 1)) / (frequency + k1 * (1 - b + (b * length) / averageLength));
}

test('idf gives rare terms more weight than common ones, using ln(1 + (N - n + 0.5) / (n + 0.5))', () => {
  const index = mod.createBm25Index(TINY);
  expect(index.idf('refund')).toBeCloseTo(idfFormula(4, 1), 9);
  expect(index.idf('plans')).toBeCloseTo(idfFormula(4, 3), 9);
  expect(index.idf('refund')).toBeGreaterThan(index.idf('annual'));
  expect(index.idf('annual')).toBeGreaterThan(index.idf('plans'));
  expect(index.idf('plans')).toBeGreaterThan(0);
  expect(index.idf('zebra')).toBeCloseTo(idfFormula(4, 0), 9);
});

test('score sums idf times saturated, length-normalized term frequency over the unique query terms', () => {
  const index = mod.createBm25Index(TINY);
  const averageLength = 18 / 4;
  const expected = termScore(idfFormula(4, 1), 2, 5, averageLength) + termScore(idfFormula(4, 3), 1, 5, averageLength);
  expect(index.score('refund plans', 'a')).toBeCloseTo(expected, 9);
  expect(index.score('refund refund plans', 'a')).toBeCloseTo(expected, 9);
  expect(index.score('plans', 'b')).toBeCloseTo(termScore(idfFormula(4, 3), 1, 4, averageLength), 9);
  expect(index.score('zebra', 'a')).toBe(0);
  const custom = mod.createBm25Index(TINY, { k1: 2, b: 0.5 });
  expect(custom.score('plans', 'c')).toBeCloseTo(termScore(idfFormula(4, 3), 1, 4, averageLength, 2, 0.5), 9);
});

test('term frequency saturates: five mentions score less than five times one mention, and a larger k1 saturates later', () => {
  const documents = [
    { id: 'once', text: 'refund' },
    { id: 'five', text: 'refund refund refund refund refund' },
    { id: 'other', text: 'invoice' },
  ];
  const ratio = (k1: number) => {
    const index = mod.createBm25Index(documents, { k1, b: 0 });
    return index.score('refund', 'five') / index.score('refund', 'once');
  };
  expect(ratio(1.2)).toBeGreaterThan(1);
  expect(ratio(1.2)).toBeLessThan(5);
  expect(ratio(2)).toBeGreaterThan(ratio(0.5));
});

test('b controls length normalization: 0 ignores length, larger values favor the shorter of two equal matches', () => {
  const documents = [
    { id: 'short', text: 'refund policy' },
    { id: 'long', text: 'refund policy details annual plans card invoices' },
  ];
  const gap = (b: number) => {
    const index = mod.createBm25Index(documents, { b });
    return index.score('refund', 'short') - index.score('refund', 'long');
  };
  expect(gap(0)).toBeCloseTo(0, 9);
  expect(gap(0.75)).toBeGreaterThan(0);
  expect(gap(1)).toBeGreaterThan(gap(0.75));
});

test('search returns only documents that share a term with the query, sorted by score, and finds exact codes', () => {
  const index = mod.createBm25Index(PASSAGES);
  const [first, ...others] = index.search('error E-4012');
  expect(first.id).toBe('inbox-forwarding');
  others.forEach((result: { score: number }) => expect(result.score).toBeLessThan(first.score));
  const results = index.search('refund card', 20);
  expect(results.length).toBeGreaterThan(0);
  results.forEach((result: { id: string; score: number }, position: number) => {
    const passage = PASSAGES.find((candidate: { id: string }) => candidate.id === result.id);
    expect(passage.text).toMatch(/refund|card/i);
    expect(result.score).toBeCloseTo(index.score('refund card', result.id), 9);
    if (position > 0) {
      expect(result.score).toBeLessThanOrEqual(results[position - 1].score);
    }
  });
  expect(index.search('refund card', 1)).toHaveLength(1);
  expect(index.search('zebra quantum')).toEqual([]);
});

test('reciprocalRankFusion sums 1 / (k + rank), rewards agreement between lists and ignores repeated ids', () => {
  const fused = mod.reciprocalRankFusion([
    ['a', 'b', 'c'],
    ['c', 'd', 'a'],
  ]);
  expect(fused.map((result: { id: string }) => result.id)).toEqual(['a', 'c', 'b', 'd']);
  expect(fused[0].score).toBeCloseTo(1 / 61 + 1 / 63, 9);
  expect(fused[2].score).toBeCloseTo(1 / 62, 9);
  const agreement = mod.reciprocalRankFusion([
    ['x', 'p', 'y'],
    ['q', 'r', 'y'],
  ]);
  expect(agreement[0].id).toBe('y');
  expect(agreement[0].score).toBeCloseTo(2 / 63, 9);
  const repeated = mod.reciprocalRankFusion([['a', 'a', 'b']], { k: 10 });
  expect(repeated).toHaveLength(2);
  expect(repeated[0].score).toBeCloseTo(1 / 11, 9);
  expect(repeated[1].score).toBeCloseTo(1 / 13, 9);
  expect(mod.reciprocalRankFusion([['a', 'b', 'c']], { topK: 2 })).toHaveLength(2);
});

test('hybridSearch asks every retriever for the candidate count, fuses their rankings and survives a failing retriever', async () => {
  const keywordRanking = ['inbox-forwarding', 'billing-seats', 'security-sso'];
  const vectorRanking = ['security-sso', 'inbox-forwarding', 'inbox-chat'];
  const keyword = fn(async () => keywordRanking);
  const vector = fn(() => vectorRanking);
  const fused = await mod.hybridSearch('error E-4012', [keyword, vector], { topK: 3 });
  expect(keyword.mock.calls).toEqual([['error E-4012', 20]]);
  expect(vector.mock.calls).toEqual([['error E-4012', 20]]);
  expect(fused).toEqual(mod.reciprocalRankFusion([keywordRanking, vectorRanking], { topK: 3 }));
  expect(fused.map((result: { id: string }) => result.id)).toEqual(['inbox-forwarding', 'security-sso', 'billing-seats']);
  const broken = fn(async () => {
    throw new Error('index offline');
  });
  const degraded = await mod.hybridSearch('sso', [broken, vector], { candidates: 5, topK: 2 });
  expect(broken.mock.calls).toEqual([['sso', 5]]);
  expect(degraded.map((result: { id: string }) => result.id)).toEqual(['security-sso', 'inbox-forwarding']);
  expect(await captureError(mod.hybridSearch('sso', [broken, broken]))).toBeInstanceOf(Error);
});
