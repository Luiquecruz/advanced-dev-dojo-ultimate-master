const { createModel } = require('@dojo/ai');

const QUESTION = 'When will my annual plan refund reach my card?';
const PASSAGES = [
  { id: 'billing-seats', source: 'handbook/billing.md', text: 'Brightdesk bills per agent seat.', score: 0.31 },
  { id: 'automations-rules', source: 'handbook/automations.md', text: 'Automations close tickets with no reply after 7 days.', score: 0.12 },
  { id: 'billing-refund-timing', source: 'handbook/billing.md', text: 'Refunds reach the original card within 5 to 10 business days.', score: 0.62 },
  { id: 'billing-refund-window', source: 'handbook/refunds.md', text: 'Annual plans can be refunded in full within 30 days of purchase.', score: 0.48 },
];

const requestText = (index: number) => fakeModel.requests[index].messages.map((message: { content: string }) => message.content).join('\n');

test('buildContext keeps passages at or above minScore, best first, at most maxPassages, numbered from 1 with their source', () => {
  const { sources, context } = mod.buildContext(PASSAGES, { minScore: 0.3, maxPassages: 2 });
  expect(sources).toEqual([
    { number: 1, id: 'billing-refund-timing', source: 'handbook/billing.md', text: PASSAGES[2].text },
    { number: 2, id: 'billing-refund-window', source: 'handbook/refunds.md', text: PASSAGES[3].text },
  ]);
  expect(context).toBe(`[1] (handbook/billing.md) ${PASSAGES[2].text}\n\n[2] (handbook/refunds.md) ${PASSAGES[3].text}`);
  expect(mod.buildContext(PASSAGES).sources.map((source: { id: string }) => source.id)).toEqual(['billing-refund-timing', 'billing-refund-window', 'billing-seats']);
  expect(mod.buildContext(PASSAGES, { minScore: 0.9 })).toEqual({ sources: [], context: '' });
});

test('extractCitations returns the unique [n] markers in order of first appearance', () => {
  expect(mod.extractCitations('Refunds take 5 to 10 days [2]. Annual plans qualify [1] within 30 days [2].')).toEqual([2, 1]);
  expect(mod.extractCitations('See [1][3] and [12].')).toEqual([1, 3, 12]);
  expect(mod.extractCitations('No sources here, [a] or (1).')).toEqual([]);
});

test('refuses without calling the model when no passage reaches the evidence threshold', async () => {
  const result = await mod.answerWithCitations(createModel(), QUESTION, PASSAGES, { minScore: 0.7 });
  expect(result).toEqual({ status: 'no_evidence', answer: null, citations: [], attempts: 0 });
  expect(fakeModel.requests).toHaveLength(0);
  expect((await mod.answerWithCitations(createModel(), QUESTION, [])).status).toBe('no_evidence');
});

test('answers with citations mapped to the provided sources, whatever valid citation style the model uses', async () => {
  await forEachSeed(10, async () => {
    fakeModel.reply(
      respond.text([
        'Annual plans are refundable within 30 days [2], and the money reaches your card within 5 to 10 business days [1].',
        'Your refund should reach the card within 5 to 10 business days [1][2].',
        'Within 5 to 10 business days [1]. Annual plans qualify during the first 30 days [2] [1].',
      ]),
    );
    const result = await mod.answerWithCitations(createModel(), QUESTION, PASSAGES);
    expect(result.status).toBe('answered');
    expect(result.attempts).toBe(1);
    expect(result.answer).toBe(fakeModel.responses[0].text);
    expect(result.citations.length).toBeGreaterThan(0);
    result.citations.forEach((citation: { number: number; id: string; source: string }) => {
      const expected = [
        { number: 1, id: 'billing-refund-timing', source: 'handbook/billing.md' },
        { number: 2, id: 'billing-refund-window', source: 'handbook/refunds.md' },
      ][citation.number - 1];
      expect(citation).toEqual(expected);
    });
  });
});

test('puts numbered sources and the question in the prompt, tells the model to cite, and leaves out passages below the threshold', async () => {
  fakeModel.reply(respond.text('Within 5 to 10 business days [1].'));
  await mod.answerWithCitations(createModel(), QUESTION, PASSAGES, { minScore: 0.4 });
  const request = fakeModel.requests[0];
  expect(request.messages[0].role).toBe('system');
  expect(request.messages[0].content).toMatch(/cite|citation|\[1\]/i);
  const prompt = requestText(0);
  expect(prompt).toContain(QUESTION);
  expect(prompt).toContain(`[1] (handbook/billing.md) ${PASSAGES[2].text}`);
  expect(prompt).toContain(`[2] (handbook/refunds.md) ${PASSAGES[3].text}`);
  expect(prompt).not.toContain(PASSAGES[0].text);
  expect(prompt).not.toContain(PASSAGES[1].text);
});

test('asks again once when the answer cites a source that was not provided, naming the valid numbers', async () => {
  fakeModel.reply(respond.text('Refunds take 5 to 10 business days [1], as the billing policy says [4].'), respond.text('Refunds take 5 to 10 business days [1].'));
  const result = await mod.answerWithCitations(createModel(), QUESTION, PASSAGES);
  expect(result.status).toBe('answered');
  expect(result.attempts).toBe(2);
  expect(result.citations).toEqual([{ number: 1, id: 'billing-refund-timing', source: 'handbook/billing.md' }]);
  expect(fakeModel.requests).toHaveLength(2);
  const retry = fakeModel.requests[1].messages;
  expect(retry.length).toBeGreaterThan(fakeModel.requests[0].messages.length);
  expect(retry.some((message: { role: string; content: string }) => message.role === 'assistant' && message.content.includes('[4]'))).toBe(true);
  const feedback = retry[retry.length - 1];
  expect(feedback.role).toBe('user');
  expect(feedback.content).toMatch(/\[1\]/);
  expect(feedback.content).toMatch(/\[3\]/);
});

test('withholds the answer as ungrounded after two attempts without valid citations, counting refusals and truncated replies as failures', async () => {
  const failures = [
    [respond.text('Refunds usually take about a week.'), respond.text('It takes 5 to 10 business days [7].')],
    [respond.refusal(), respond.truncated('Refunds reach the original card within 5 to 10 business days [1].', 0.4)],
    [respond.truncated('Refunds reach the card [1] within 5 to 10 business days, as the policy says.', 0.5), respond.contentFilter()],
  ];
  for (const replies of failures) {
    fakeModel.reset().reply(...replies, respond.text('Too late [1].'));
    const result = await mod.answerWithCitations(createModel(), QUESTION, PASSAGES);
    expect(result).toEqual({ status: 'ungrounded', answer: null, citations: [], attempts: 2 });
    expect(fakeModel.requests).toHaveLength(2);
  }
  fakeModel.reset().reply(respond.error(500));
  const error = await captureError(mod.answerWithCitations(createModel(), QUESTION, PASSAGES));
  expect(error.status).toBe(500);
});
