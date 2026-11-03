const { createModel } = require('@dojo/ai');

const ROUTES = {
  billing: { description: 'invoices, refunds and payments', system: 'You are the billing specialist.' },
  technical: { description: 'bugs, crashes and errors', system: 'You are the technical support engineer.' },
  general: { description: 'anything else', system: 'You are a friendly general assistant.' },
};

function parse(text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

const lastUserContent = (request: { messages: Array<{ role: string; content: string }> }) =>
  [...request.messages].reverse().find((message) => message.role === 'user')?.content ?? '';

test('promptChain feeds each output into the next prompt and returns every output', async () => {
  fakeModel.reply(respond.text('facts: order 42 late'), respond.text('draft: sorry about order 42'), respond.text('final: sorry about order 42, refund issued'));
  const steps = [
    { name: 'extract', prompt: (previous: string) => `Extract facts from: ${previous}` },
    { name: 'draft', prompt: (previous: string) => `Draft a reply using: ${previous}` },
    { name: 'polish', prompt: (previous: string) => `Polish: ${previous}` },
  ];
  const result = await mod.promptChain(createModel(), 'My order 42 is late', steps);
  expect(fakeModel.requests.map((request: any) => request.messages[0].content)).toEqual([
    'Extract facts from: My order 42 is late',
    'Draft a reply using: facts: order 42 late',
    'Polish: draft: sorry about order 42',
  ]);
  expect(result).toEqual({
    output: 'final: sorry about order 42, refund issued',
    outputs: ['facts: order 42 late', 'draft: sorry about order 42', 'final: sorry about order 42, refund issued'],
  });
});

test('promptChain stops at a failed gate or at a reply that did not finish normally, without calling later steps', async () => {
  const steps = [
    { name: 'outline', prompt: (previous: string) => `Outline: ${previous}`, gate: (output: string) => output.includes('1.') },
    { name: 'write', prompt: (previous: string) => `Write: ${previous}` },
  ];
  fakeModel.reply(respond.text('no numbered outline here'), respond.text('should not be requested'));
  const gateError = await captureError(mod.promptChain(createModel(), 'agents', steps));
  expect(gateError).toBeInstanceOf(mod.GateError);
  expect(gateError.step).toBe('outline');
  expect(gateError.output).toBe('no numbered outline here');
  expect(fakeModel.requests).toHaveLength(1);

  await forEachSeed(9, async () => {
    fakeModel.reply(respond.oneOf([respond.truncated('1. Intro 2. Body 3. Conclusion', 0.4), respond.refusal(), respond.contentFilter()]), respond.text('should not be requested'));
    const error = await captureError(mod.promptChain(createModel(), 'agents', steps));
    expect(error).toBeInstanceOf(mod.GateError);
    expect(error.step).toBe('outline');
    expect(fakeModel.requests).toHaveLength(1);
  });
});

test('route classifies with a JSON request listing every route and falls back on any unusable classification', async () => {
  const fallbacks = { used: 0, skipped: 0 };
  await forEachSeed(24, async () => {
    fakeModel.reply(
      respond.oneOf([
        respond.json({ route: 'billing' }),
        respond.json({ route: 'technical' }),
        respond.json({ route: 'legal' }),
        respond.json({ destination: 'billing' }),
        respond.malformedJson({ route: 'technical' }),
        respond.refusal(),
      ]),
      respond.text(['Here is how we can help.', 'Thanks for reaching out.']),
    );
    const result = await mod.route(createModel(), 'The app crashes when I export my invoice', ROUTES, 'general');
    const classification = fakeModel.requests[0];
    expect(classification.responseFormat?.type).toBe('json');
    const classificationText = classification.messages.map((message: { content: string }) => message.content).join('\n');
    Object.keys(ROUTES).forEach((name) => expect(classificationText).toContain(name));
    const proposed = parse(fakeModel.responses[0].text)?.route;
    const expected = Object.keys(ROUTES).includes(proposed) ? proposed : 'general';
    expected === proposed ? (fallbacks.skipped += 1) : (fallbacks.used += 1);
    expect(result.route).toBe(expected);
    expect(fakeModel.requests).toHaveLength(2);
    expect(fakeModel.requests[1].messages[0]).toEqual({ role: 'system', content: (ROUTES as any)[expected].system });
    expect(lastUserContent(fakeModel.requests[1])).toBe('The app crashes when I export my invoice');
    expect(result.text).toBe(fakeModel.responses[1].text);
  });
  expect(fallbacks.used).toBeGreaterThan(0);
  expect(fallbacks.skipped).toBeGreaterThan(0);
});

test('parallelSections sends every section at once and maps each answer to its section name', async () => {
  fakeModel.configure({ latencyMs: 5 });
  const finishedWhenRequested: number[] = [];
  fakeModel.handle((request: any) => {
    finishedWhenRequested.push(fakeModel.responses.length);
    return respond.text(`answer for ${request.messages[0].content}`);
  });
  const sections = [
    { name: 'summary', instruction: 'Summarize the contract.' },
    { name: 'risks', instruction: 'List the risky clauses.' },
    { name: 'deadlines', instruction: 'List every deadline.' },
  ];
  const result = await mod.parallelSections(createModel(), 'CONTRACT TEXT', sections);
  expect(finishedWhenRequested).toEqual([0, 0, 0]);
  expect(result).toEqual({
    summary: 'answer for Summarize the contract.',
    risks: 'answer for List the risky clauses.',
    deadlines: 'answer for List every deadline.',
  });
  fakeModel.requests.forEach((request: any) => expect(lastUserContent(request)).toBe('CONTRACT TEXT'));
});

test('vote asks every voter for JSON, normalizes labels, counts unusable ballots and failed calls as abstentions, and returns null on a tie', async () => {
  let ties = 0;
  await forEachSeed(30, async () => {
    fakeModel.handle(() =>
      respond.oneOf([
        respond.json({ label: 'Spam' }),
        respond.json({ label: ' spam ' }),
        respond.json({ label: 'ham' }),
        respond.json({ label: 'HAM' }),
        respond.json({ verdict: 'spam' }),
        respond.malformedJson({ label: 'spam' }),
        respond.refusal(),
        respond.error(500),
      ]),
    );
    const result = await mod.vote(createModel(), 'Is this message spam? WIN A FREE PHONE', 5);
    expect(fakeModel.requests).toHaveLength(5);
    fakeModel.requests.forEach((request: any) => expect(request.responseFormat?.type).toBe('json'));
    const votes: Record<string, number> = {};
    fakeModel.responses.forEach((response: { text: string }) => {
      const label = parse(response.text)?.label;
      if (typeof label === 'string') {
        votes[label.trim().toLowerCase()] = (votes[label.trim().toLowerCase()] ?? 0) + 1;
      }
    });
    const counted = Object.values(votes).reduce((total, count) => total + count, 0);
    const ranking = Object.entries(votes).sort((left, right) => right[1] - left[1]);
    const verdict = ranking.length > 0 && (ranking.length === 1 || ranking[0][1] > ranking[1][1]) ? ranking[0][0] : null;
    if (verdict === null) {
      ties += 1;
    }
    expect(result).toEqual({ verdict, votes, abstentions: 5 - counted });
  });
  expect(ties).toBeGreaterThan(0);
});

function scriptWriterAndCritic(passWhen: (draft: string) => boolean) {
  let drafts = 0;
  fakeModel.handle((request: any) => {
    if (request.responseFormat?.type === 'json') {
      const draft = lastUserContent(request);
      return passWhen(draft) ? respond.json({ pass: true, feedback: 'Good.' }) : respond.json({ pass: false, feedback: `Too vague after ${drafts} drafts` });
    }
    drafts += 1;
    return respond.text(`draft v${drafts}`);
  });
}

test('evaluatorOptimizer alternates draft and JSON evaluation, sends the previous draft and feedback back, and stops when the evaluator passes', async () => {
  scriptWriterAndCritic((draft) => draft.includes('draft v3'));
  const result = await mod.evaluatorOptimizer(createModel(), 'Write a release note for version 2.0', 5);
  expect(result).toEqual({ text: 'draft v3', rounds: 3, accepted: true, feedback: ['Too vague after 1 drafts', 'Too vague after 2 drafts'] });
  expect(fakeModel.requests.map((request: any) => request.responseFormat?.type === 'json')).toEqual([false, true, false, true, false, true]);
  const evaluation = fakeModel.requests[1];
  expect(evaluation.messages.map((message: any) => message.content).join('\n')).toContain('draft v1');
  const revision = fakeModel.requests[4].messages.map((message: any) => message.content).join('\n');
  expect(revision).toContain('Write a release note for version 2.0');
  expect(revision).toContain('draft v2');
  expect(revision).toContain('Too vague after 2 drafts');
});

test('evaluatorOptimizer stops after maxRounds with the last draft, treating an unparsable evaluation as a rejection', async () => {
  scriptWriterAndCritic(() => false);
  const rejected = await mod.evaluatorOptimizer(createModel(), 'Write a haiku about queues', 2);
  expect(rejected.text).toBe('draft v2');
  expect(rejected.rounds).toBe(2);
  expect(rejected.accepted).toBe(false);
  expect(rejected.feedback).toHaveLength(2);
  expect(fakeModel.requests).toHaveLength(4);

  await forEachSeed(8, async () => {
    let drafts = 0;
    fakeModel.handle((request: any) => {
      if (request.responseFormat?.type === 'json') {
        return respond.oneOf([respond.malformedJson({ pass: true }), respond.json({ verdict: 'pass' }), respond.json({ pass: 'yes' })]);
      }
      drafts += 1;
      return respond.text(`draft v${drafts}`);
    });
    const result = await mod.evaluatorOptimizer(createModel(), 'Write a haiku about queues', 3);
    expect(result.accepted).toBe(false);
    expect(result.rounds).toBe(3);
    expect(result.text).toBe('draft v3');
    expect(result.feedback).toHaveLength(3);
    expect(fakeModel.requests).toHaveLength(6);
  });
});
