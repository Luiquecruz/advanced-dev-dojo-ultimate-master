const { createModel, countTokens } = require('@dojo/ai');

const SYSTEM = 'You are the Parcelly help assistant. Answer only from the documents and say "I do not know" when they do not cover the question.';
const QUESTION = 'Can I get a refund for a damaged parcel?';
const REFUNDS = { id: 'refunds', score: 0.91, text: 'Refunds for damaged parcels are issued within five business days after the claim is approved. Claims need a photo of the damage. Refunds go back to the original payment method.' };
const CLAIMS = { id: 'claims', score: 0.84, text: 'To open a damage claim, go to Orders, choose the parcel and press Report a problem. Claims must be opened within 14 days of delivery.' };
const POLICY = {
  id: 'policy',
  score: 0.72,
  text: 'The general terms cover every parcel sent with Parcelly. '.repeat(4) + 'Liability for damage is limited to the declared value of the parcel. '.repeat(12),
};
const SHIPPING = { id: 'shipping', score: 0.4, text: 'Standard shipping takes two to four business days within the EU.' };
const CAREERS = { id: 'careers', score: 0.05, text: 'Parcelly is hiring couriers in Lisbon and Porto.' };
const DOCUMENTS = [CLAIMS, CAREERS, POLICY, REFUNDS, SHIPPING];
const HISTORY = [
  { role: 'user', content: 'Hi, my parcel 2210 arrived today.' },
  { role: 'assistant', content: 'Thanks for letting us know. How can I help with parcel 2210?' },
  { role: 'user', content: 'The box was crushed and the vase inside is broken.' },
  { role: 'assistant', content: 'I am sorry to hear that. I can help you with a damage claim.' },
  { role: 'user', content: 'Do I need to keep the box?' },
  { role: 'assistant', content: 'Yes, please keep the box and the packaging until the claim is closed.' },
];

const render = (documents: Array<{ id: string; text: string }>) => documents.map((document) => `<document id="${document.id}">\n${document.text}\n</document>`).join('\n');
const finalContent = (documents: Array<{ id: string; text: string }>) => (documents.length === 0 ? QUESTION : `${render(documents)}\n\n${QUESTION}`);
const tokensFor = (history: unknown[], documents: Array<{ id: string; text: string }>) =>
  countTokens([{ role: 'system', content: SYSTEM }, ...history, { role: 'user', content: finalContent(documents) }]);
const pick = (value: Record<string, unknown>, keys: string[]) => Object.fromEntries(keys.map((key) => [key, value[key]]));
const input = (extra: Record<string, unknown>) => ({ system: SYSTEM, history: HISTORY, question: QUESTION, documents: DOCUMENTS, minScore: 0.2, ...extra });

test('compressText keeps whole leading sentences within the limit, and cuts characters only when no sentence fits', () => {
  expect(mod.compressText(REFUNDS.text, 1000)).toBe(REFUNDS.text);
  const compressed = mod.compressText(REFUNDS.text, 32);
  expect(compressed).toBe('Refunds for damaged parcels are issued within five business days after the claim is approved. Claims need a photo of the damage.');
  expect(countTokens(compressed)).toBeLessThanOrEqual(32);
  const cut = mod.compressText(REFUNDS.text, 5);
  expect(cut).toBe(REFUNDS.text.slice(0, 20));
  expect(countTokens(cut)).toBeLessThanOrEqual(5);
});

test('with room for everything: drops irrelevant documents, orders the rest most relevant last, keeps history and puts the question last', () => {
  const context = mod.buildContext(input({ budget: 2000 }));
  expect(context.includedDocumentIds).toEqual(['shipping', 'policy', 'claims', 'refunds']);
  expect(context.droppedDocumentIds).toEqual(['careers']);
  expect(context.messages.map((message: { role: string }) => message.role)).toEqual(['system', 'user', 'assistant', 'user', 'assistant', 'user', 'assistant', 'user']);
  expect(context.messages[0]).toEqual({ role: 'system', content: SYSTEM });
  expect(context.messages.slice(1, 7)).toEqual(HISTORY);
  expect(context.messages.at(-1)).toEqual({ role: 'user', content: finalContent([SHIPPING, POLICY, CLAIMS, REFUNDS]) });
  expect(context.tokens).toBe(countTokens(context.messages));
  expect(pick(context, ['keptTurns', 'droppedTurns', 'compressedDocumentIds'])).toEqual({ keptTurns: 3, droppedTurns: 0, compressedDocumentIds: [] });
});

