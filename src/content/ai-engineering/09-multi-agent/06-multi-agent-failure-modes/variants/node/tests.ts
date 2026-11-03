const { createModel } = require('@dojo/ai');

type Request = { messages: Array<{ role: string; content: string }>; responseFormat?: { type: string } };
const userOf = (request: Request) => request.messages.find((message) => message.role === 'user')!.content;
const systemOf = (request: Request) => request.messages.find((message) => message.role === 'system')!.content;

const response = (text: string, finishReason = 'stop') => ({ id: 'r', model: 'dojo-fake-1', text, toolCalls: [], finishReason, usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2, cost: 0 } });
const claims = (...items: Array<[string, string]>) => JSON.stringify({ claims: items.map(([text, sourceId]) => ({ text, sourceId })) });

const TASKS = [
  { id: 'pricing', instruction: 'Summarize Beacon pricing.', sourceIds: ['s1', 's2'] },
  { id: 'retention', instruction: 'Summarize Beacon retention.', sourceIds: ['s3'] },
];
const VOTERS = ['Ada', 'Grace', 'Linus'];
const QUESTION = 'Is the Beacon contract compliant with our 90-day retention policy? Answer yes or no.';

test('validateWorkerOutput accepts only complete JSON whose claims cite allowed sources', () => {
  expect(mod.validateWorkerOutput(response(claims(['$0.30 per GB', 's1'], ['volume discounts', 's2'])), ['s1', 's2'])).toEqual({
    ok: true,
    claims: [
      { text: '$0.30 per GB', sourceId: 's1' },
      { text: 'volume discounts', sourceId: 's2' },
    ],
  });
  const invalid = [
    [response(claims(['$0.30 per GB', 's1']), 'length'), 'length'],
    [response('{"claims": [{"text": "x", '), 'JSON'],
    [response('{"claims": []}'), 'claims'],
    [response('{"findings": "x"}'), 'claims'],
    [response('null'), 'claims'],
    [response(claims(['$0.30 per GB', 's1'], ['free tier forever', 's9'])), 's9'],
    [response(claims(['  ', 's1'])), 'text'],
  ];
  invalid.forEach(([output, mention]) => {
    const result = mod.validateWorkerOutput(output, ['s1', 's2']);
    expect(result.ok).toBe(false);
    expect(result.problems.length).toBeGreaterThan(0);
    expect(result.problems.join(' ')).toContain(mention);
  });
});

test('gatherClaims retries an invalid worker with feedback and quarantines what still fails, so bad claims never spread', async () => {
  fakeModel.reply(
    respond.json({ claims: [{ text: 'Beacon costs $0.30 per GB', sourceId: 's1' }, { text: 'Beacon is free for startups', sourceId: 's7' }] }),
    respond.json({ claims: [{ text: 'Beacon costs $0.30 per GB', sourceId: 's1' }] }),
    respond.malformedJson({ claims: [] }),
    respond.error(503),
  );
  const result = await mod.gatherClaims(TASKS, { model: createModel(), maxAttempts: 2 });
  expect(result.accepted).toEqual([{ text: 'Beacon costs $0.30 per GB', sourceId: 's1', taskId: 'pricing' }]);
  expect(result.quarantined).toHaveLength(1);
  expect(result.quarantined[0].taskId).toBe('retention');
  expect(result.quarantined[0].problems.join(' ')).toContain('overloaded');
  expect(fakeModel.requests).toHaveLength(4);
  const first = fakeModel.requests[0];
  expect(systemOf(first)).toBe(mod.WORKER_SYSTEM);
  expect(first.responseFormat).toEqual({ type: 'json' });
  expect(userOf(first)).toContain(TASKS[0].instruction);
  ['s1', 's2'].forEach((id) => expect(userOf(first)).toContain(id));
  expect(userOf(fakeModel.requests[1])).toContain('s7');
  expect(userOf(fakeModel.requests[2])).toContain(TASKS[1].instruction);
});

test('accepted claims always cite their own task sources, across every mix of worker failures', async () => {
  await forEachSeed(20, async () => {
    fakeModel.handle((request: Request) => {
      const allowed = userOf(request).includes('pricing') ? 's1' : 's3';
      return respond.oneOf([
        respond.json({ claims: [{ text: 'grounded claim', sourceId: allowed }] }),
        respond.json({ claims: [{ text: 'invented claim', sourceId: 's9' }] }),
        respond.malformedJson({ claims: [{ text: 'grounded claim', sourceId: allowed }] }),
        respond.truncated(JSON.stringify({ claims: [{ text: 'grounded claim', sourceId: allowed }] })),
        respond.error(500),
      ]);
    });
    const result = await mod.gatherClaims(TASKS, { model: createModel(), maxAttempts: 3 });
    const sources = Object.fromEntries(TASKS.map((task) => [task.id, task.sourceIds]));
    result.accepted.forEach((claim: { taskId: string; sourceId: string }) => expect(sources[claim.taskId]).toContain(claim.sourceId));
    const settled = [...new Set(result.accepted.map((claim: { taskId: string }) => claim.taskId)), ...result.quarantined.map((entry: { taskId: string }) => entry.taskId)];
    expect(settled.sort()).toEqual(['pricing', 'retention']);
    result.quarantined.forEach((entry: { problems: string[] }) => expect(entry.problems.length).toBeGreaterThan(0));
    expect(fakeModel.requests.length).toBeLessThanOrEqual(6);
  });
});

