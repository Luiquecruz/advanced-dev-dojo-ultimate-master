const { z } = require('zod');
const { createModel, embed, cosineSimilarity } = require('@dojo/ai');

const TicketSchema = z.object({
  category: z.enum(['billing', 'shipping', 'account']),
  priority: z.number().int().min(1).max(3),
});

const CLASSIFICATION_SET = [
  { id: 'vat', input: 'My invoice shows the wrong VAT number.', expected: 'billing' },
  { id: 'parcel', input: 'The parcel tracking has not moved for a week.', expected: 'shipping' },
  { id: 'password', input: 'I cannot reset my password.', expected: 'account' },
  { id: 'refund', input: 'I was charged twice for one order.', expected: 'billing' },
];

const classify = (evalCase: { input: string }) => ({
  messages: [
    { role: 'system', content: 'Answer with one category: billing, shipping or account.' },
    { role: 'user', content: evalCase.input },
  ],
});

test('exactScorer ignores case, surrounding whitespace and punctuation, but never accepts different words', async () => {
  const scorer = mod.exactScorer();
  expect(scorer.name).toBe('exact');
  const evalCase = { id: 'vat', input: 'My invoice shows the wrong VAT number.', expected: 'Billing' };
  for (const output of ['billing', '  Billing.\n', '"BILLING"', 'billing!']) {
    expect(await scorer.score(output, evalCase)).toMatchObject({ pass: true, score: 1 });
  }
  expect(await scorer.score('credit   card', { id: 'card', input: '', expected: 'Credit card' })).toMatchObject({ pass: true });
  for (const output of ['billing issue', 'shipping', 'bill ing', '']) {
    const result = await scorer.score(output, evalCase);
    expect(result).toMatchObject({ pass: false, score: 0 });
    expect(result.detail.trim().length).toBeGreaterThan(0);
  }
});

test('schemaScorer passes JSON that matches the schema and fails, with a reason, every malformed shape and schema violation', async () => {
  const scorer = mod.schemaScorer(TicketSchema);
  expect(scorer.name).toBe('schema');
  const evalCase = { id: 'vat', input: 'My invoice shows the wrong VAT number.' };
  expect(await scorer.score('{"category":"billing","priority":2}', evalCase)).toMatchObject({ pass: true, score: 1 });
  expect(await scorer.score('\n {"category":"shipping","priority":1} ', evalCase)).toMatchObject({ pass: true, score: 1 });
  const wrongCategory = await scorer.score('{"category":"refunds","priority":2}', evalCase);
  expect(wrongCategory).toMatchObject({ pass: false, score: 0 });
  expect(wrongCategory.detail).toMatch(/category/);
  for (const output of ['{"category":"billing"}', '{"category":"billing","priority":7}', '[]', 'billing']) {
    const result = await scorer.score(output, evalCase);
    expect(result).toMatchObject({ pass: false, score: 0 });
    expect(result.detail.trim().length).toBeGreaterThan(0);
  }
  await forEachSeed(12, async () => {
    fakeModel.reply(respond.malformedJson({ category: 'billing', priority: 2 }));
    const { text } = await createModel().generate({ messages: [{ role: 'user', content: 'Classify as JSON' }] });
    const result = await scorer.score(text, evalCase);
    expect(result).toMatchObject({ pass: false, score: 0 });
    expect(result.detail.trim().length).toBeGreaterThan(0);
  });
});

test('semanticScorer scores by embedding similarity and passes at or above the threshold', async () => {
  const scorer = mod.semanticScorer({ threshold: 0.6 });
  expect(scorer.name).toBe('semantic');
  const expected = 'Refunds reach the original card within 5 business days.';
  const evalCase = { id: 'refund-timing', input: 'When do I get my money back?', expected };
  const outputs = {
    paraphrase: 'Your refund reaches the card you paid with in 5 business days.',
    reordered: 'Refunds take 5 business days to reach your original card.',
    unrelated: 'Our office is closed on public holidays.',
    contradiction: 'We do not offer refunds.',
  };
  for (const output of Object.values(outputs)) {
    const result = await scorer.score(output, evalCase);
    const similarity = cosineSimilarity(embed(output), embed(expected));
    expect(result.score).toBeCloseTo(similarity, 6);
    expect(result.pass).toBe(similarity >= 0.6);
  }
  expect((await scorer.score(outputs.paraphrase, evalCase)).pass).toBe(true);
  expect((await scorer.score(outputs.unrelated, evalCase)).pass).toBe(false);
  expect((await mod.semanticScorer({ threshold: 0.9 }).score(outputs.paraphrase, evalCase)).pass).toBe(false);
});

test('runEval sends each case through the prompt in dataset order and reports every case and the pass rate', async () => {
  fakeModel.reply(respond.text('Billing.'), respond.text('account'), respond.text(['account', 'Account']), respond.text('billing'));
  const report = await mod.runEval({ model: createModel(), dataset: CLASSIFICATION_SET, prompt: classify, scorers: [mod.exactScorer()] });
  expect(fakeModel.requests.map((request: { messages: Array<{ content: string }> }) => request.messages.at(-1)!.content)).toEqual(CLASSIFICATION_SET.map((evalCase) => evalCase.input));
  expect(report.cases.map((result: { id: string; pass: boolean }) => [result.id, result.pass])).toEqual([
    ['vat', true],
    ['parcel', false],
    ['password', true],
    ['refund', true],
  ]);
  expect(report.cases[1]).toMatchObject({ output: 'account', error: null });
  expect(report.cases[1].scores.exact.pass).toBe(false);
  expect(report.summary).toMatchObject({ total: 4, passed: 3, failed: 1, errored: 0 });
  expect(report.summary.passRate).toBeCloseTo(0.75, 6);
  expect(report.summary.byScorer.exact).toMatchObject({ passed: 3, total: 4 });
  expect(report.summary.byScorer.exact.meanScore).toBeCloseTo(0.75, 6);
});

