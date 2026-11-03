const { createModel, embed, cosineSimilarity } = require('@dojo/ai');

const HOUR = 3_600_000;
const START = Date.UTC(2026, 9, 1, 9, 0, 0);
const CONVERSATION = 'user: I always book aisle seats, and I am allergic to peanuts.\nassistant: Noted.\nuser: What is the weather in Lisbon today?';

function clock(start = START) {
  let time = start;
  const now = () => time;
  return { now, advance: (hours: number) => (time += hours * HOUR) };
}

function store(extra: Record<string, unknown> = {}) {
  const time = clock();
  return { time, memory: mod.createMemoryStore({ now: time.now, ...extra }) };
}

const ids = (results: Array<{ memory: { id: string } }>) => results.map((result) => result.memory.id);

test('extractCandidates asks for JSON with the conversation and keeps only well-formed candidates, trimmed', async () => {
  fakeModel.reply(
    respond.json({
      memories: [
        { text: '  The user always books aisle seats.  ', importance: 6 },
        { text: 'The user is allergic to peanuts.', importance: 9 },
        { text: 'Asked about the weather', importance: 0 },
        { text: 'Too important', importance: 11 },
        { text: 'Half a point', importance: 2.5 },
        { text: 'String importance', importance: '7' },
        { text: '   ', importance: 5 },
        { importance: 5 },
        'The user likes Lisbon',
      ],
    }),
  );
  const candidates = await mod.extractCandidates(createModel(), CONVERSATION);
  expect(candidates).toEqual([
    { text: 'The user always books aisle seats.', importance: 6 },
    { text: 'The user is allergic to peanuts.', importance: 9 },
  ]);
  expect(fakeModel.requests[0].responseFormat?.type).toBe('json');
  expect(fakeModel.requests[0].messages.map((message: { content: string }) => message.content).join('\n')).toContain(CONVERSATION);
});

test('extractCandidates returns no candidates for refusals and every malformed shape, and lets provider errors through', async () => {
  await forEachSeed(16, async () => {
    fakeModel.reply(respond.oneOf([respond.malformedJson({ memories: [{ text: 'The user is allergic to peanuts.', importance: 9 }] }), respond.refusal(), respond.json(['not', 'an', 'object']), respond.json({ memories: 'none' })]));
    expect(await mod.extractCandidates(createModel(), CONVERSATION)).toEqual([]);
  });
  fakeModel.reset().reply(respond.error(503));
  const error = await captureError(mod.extractCandidates(createModel(), CONVERSATION));
  expect(error.status).toBe(503);
});

test('isWorthStoring keeps important statements and skips trivia, fragments and questions', () => {
  expect(mod.isWorthStoring({ text: 'The user is allergic to peanuts.', importance: 9 })).toBe(true);
  expect(mod.isWorthStoring({ text: 'The user prefers window seats.', importance: 3 })).toBe(true);
  expect(mod.isWorthStoring({ text: 'The user said thanks.', importance: 2 })).toBe(false);
  expect(mod.isWorthStoring({ text: 'Peanut allergy', importance: 9 })).toBe(false);
  expect(mod.isWorthStoring({ text: 'Does the user like trains?', importance: 6 })).toBe(false);
  expect(mod.isWorthStoring({ text: 'The user prefers window seats.', importance: 4 }, 5)).toBe(false);
});

test('write skips what is not worth storing, merges near-duplicates into the existing memory and adds new facts', () => {
  const { time, memory } = store();
  const first = memory.write({ text: 'The user prefers dark mode in the editor', importance: 4 });
  expect(first.action).toBe('added');
  expect(first.memory).toEqual(expect.objectContaining({ text: 'The user prefers dark mode in the editor', importance: 4, createdAt: START, lastAccessedAt: START }));
  expect(first.memory.embedding).toEqual(embed('The user prefers dark mode in the editor'));

  time.advance(5);
  const merged = memory.write({ text: 'User prefers the dark mode editor', importance: 7 });
  expect(merged.action).toBe('merged');
  expect(merged.memory).toEqual(expect.objectContaining({ id: first.memory.id, text: 'User prefers the dark mode editor', importance: 7, createdAt: START, lastAccessedAt: START + 5 * HOUR }));
  expect(memory.write({ text: 'The user prefers dark mode in the editor', importance: 3 }).memory.importance).toBe(7);

  expect(memory.write({ text: 'The user is allergic to peanuts', importance: 9 }).action).toBe('added');
  expect(memory.write({ text: 'ok thanks', importance: 1 })).toEqual({ action: 'skipped' });
  expect(memory.all()).toHaveLength(2);
  expect(new Set(memory.all().map((entry: { id: string }) => entry.id)).size).toBe(2);
});

test('the duplicate threshold decides between merging and adding', () => {
  const near = ['The user prefers dark mode in the editor', 'The user prefers dark mode in the code editor'];
  const similarity = cosineSimilarity(embed(near[0]), embed(near[1]));
  const loose = store({ duplicateThreshold: similarity - 0.01 }).memory;
  const strict = store({ duplicateThreshold: similarity + 0.01 }).memory;
  for (const memory of [loose, strict]) {
    memory.write({ text: near[0], importance: 5 });
    memory.write({ text: near[1], importance: 5 });
  }
  expect(loose.all()).toHaveLength(1);
  expect(strict.all()).toHaveLength(2);
});