test('first-round votes are cast in parallel, each blind to the others, and a quorum decides', async () => {
  const model = createModel();
  let active = 0;
  let peak = 0;
  const counting = {
    async generate(request: Request) {
      active += 1;
      peak = Math.max(peak, active);
      try {
        return await model.generate(request);
      } finally {
        active -= 1;
      }
    },
  };
  fakeModel.reply(respond.slow(5, respond.json({ answer: ' No ' })), respond.slow(5, respond.json({ answer: 'no' })), respond.slow(5, respond.json({ answer: 'yes' })));
  const result = await mod.voteIndependently(QUESTION, { model: counting, voters: VOTERS, quorum: 0.6 });
  expect(result).toEqual({ status: 'consensus', decision: 'no', rounds: 1, ballots: [['no', 'no', 'yes']] });
  expect(peak).toBe(3);
  expect(fakeModel.requests).toHaveLength(3);
  fakeModel.requests.forEach((request: Request, index: number) => {
    expect(request.messages).toEqual([
      { role: 'system', content: mod.voterSystem(VOTERS[index]) },
      { role: 'user', content: QUESTION },
    ]);
    expect(request.responseFormat).toEqual({ type: 'json' });
  });
  expect(mod.voterSystem('Ada')).toContain('Ada');
});

test('without a quorum, a discussion round shares the anonymous first-round answers; abstentions count against the quorum', async () => {
  fakeModel.reply(
    respond.json({ answer: 'yes' }),
    respond.json({ answer: 'no' }),
    respond.refusal(),
    respond.json({ answer: 'no' }),
    respond.json({ answer: 'No' }),
    respond.json({ answer: 'yes' }),
  );
  const result = await mod.voteIndependently(QUESTION, { model: createModel(), voters: VOTERS, quorum: 0.6 });
  expect(result).toEqual({ status: 'consensus', decision: 'no', rounds: 2, ballots: [['yes', 'no', null], ['no', 'no', 'yes']] });
  expect(fakeModel.requests).toHaveLength(6);
  fakeModel.requests.slice(3).forEach((request: Request, index: number) => {
    const content = userOf(request);
    expect(systemOf(request)).toBe(mod.voterSystem(VOTERS[index]));
    expect(content).toContain(QUESTION);
    expect(content).toContain('yes');
    expect(content).toContain('no');
    VOTERS.forEach((voter) => expect(content).not.toContain(voter));
  });

  fakeModel.reset().reply(respond.json({ answer: 'yes' }), respond.error(500), respond.json({ answer: 'no' }), respond.json({ answer: 'yes' }), respond.refusal(), respond.json({ answer: 'no' }));
  const split = await mod.voteIndependently(QUESTION, { model: createModel(), voters: VOTERS, quorum: 0.6 });
  expect(split).toEqual({ status: 'no_consensus', decision: null, rounds: 2, ballots: [['yes', null, 'no'], ['yes', null, 'no']] });
});

test('voting keeps its invariants across seeds', async () => {
  await forEachSeed(20, async () => {
    fakeModel.handle(() => respond.oneOf([respond.json({ answer: 'yes' }), respond.json({ answer: 'No' }), respond.malformedJson({ answer: 'no' }), respond.error(503)]));
    const voters = ['Ada', 'Grace', 'Linus', 'Margaret', 'Alan'];
    const result = await mod.voteIndependently(QUESTION, { model: createModel(), voters, quorum: 0.6 });
    expect(fakeModel.requests).toHaveLength(voters.length * result.rounds);
    expect(result.ballots).toHaveLength(result.rounds);
    fakeModel.requests.slice(0, voters.length).forEach((request: Request) => expect(userOf(request)).toBe(QUESTION));
    const last = result.ballots[result.rounds - 1];
    if (result.status === 'consensus') {
      expect(last.filter((answer: string | null) => answer === result.decision).length / voters.length).toBeGreaterThanOrEqual(0.6);
    } else {
      expect(result.decision).toBe(null);
    }
    if (result.rounds === 2) {
      const counts = ['yes', 'no'].map((answer) => result.ballots[0].filter((ballot: string | null) => ballot === answer).length);
      expect(Math.max(...counts) / voters.length).toBeLessThan(0.6);
    }
  });
});

test('the delegation guard blocks cycles, depth, fan-out and total delegations, in that order', () => {
  const guard = mod.createDelegationGuard({ maxDepth: 2, maxFanOut: 2, maxTotal: 4 });
  expect(guard.request(['lead'], 'pricing')).toEqual({ allowed: true });
  expect(guard.request(['lead', 'pricing'], 'lead')).toEqual({ allowed: false, reason: 'cycle' });
  expect(guard.request(['lead', 'pricing'], 'fx-rates')).toEqual({ allowed: true });
  expect(guard.request(['lead', 'pricing', 'fx-rates'], 'bank-api')).toEqual({ allowed: false, reason: 'depth' });
  expect(guard.request(['lead', 'pricing', 'fx-rates'], 'pricing')).toEqual({ allowed: false, reason: 'cycle' });
  expect(guard.request(['lead'], 'retention')).toEqual({ allowed: true });
  expect(guard.request(['lead'], 'support')).toEqual({ allowed: false, reason: 'fan_out' });
  expect(guard.request(['lead', 'retention'], 'archive')).toEqual({ allowed: true });
  expect(guard.request(['lead', 'retention'], 'legal')).toEqual({ allowed: false, reason: 'total' });
  expect(guard.total).toBe(4);
  const fresh = mod.createDelegationGuard({ maxDepth: 1, maxFanOut: 5, maxTotal: 5 });
  expect(fresh.request(['lead'], 'worker')).toEqual({ allowed: true });
  expect(fresh.request(['lead', 'worker'], 'helper')).toEqual({ allowed: false, reason: 'depth' });
  expect(fresh.total).toBe(1);
});