test('runEval counts model errors as failed cases, keeps their message and goes on with the next case', async () => {
  fakeModel.reply(respond.error(429), respond.text('shipping'), respond.contextLength(), respond.error(500, { message: 'upstream exploded' }));
  const report = await mod.runEval({ model: createModel(), dataset: CLASSIFICATION_SET, prompt: classify, scorers: [mod.exactScorer()] });
  expect(fakeModel.requests).toHaveLength(4);
  const [rateLimited, parcel, tooLong, broken] = report.cases;
  for (const failed of [rateLimited, tooLong, broken]) {
    expect(failed).toMatchObject({ output: null, pass: false, scores: {} });
    expect(typeof failed.error).toBe('string');
    expect(failed.error.length).toBeGreaterThan(0);
  }
  expect(broken.error).toContain('upstream exploded');
  expect(parcel).toMatchObject({ id: 'parcel', output: 'shipping', error: null, pass: true });
  expect(report.summary).toMatchObject({ total: 4, passed: 1, failed: 3, errored: 3 });
  expect(report.summary.byScorer.exact).toMatchObject({ passed: 1, total: 4 });
  expect(report.summary.byScorer.exact.meanScore).toBeCloseTo(0.25, 6);
});

test('a scorer that throws fails its own score with the reason and never stops the run or the other scorers', async () => {
  const brokenJudge = { name: 'judge', score: () => Promise.reject(new Error('judge unavailable')) };
  const dataset = [
    { id: 'with-reference', input: 'When do I get my money back?', expected: 'Refunds reach the original card within 5 business days.' },
    { id: 'without-reference', input: 'Do you ship to Iceland?' },
  ];
  fakeModel.reply(respond.text('Refunds reach your original card within 5 business days.'), respond.text('Yes, we ship to Iceland.'));
  const report = await mod.runEval({ model: createModel(), dataset, prompt: classify, scorers: [mod.semanticScorer({ threshold: 0.6 }), brokenJudge] });
  expect(report.cases).toHaveLength(2);
  report.cases.forEach((result: { scores: Record<string, { pass: boolean; score: number; detail: string }>; pass: boolean; error: unknown }) => {
    expect(result.error).toBe(null);
    expect(result.scores.judge).toMatchObject({ pass: false, score: 0 });
    expect(result.scores.judge.detail).toContain('judge unavailable');
    expect(result.pass).toBe(false);
  });
  expect(report.cases[0].scores.semantic.pass).toBe(true);
  expect(report.cases[1].scores.semantic).toMatchObject({ pass: false, score: 0 });
  expect(report.cases[1].scores.semantic.detail.trim().length).toBeGreaterThan(0);
  expect(report.summary.byScorer.semantic).toMatchObject({ passed: 1, total: 2 });
  expect(report.summary.byScorer.judge).toMatchObject({ passed: 0, total: 2, meanScore: 0 });
});

test('the summary stays consistent with the case results across every mix of valid, malformed, wrong and failed replies', async () => {
  const dataset = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map((id) => ({ id, input: `Ticket ${id}` }));
  await forEachSeed(10, async () => {
    fakeModel.handle(() =>
      respond.oneOf([respond.json({ category: 'billing', priority: 2 }), respond.malformedJson({ category: 'billing', priority: 2 }), respond.json({ category: 'refunds', priority: 1 }), respond.error(503)]),
    );
    const report = await mod.runEval({ model: createModel(), dataset, prompt: classify, scorers: [mod.schemaScorer(TicketSchema)] });
    const cases = report.cases as Array<{ output: string | null; error: string | null; pass: boolean; scores: Record<string, { pass: boolean; score: number }> }>;
    expect(cases).toHaveLength(dataset.length);
    expect(cases.filter((result) => result.output !== null).map((result) => result.output)).toEqual(fakeModel.responses.map((response: { text: string }) => response.text));
    const passing = cases.filter((result) => result.pass).length;
    const errored = cases.filter((result) => result.error !== null).length;
    expect(report.summary).toMatchObject({ total: dataset.length, passed: passing, failed: dataset.length - passing, errored });
    expect(report.summary.passRate).toBeCloseTo(passing / dataset.length, 6);
    expect(report.summary.byScorer.schema.passed).toBe(passing);
    const meanScore = cases.reduce((sum, result) => sum + (result.scores.schema?.score ?? 0), 0) / dataset.length;
    expect(report.summary.byScorer.schema.meanScore).toBeCloseTo(meanScore, 6);
    cases.forEach((result) => {
      if (result.error !== null) expect(result.scores).toEqual({});
      else expect(result.pass).toBe(result.output === '{"category":"billing","priority":2}');
    });
  });
});
