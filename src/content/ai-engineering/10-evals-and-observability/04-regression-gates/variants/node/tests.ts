const { createModel } = require('@dojo/ai');

const DATASET = [
  { id: 'vat', input: 'My invoice shows the wrong VAT number.', expected: 'billing' },
  { id: 'parcel', input: 'The parcel tracking has not moved for a week.', expected: 'shipping' },
  { id: 'double-charge', input: 'I was charged twice for one order.', expected: 'billing', critical: true },
  { id: 'password', input: 'I cannot reset my password.', expected: 'account' },
];

const exactLabel = (output: string, evalCase: { expected: string }) => output.trim().toLowerCase() === evalCase.expected;

const variant = (name: string, system: string) => ({
  name,
  model: createModel({ model: name }),
  prompt: (evalCase: { input: string }) => ({
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: evalCase.input },
    ],
  }),
});

function variantRun(name: string, cases: Array<[string, number, number, boolean?]>) {
  const results = cases.map(([id, passes, runs, critical]) => ({ id, critical: critical === true, runs, passes, errors: 0, passRate: passes / runs }));
  const runs = results.reduce((sum, result) => sum + result.runs, 0);
  const passes = results.reduce((sum, result) => sum + result.passes, 0);
  return { variant: name, repeats: results[0].runs, cases: results, passRate: passes / runs, flaky: results.filter((result) => result.passRate > 0 && result.passRate < 1).map((result) => result.id) };
}

const lastUser = (request: { messages: Array<{ role: string; content: string }> }) => request.messages.filter((message) => message.role === 'user').at(-1)!.content;
const labelFor = (input: string) => DATASET.find((evalCase) => evalCase.input === input)!.expected;

test('evaluateVariant runs every case `repeats` times in a row with the variant prompt and model, and reports per-case and aggregate pass rates', async () => {
  fakeModel.handle((request: { messages: Array<{ role: string; content: string }> }) => respond.text(labelFor(lastUser(request))));
  fakeModel.reply(
    ...['billing', 'Billing', 'billing', 'account', 'shipping', 'account', 'shipping', 'shipping', 'shipping'].map((label) => respond.text(label)),
  );
  const run = await mod.evaluateVariant(variant('prompt-v1', 'Classify the ticket.'), { dataset: DATASET, score: exactLabel, repeats: 3 });
  expect(fakeModel.requests).toHaveLength(12);
  expect(fakeModel.requests.map(lastUser)).toEqual(DATASET.flatMap((evalCase) => [evalCase.input, evalCase.input, evalCase.input]));
  fakeModel.requests.forEach((request: { model: string; messages: Array<{ content: string }> }) => {
    expect(request.model).toBe('prompt-v1');
    expect(request.messages[0].content).toBe('Classify the ticket.');
  });
  expect(run).toMatchObject({ variant: 'prompt-v1', repeats: 3 });
  expect(run.cases.map((result: { id: string; passes: number; runs: number; critical: boolean }) => [result.id, result.passes, result.runs, result.critical])).toEqual([
    ['vat', 3, 3, false],
    ['parcel', 1, 3, false],
    ['double-charge', 0, 3, true],
    ['password', 3, 3, false],
  ]);
  expect(run.cases[1].passRate).toBeCloseTo(1 / 3, 6);
  expect(run.passRate).toBeCloseTo(7 / 12, 6);
  expect(run.flaky).toEqual(['parcel']);
});

test('evaluateVariant counts model errors as failed runs and keeps going', async () => {
  fakeModel.handle((request: { messages: Array<{ role: string; content: string }> }) => respond.text(labelFor(lastUser(request))));
  fakeModel.reply(respond.error(429), respond.text('billing'), respond.error(503), respond.contextLength());
  const run = await mod.evaluateVariant(variant('prompt-v1', 'Classify the ticket.'), { dataset: DATASET, score: exactLabel, repeats: 2 });
  expect(fakeModel.requests).toHaveLength(8);
  expect(run.cases.map((result: { passes: number; errors: number }) => [result.passes, result.errors])).toEqual([
    [1, 1],
    [0, 2],
    [2, 0],
    [2, 0],
  ]);
  expect(run.passRate).toBeCloseTo(5 / 8, 6);
  expect(run.flaky).toEqual(['vat']);
  expect((await mod.evaluateVariant(variant('prompt-v1', 'x'), { dataset: DATASET.slice(0, 1), score: exactLabel })).repeats).toBe(3);
});