test('under a tight budget drops the least relevant document that does not fit, but still takes a smaller one that does', () => {
  const budget = tokensFor(HISTORY, [SHIPPING, CLAIMS, REFUNDS]) + 4;
  const context = mod.buildContext(input({ budget }));
  expect(context.includedDocumentIds).toEqual(['shipping', 'claims', 'refunds']);
  expect([...context.droppedDocumentIds].sort()).toEqual(['careers', 'policy']);
  expect(context.tokens).toBeLessThanOrEqual(budget);
  expect(countTokens(context.messages)).toBe(context.tokens);
  expect(context.keptTurns).toBe(3);
});

test('drops the oldest turns first, keeps each user and assistant pair together and never leaves a gap in the recent history', () => {
  const documents = [REFUNDS, CLAIMS];
  const budget = tokensFor(HISTORY.slice(4), documents) + 3;
  const context = mod.buildContext(input({ documents, budget }));
  expect(context.messages.slice(1, -1)).toEqual(HISTORY.slice(4));
  expect(pick(context, ['keptTurns', 'droppedTurns', 'includedDocumentIds'])).toEqual({ keptTurns: 1, droppedTurns: 2, includedDocumentIds: ['claims', 'refunds'] });

  const longMiddle = [HISTORY[0], HISTORY[1], HISTORY[2], { role: 'assistant', content: 'Here is everything about claims. '.repeat(30) }, HISTORY[4], HISTORY[5]];
  const roomForOldAndNew = tokensFor([HISTORY[0], HISTORY[1], HISTORY[4], HISTORY[5]], documents) + 3;
  const gapless = mod.buildContext(input({ documents, history: longMiddle, budget: roomForOldAndNew }));
  expect(gapless.messages.slice(1, -1)).toEqual([HISTORY[4], HISTORY[5]]);
  expect(gapless.keptTurns).toBe(1);
});

test('compresses documents above maxDocumentTokens to a prefix of whole sentences and reports them', () => {
  const context = mod.buildContext(input({ budget: 2000, maxDocumentTokens: 40 }));
  expect(context.compressedDocumentIds.sort()).toEqual(['policy', 'refunds']);
  const final = context.messages.at(-1).content;
  const policyText = final.split('<document id="policy">\n')[1].split('\n</document>')[0];
  expect(POLICY.text.startsWith(policyText)).toBe(true);
  expect(countTokens(policyText)).toBeLessThanOrEqual(40);
  expect(final).toContain(CLAIMS.text);
  expect(final.endsWith(QUESTION)).toBe(true);
});

test('fails with ContextBudgetError when the system prompt and the question alone exceed the budget', () => {
  const required = tokensFor([], []);
  const error = (() => {
    try {
      mod.buildContext(input({ budget: required - 1 }));
    } catch (caught) {
      return caught as { required: number; budget: number };
    }
  })();
  expect(error).toBeInstanceOf(mod.ContextBudgetError);
  expect(error?.required).toBe(required);
  expect(error?.budget).toBe(required - 1);
  const minimal = mod.buildContext(input({ budget: required }));
  expect(minimal.messages).toEqual([{ role: 'system', content: SYSTEM }, { role: 'user', content: QUESTION }]);
  expect(pick(minimal, ['includedDocumentIds', 'keptTurns', 'droppedTurns'])).toEqual({ includedDocumentIds: [], keptTurns: 0, droppedTurns: 3 });
});

test('answerWithContext fits the request into the model context window minus the output reserve', async () => {
  for (const contextWindow of [260, 400, 32000]) {
    fakeModel.reset().configure({ contextWindow });
    fakeModel.reply(respond.text(['Yes, within five business days.', 'Yes. Open a claim within 14 days and keep the box.']));
    const result = await mod.answerWithContext(createModel(), input({}), 60);
    const [request] = fakeModel.requests;
    expect(request.maxTokens).toBe(60);
    expect(countTokens(request.messages)).toBeLessThanOrEqual(contextWindow - 60);
    expect(request.messages.at(-1).content.endsWith(QUESTION)).toBe(true);
    expect(result.text).toBe(fakeModel.responses[0].text);
    expect(result.context.messages).toEqual(request.messages);
  }
});
