const { createModel } = require('@dojo/ai');

const QUESTION = 'How long until my refund arrives?';
const CANDIDATES = [
  { id: 'billing-seats', text: 'Brightdesk bills per agent seat.' },
  { id: 'billing-refund-window', text: 'Annual plans can be refunded in full within 30 days of purchase.' },
  { id: 'billing-refund-timing', text: 'Refunds reach the original card within 5 to 10 business days.' },
  { id: 'security-sso', text: 'Single sign-on with SAML is available on the Scale plan.' },
];
const ORIGINAL_ORDER = CANDIDATES.map((candidate) => candidate.id);
const SCORES = {
  scores: [
    { id: 'billing-seats', score: 1 },
    { id: 'billing-refund-window', score: 6 },
    { id: 'billing-refund-timing', score: 9 },
    { id: 'security-sso', score: 0 },
  ],
};
const EXPECTED_ORDER = ['billing-refund-timing', 'billing-refund-window', 'billing-seats', 'security-sso'];

type Reranked = { id: string; text: string; score: number | null };

const ids = (results: Reranked[]) => results.map((result) => result.id);
const lastRequestText = () => fakeModel.requests[fakeModel.requests.length - 1].messages.map((message: { content: string }) => message.content).join('\n');

test('parseJsonLoosely reads valid JSON, JSON wrapped in prose and a fence, trailing commas and single quotes, and returns undefined when nothing is recoverable', () => {
  expect(mod.parseJsonLoosely('{"queries": ["a", "b"]}')).toEqual({ queries: ['a', 'b'] });
  expect(mod.parseJsonLoosely('Sure! Here it is:\n```json\n{"score": 7}\n```')).toEqual({ score: 7 });
  expect(mod.parseJsonLoosely('{"score": 7,}')).toEqual({ score: 7 });
  expect(mod.parseJsonLoosely("{'scores': [{'id': 'a', 'score': 3}]}")).toEqual({ scores: [{ id: 'a', score: 3 }] });
  expect(mod.parseJsonLoosely('The answer is {"score": 4} as requested.')).toEqual({ score: 4 });
  expect(mod.parseJsonLoosely('{"scores": [{"id": "a", "sco')).toBeUndefined();
  expect(mod.parseJsonLoosely('I cannot score these passages.')).toBeUndefined();
});

test('generateQueries asks for JSON and returns the original question first, then unique, non-empty rewrites, at most count + 1', async () => {
  fakeModel.reply(respond.json({ queries: ['refund processing time', 'how long until my refund arrives?', '', 42, 'Refund processing time', 'when is money returned to my card', 'refund delay annual plan'] }));
  const queries = await mod.generateQueries(createModel(), QUESTION, { count: 2 });
  expect(queries).toEqual([QUESTION, 'refund processing time', 'when is money returned to my card']);
  expect(fakeModel.requests).toHaveLength(1);
  expect(fakeModel.requests[0].responseFormat).toEqual({ type: 'json' });
  expect(lastRequestText()).toContain(QUESTION);
});

test('generateQueries never breaks retrieval: malformed JSON, refusals, errors and wrong shapes fall back to the original question', async () => {
  let recovered = 0;
  await forEachSeed(20, async () => {
    fakeModel.reply(respond.malformedJson({ queries: ['refund processing time', 'money back to card'] }));
    const queries = await mod.generateQueries(createModel(), QUESTION);
    expect(queries[0]).toBe(QUESTION);
    expect([1, 3]).toContain(queries.length);
    recovered += queries.length === 3 ? 1 : 0;
  });
  expect(recovered).toBeGreaterThan(0);
  for (const behavior of [respond.refusal(), respond.error(500), respond.json({ rewrites: ['x'] }), respond.json({ queries: 'refund' }), respond.contentFilter()]) {
    fakeModel.reset().reply(behavior);
    expect(await mod.generateQueries(createModel(), QUESTION)).toEqual([QUESTION]);
  }
});