test('compareRuns diffs every case and lists only changes larger than the case tolerance', () => {
  const baseline = variantRun('v1', [
    ['vat', 3, 3],
    ['parcel', 2, 3],
    ['double-charge', 3, 3, true],
    ['password', 1, 3],
    ['address', 3, 3],
  ]);
  const candidate = variantRun('v2', [
    ['vat', 1, 3],
    ['parcel', 3, 3],
    ['double-charge', 3, 3, true],
    ['password', 3, 3],
    ['address', 2, 3],
  ]);
  const result = mod.compareRuns(baseline, candidate, { tolerance: 0.05, caseTolerance: 0.34 });
  expect(result.baselinePassRate).toBeCloseTo(12 / 15, 6);
  expect(result.candidatePassRate).toBeCloseTo(12 / 15, 6);
  expect(result.delta).toBeCloseTo(0, 6);
  expect(result.regressions).toHaveLength(1);
  expect(result.regressions[0]).toMatchObject({ id: 'vat', critical: false, baseline: 1 });
  expect(result.regressions[0].candidate).toBeCloseTo(1 / 3, 6);
  expect(result.regressions[0].delta).toBeCloseTo(-2 / 3, 6);
  expect(result.improvements.map((diff: { id: string }) => diff.id)).toEqual(['password']);
  expect(result.decision).toBe('pass');
  expect(result.reasons).toEqual([]);
});

test('compareRuns blocks an aggregate drop beyond the tolerance, and lets noise within it pass', () => {
  const baseline = variantRun('v1', [
    ['a', 10, 10],
    ['b', 9, 10],
    ['c', 8, 10],
    ['d', 9, 10],
  ]);
  const withinNoise = variantRun('v2', [
    ['a', 10, 10],
    ['b', 8, 10],
    ['c', 8, 10],
    ['d', 8, 10],
  ]);
  const atTolerance = mod.compareRuns(baseline, withinNoise, { tolerance: 0.05 });
  expect(atTolerance.delta).toBeCloseTo(-0.05, 6);
  expect(atTolerance.decision).toBe('pass');

  const worse = variantRun('v3', [
    ['a', 9, 10],
    ['b', 8, 10],
    ['c', 7, 10],
    ['d', 8, 10],
  ]);
  const blocked = mod.compareRuns(baseline, worse, { tolerance: 0.05 });
  expect(blocked.decision).toBe('block');
  expect(blocked.reasons.length).toBeGreaterThan(0);
  expect(blocked.regressions).toEqual([]);
  expect(mod.compareRuns(baseline, worse, { tolerance: 0.1 }).decision).toBe('pass');
  expect(mod.compareRuns(baseline, worse).decision).toBe('block');
});

test('compareRuns blocks a regressed critical case even when the aggregate improves', () => {
  const baseline = variantRun('v1', [
    ['vat', 1, 3],
    ['parcel', 1, 3],
    ['double-charge', 3, 3, true],
    ['password', 1, 3],
  ]);
  const candidate = variantRun('v2', [
    ['vat', 3, 3],
    ['parcel', 3, 3],
    ['double-charge', 1, 3, true],
    ['password', 3, 3],
  ]);
  const result = mod.compareRuns(baseline, candidate, { tolerance: 0.02, caseTolerance: 0.34 });
  expect(result.delta).toBeGreaterThan(0);
  expect(result.decision).toBe('block');
  expect(result.regressions.map((diff: { id: string; critical: boolean }) => [diff.id, diff.critical])).toEqual([['double-charge', true]]);
  expect(result.reasons.some((reason: string) => reason.includes('double-charge'))).toBe(true);
  expect(result.improvements).toHaveLength(3);
});

test('compareRuns refuses to compare runs on different datasets', () => {
  const baseline = variantRun('v1', [
    ['vat', 3, 3],
    ['parcel', 3, 3],
  ]);
  const candidate = variantRun('v2', [
    ['vat', 3, 3],
    ['password', 3, 3],
  ]);
  const result = mod.compareRuns(baseline, candidate);
  expect(result.decision).toBe('block');
  expect(result.reasons.join(' ')).toMatch(/parcel/);
  expect(result.reasons.join(' ')).toMatch(/password/);
});

test('end to end: repeated runs catch a candidate prompt that only sometimes breaks the critical case', async () => {
  let blocked = 0;
  await forEachSeed(10, async () => {
    fakeModel.handle((request: { model: string; messages: Array<{ role: string; content: string }> }) => {
      const label = labelFor(lastUser(request));
      if (request.model === 'prompt-v2' && label === 'billing' && lastUser(request).includes('twice')) {
        return respond.sometimes(0.5, respond.text('billing'), respond.text('shipping'));
      }
      return respond.text([label, label.toUpperCase()]);
    });
    const baseline = await mod.evaluateVariant(variant('prompt-v1', 'Classify the ticket.'), { dataset: DATASET, score: exactLabel, repeats: 4 });
    const candidate = await mod.evaluateVariant(variant('prompt-v2', 'Classify the ticket. Be brief.'), { dataset: DATASET, score: exactLabel, repeats: 4 });
    expect(baseline.passRate).toBe(1);
    const critical = candidate.cases.find((result: { id: string }) => result.id === 'double-charge');
    const gate = mod.compareRuns(baseline, candidate, { tolerance: 0.1, caseTolerance: 0.25 });
    expect(gate.decision).toBe(critical.passRate < 0.75 ? 'block' : 'pass');
    expect(gate.delta).toBeCloseTo(candidate.passRate - 1, 6);
    blocked += gate.decision === 'block' ? 1 : 0;
  });
  expect(blocked).toBeGreaterThan(0);
});