test('recencyScore decays exponentially per hour since the last access and never exceeds 1', () => {
  for (const decay of [0.5, 0.9, 0.995]) {
    expect(mod.recencyScore(START, START, decay)).toBe(1);
    expect(mod.recencyScore(START, START + 10 * HOUR, decay)).toBeCloseTo(decay ** 10, 9);
    expect(mod.recencyScore(START, START + 1.5 * HOUR, decay)).toBeCloseTo(decay ** 1.5, 9);
    expect(mod.recencyScore(START + HOUR, START, decay)).toBe(1);
    for (const [first, second] of [[2, 3], [0.5, 7], [24, 48]]) {
      const combined = mod.recencyScore(START, START + (first + second) * HOUR, decay);
      expect(combined).toBeCloseTo(mod.recencyScore(START, START + first * HOUR, decay) * mod.recencyScore(START, START + second * HOUR, decay), 9);
      expect(combined).toBeLessThan(mod.recencyScore(START, START + first * HOUR, decay));
    }
  }
});

test('retrieve scores relevance, recency and importance with the configured weights, best first, within the limit', () => {
  const facts = [
    { text: 'The user is allergic to peanuts', importance: 9, hoursLater: 0 },
    { text: 'The user prefers vegan restaurants', importance: 5, hoursLater: 30 },
    { text: 'The user lives in Lisbon near the river', importance: 4, hoursLater: 60 },
    { text: 'The user prefers aisle seats on flights', importance: 6, hoursLater: 90 },
  ];
  const query = 'Which restaurant should I book? The user prefers vegan food.';
  const scenarios = [
    { weights: { relevance: 1, recency: 0, importance: 0 }, decayPerHour: 0.99 },
    { weights: { relevance: 0, recency: 1, importance: 0 }, decayPerHour: 0.99 },
    { weights: { relevance: 0, recency: 0, importance: 1 }, decayPerHour: 0.99 },
    { weights: { relevance: 2, recency: 0.5, importance: 1 }, decayPerHour: 0.95 },
  ];
  const orders: string[][] = [];
  for (const { weights, decayPerHour } of scenarios) {
    const { time, memory } = store({ weights, decayPerHour });
    let elapsed = 0;
    facts.forEach((fact) => {
      time.advance(fact.hoursLater - elapsed);
      elapsed = fact.hoursLater;
      memory.write(fact);
    });
    time.advance(10);
    const results = memory.retrieve(query, 3);
    expect(results).toHaveLength(3);
    results.forEach((result: { memory: { text: string; importance: number; lastAccessedAt: number }; score: number; relevance: number; recency: number; importance: number }) => {
      const fact = facts.find((entry) => entry.text === result.memory.text)!;
      expect(result.relevance).toBeCloseTo(Math.max(0, cosineSimilarity(embed(query), embed(fact.text))), 9);
      expect(result.recency).toBeCloseTo(decayPerHour ** (100 - fact.hoursLater), 9);
      expect(result.importance).toBeCloseTo(fact.importance / 10, 9);
      expect(result.score).toBeCloseTo(weights.relevance * result.relevance + weights.recency * result.recency + weights.importance * result.importance, 9);
    });
    results.slice(1).forEach((result: { score: number }, index: number) => expect(result.score).toBeLessThanOrEqual(results[index].score));
    orders.push(results.map((result: { memory: { text: string } }) => result.memory.text));
  }
  expect(orders[0][0]).toBe('The user prefers vegan restaurants');
  expect(orders[1]).toEqual(['The user prefers aisle seats on flights', 'The user lives in Lisbon near the river', 'The user prefers vegan restaurants']);
  expect(orders[2]).toEqual(['The user is allergic to peanuts', 'The user prefers aisle seats on flights', 'The user prefers vegan restaurants']);
});

test('retrieving a memory refreshes its last access, so it outranks an untouched memory later', () => {
  const { time, memory } = store({ weights: { relevance: 0, recency: 1, importance: 0 } });
  const peanuts = memory.write({ text: 'The user is allergic to peanuts', importance: 8 }).memory;
  const seats = memory.write({ text: 'The user prefers aisle seats on flights', importance: 8 }).memory;
  time.advance(20);
  const retrieved = memory.retrieve('peanuts allergy', 1);
  expect(ids(retrieved)).toEqual([peanuts.id]);
  expect(retrieved[0].recency).toBeCloseTo(0.995 ** 20, 9);
  const stored = memory.all();
  expect(stored.find((entry: { id: string }) => entry.id === peanuts.id).lastAccessedAt).toBe(START + 20 * HOUR);
  expect(stored.find((entry: { id: string }) => entry.id === seats.id).lastAccessedAt).toBe(START);
  time.advance(30);
  const later = memory.retrieve('anything', 2);
  expect(ids(later)).toEqual([peanuts.id, seats.id]);
  expect(later[0].recency).toBeCloseTo(0.995 ** 30, 9);
  expect(later[1].recency).toBeCloseTo(0.995 ** 50, 9);
});
