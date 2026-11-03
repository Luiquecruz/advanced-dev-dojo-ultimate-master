const { createModel, countTokens } = require('@dojo/ai');

const SYSTEM = 'You are the support assistant of a bike rental shop. Answer briefly.';
const WORDS = ['booking', 'helmet', 'refund', 'station', 'battery', 'invoice', 'pickup', 'weekend'];

function label(index: number): string {
  return `[msg-${String(index).padStart(2, '0')}]`;
}

function message(index: number) {
  const words = Array.from({ length: 3 + ((index * 7) % 9) }, (_, position) => WORDS[(index + position) % WORDS.length]);
  return { role: index % 2 === 0 ? 'user' : 'assistant', content: `${label(index)} ${words.join(' ')}` };
}

function conversation(count: number) {
  return Array.from({ length: count }, (_, index) => message(index));
}

function memory(extra: Record<string, unknown> = {}) {
  return mod.createConversationMemory({ model: createModel(), system: SYSTEM, maxTokens: 120, keepRecent: 2, summaryMaxTokens: 80, ...extra });
}

function summaryRequestText(request: { messages: Array<{ content: string }> }): string {
  return request.messages.map((entry) => entry.content).join('\n');
}

test('buildContext keeps the system prompt and the longest recent run of messages that fits the token budget', () => {
  const history = conversation(20);
  for (const maxTokens of [60, 90, 140, 200, 2000]) {
    const { messages, overflow } = mod.buildContext({ system: SYSTEM, summary: '', history, maxTokens, keepRecent: 2 });
    expect(messages[0]).toEqual({ role: 'system', content: SYSTEM });
    const kept = messages.slice(1);
    expect([...overflow, ...kept]).toEqual(history);
    expect(kept.length).toBeGreaterThanOrEqual(2);
    expect(countTokens(messages)).toBeLessThanOrEqual(maxTokens);
    if (overflow.length > 0) {
      expect(countTokens([messages[0], overflow.at(-1), ...kept])).toBeGreaterThan(maxTokens);
    }
  }
});

test('buildContext always keeps the latest keepRecent messages, even when they alone break the budget', () => {
  const history = conversation(10);
  const { messages, overflow } = mod.buildContext({ system: SYSTEM, summary: '', history, maxTokens: 10, keepRecent: 3 });
  expect(messages).toEqual([{ role: 'system', content: SYSTEM }, ...history.slice(-3)]);
  expect(overflow).toEqual(history.slice(0, 7));
  const short = mod.buildContext({ system: SYSTEM, summary: '', history: history.slice(0, 2), maxTokens: 10, keepRecent: 5 });
  expect(short.messages).toEqual([{ role: 'system', content: SYSTEM }, ...history.slice(0, 2)]);
  expect(short.overflow).toEqual([]);
});

test('buildContext adds the running summary as a second system message and counts it against the budget', () => {
  const history = conversation(20);
  const summary = 'The customer booked two e-bikes for Saturday at the harbour station and asked about helmets.';
  const without = mod.buildContext({ system: SYSTEM, summary: '', history, maxTokens: 150, keepRecent: 2 });
  const withSummary = mod.buildContext({ system: SYSTEM, summary, history, maxTokens: 150, keepRecent: 2 });
  expect(withSummary.messages[0]).toEqual({ role: 'system', content: SYSTEM });
  expect(withSummary.messages[1].role).toBe('system');
  expect(withSummary.messages[1].content.startsWith(mod.SUMMARY_PREFIX)).toBe(true);
  expect(withSummary.messages[1].content).toContain(summary);
  expect(countTokens(withSummary.messages)).toBeLessThanOrEqual(150);
  expect(withSummary.overflow.length).toBeGreaterThan(without.overflow.length);
});

test('summarize sends the previous summary and every folded message in one capped request and returns any successful phrasing', async () => {
  const folded = conversation(5);
  await forEachSeed(6, async () => {
    fakeModel.reply(respond.text(['  The customer booked two bikes for Saturday.  ', 'Booking: two bikes, Saturday, harbour station.', 'Two bikes are booked for the weekend; a refund question is open.']));
    const result = await mod.summarize(createModel(), 'Earlier: the customer asked about prices.', folded, 80);
    expect(fakeModel.requests).toHaveLength(1);
    expect(fakeModel.requests[0].maxTokens).toBe(80);
    const sent = summaryRequestText(fakeModel.requests[0]);
    expect(sent).toContain('Earlier: the customer asked about prices.');
    folded.forEach((entry) => expect(sent).toContain(entry.content));
    expect(result).toBe(fakeModel.responses[0].text.trim());
  });
});