test('hydeQuery appends a hypothetical answer passage to the question, and falls back to the question alone when there is none', async () => {
  fakeModel.reply(respond.text(['Refunds are sent to the original card and arrive within a week.', 'Most refunds reach your bank in 5 to 10 business days.']));
  const expanded = await mod.hydeQuery(createModel(), QUESTION);
  expect(expanded.startsWith(QUESTION)).toBe(true);
  expect(expanded.length).toBeGreaterThan(QUESTION.length + 20);
  expect(lastRequestText()).toContain(QUESTION);
  fakeModel.reset().reply(respond.truncated('Refunds are sent back to the card you paid with, usually within ten business days of approval.', 0.5));
  expect((await mod.hydeQuery(createModel(), QUESTION)).length).toBeGreaterThan(QUESTION.length);
  for (const behavior of [respond.refusal(), respond.contentFilter(), respond.error(503), respond.text('   ')]) {
    fakeModel.reset().reply(behavior);
    expect(await mod.hydeQuery(createModel(), QUESTION)).toBe(QUESTION);
  }
});

test('rerank sends the query and every candidate in one JSON request and orders candidates by the model scores', async () => {
  fakeModel.reply(respond.json(SCORES));
  const { results, reranked } = await mod.rerank(createModel(), QUESTION, CANDIDATES);
  expect(reranked).toBe(true);
  expect(ids(results)).toEqual(EXPECTED_ORDER);
  expect(results.map((result: Reranked) => result.score)).toEqual([9, 6, 1, 0]);
  expect(results[0].text).toBe(CANDIDATES[2].text);
  expect(fakeModel.requests).toHaveLength(1);
  expect(fakeModel.requests[0].responseFormat).toEqual({ type: 'json' });
  const prompt = lastRequestText();
  expect(prompt).toContain(QUESTION);
  ORIGINAL_ORDER.forEach((id) => expect(prompt).toContain(id));
  fakeModel.reset().reply(respond.json(SCORES));
  expect(ids((await mod.rerank(createModel(), QUESTION, CANDIDATES, { topK: 2 })).results)).toEqual(EXPECTED_ORDER.slice(0, 2));
});

test('rerank ignores unknown ids, duplicates and scores that are missing, non-numeric or outside 0 to 10, keeping unscored candidates after scored ones', async () => {
  fakeModel.reply(
    respond.json({
      scores: [
        { id: 'billing-refund-window', score: 4 },
        { id: 'made-up-id', score: 10 },
        { id: 'billing-refund-window', score: 10 },
        { id: 'billing-seats', score: 'high' },
        { id: 'security-sso', score: 42 },
        { id: 'billing-refund-timing' },
        null,
      ],
    }),
  );
  const { results, reranked } = await mod.rerank(createModel(), QUESTION, CANDIDATES);
  expect(reranked).toBe(true);
  expect(ids(results)).toEqual(['billing-refund-window', 'billing-seats', 'billing-refund-timing', 'security-sso']);
  expect(results.map((result: Reranked) => result.score)).toEqual([4, null, null, null]);
});

test('rerank survives every malformed reply, refusal and error by keeping the retrieval order, and skips the model for no candidates', async () => {
  let rerankedRuns = 0;
  await forEachSeed(20, async () => {
    fakeModel.reply(respond.malformedJson(SCORES));
    const { results, reranked } = await mod.rerank(createModel(), QUESTION, CANDIDATES);
    expect([...ids(results)].sort()).toEqual([...ORIGINAL_ORDER].sort());
    expect(ids(results)).toEqual(reranked ? EXPECTED_ORDER : ORIGINAL_ORDER);
    rerankedRuns += reranked ? 1 : 0;
  });
  expect(rerankedRuns).toBeGreaterThan(0);
  for (const behavior of [respond.refusal(), respond.error(429), respond.text('These all look relevant to me.'), respond.json({ ranking: EXPECTED_ORDER })]) {
    fakeModel.reset().reply(behavior);
    const { results, reranked } = await mod.rerank(createModel(), QUESTION, CANDIDATES);
    expect(reranked).toBe(false);
    expect(ids(results)).toEqual(ORIGINAL_ORDER);
    results.forEach((result: Reranked) => expect(result.score).toBeNull());
  }
  fakeModel.reset();
  expect(await mod.rerank(createModel(), QUESTION, [])).toEqual({ results: [], reranked: false });
  expect(fakeModel.requests).toHaveLength(0);
});