test('summarize returns undefined instead of throwing for errors, refusals, filtered, truncated and empty replies', async () => {
  const failures = [
    respond.refusal(),
    respond.contentFilter(),
    respond.truncated('The customer booked two bikes for Saturday at the harbour station and asked about helmets.', 0.3),
    respond.text('   '),
    respond.error(429, { retryAfterMs: 5 }),
    respond.error(500),
    respond.error(503),
  ];
  for (const failure of failures) {
    fakeModel.reset().reply(failure);
    expect(await mod.summarize(createModel(), '', conversation(4))).toBeUndefined();
  }
});

test('compact folds exactly the overflow into the summary, calls no model when nothing overflows, and keeps the context within budget', async () => {
  const conversationMemory = memory();
  conversation(3).forEach((entry) => conversationMemory.add(entry));
  expect(await conversationMemory.compact()).toEqual({ folded: 0, summarized: false });
  expect(fakeModel.requests).toHaveLength(0);

  conversation(16).slice(3).forEach((entry) => conversationMemory.add(entry));
  const overflow = mod.buildContext({ system: SYSTEM, summary: '', history: conversation(16), maxTokens: 120, keepRecent: 2 }).overflow;
  fakeModel.reply(respond.text('The customer booked bikes and asked about a refund.'));
  expect(await conversationMemory.compact()).toEqual({ folded: overflow.length, summarized: true });
  const state = conversationMemory.state();
  expect(state.summary).toBe('The customer booked bikes and asked about a refund.');
  expect(state.history).toEqual(conversation(16).slice(overflow.length));
  const context = conversationMemory.context();
  expect(countTokens(context)).toBeLessThanOrEqual(120);
  expect(context[1].content).toContain(state.summary);
  expect(context.at(-1)).toEqual(message(15));
});

test('a failed summary loses no history: the window still fits the budget and the next compact folds everything that overflowed', async () => {
  await forEachSeed(10, async () => {
    const conversationMemory = memory();
    conversation(18).forEach((entry) => conversationMemory.add(entry));
    fakeModel.reply(respond.oneOf([respond.refusal(), respond.contentFilter(), respond.error(500), respond.error(429), respond.truncated('A summary that is cut off before it ends properly.', 0.4)]));
    expect(await conversationMemory.compact()).toEqual({ folded: 0, summarized: false });
    expect(conversationMemory.state()).toEqual({ summary: '', history: conversation(18) });
    const context = conversationMemory.context();
    expect(countTokens(context)).toBeLessThanOrEqual(120);
    expect(context.slice(-2)).toEqual(conversation(18).slice(-2));

    fakeModel.reply(respond.text('Recovered summary of the booking.'));
    const result = await conversationMemory.compact();
    expect(result.summarized).toBe(true);
    const sent = summaryRequestText(fakeModel.requests.at(-1));
    conversation(18).slice(0, result.folded).forEach((entry) => expect(sent).toContain(entry.content));
    expect(conversationMemory.state().history).toEqual(conversation(18).slice(result.folded));
  });
});

test('over a long conversation every call fits the budget, keeps the latest turns and summarizes each message exactly once', async () => {
  fakeModel.handle((_request: unknown, context: { callIndex: number }) => respond.text(`Running summary number ${context.callIndex + 1}.`));
  const conversationMemory = memory();
  const history = conversation(40);
  for (const entry of history) {
    conversationMemory.add(entry);
    await conversationMemory.compact();
    const context = conversationMemory.context();
    expect(countTokens(context)).toBeLessThanOrEqual(120);
    expect(context.at(-1)).toEqual(entry);
    expect(context[0]).toEqual({ role: 'system', content: SYSTEM });
  }
  expect(fakeModel.requests.length).toBeGreaterThan(1);
  const remaining = conversationMemory.state().history;
  history.forEach((entry, index) => {
    const timesSummarized = fakeModel.requests.filter((request: { messages: Array<{ content: string }> }) => summaryRequestText(request).includes(label(index))).length;
    const stillInHistory = remaining.some((kept: { content: string }) => kept.content === entry.content);
    expect(timesSummarized + (stillInHistory ? 1 : 0)).toBe(1);
  });
});
