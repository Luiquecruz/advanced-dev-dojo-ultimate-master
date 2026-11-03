const { createModel } = require('@dojo/ai');

const TASK = 'Customer A-1 asks for a refund of the $30 charge on order A-1.';

function tools() {
  return [
    { name: 'get_order', description: 'Look up an order', parameters: { type: 'object', properties: { orderId: { type: 'string' } } }, execute: fn((args: { orderId: string }) => ({ orderId: args.orderId, total: 30 })) },
    { name: 'issue_refund', description: 'Refund an order', parameters: { type: 'object', properties: { orderId: { type: 'string' }, amount: { type: 'number' } } }, execute: fn(() => 'refund issued') },
    { name: 'delete_account', description: 'Delete a customer account', parameters: { type: 'object', properties: { userId: { type: 'string' } } }, execute: fn(() => 'deleted') },
    {
      name: 'send_email',
      description: 'Email the customer',
      parameters: { type: 'object', properties: { body: { type: 'string' } } },
      execute: fn(() => {
        throw new Error('mail server down');
      }),
    },
  ];
}

const SPEC = {
  requiredTools: ['get_order', 'issue_refund'],
  forbiddenTools: ['delete_account'],
  order: [['get_order', 'issue_refund']],
  forbiddenCalls: [{ tool: 'issue_refund', description: 'refunds above $100 need a human', matches: (args: { amount?: number }) => (args.amount ?? 0) > 100 }],
  maxModelCalls: 4,
  maxToolCalls: 4,
  maxCostUsd: 0.01,
};

const model = (inputTokens = 100, outputTokens = 20, costUsd = 0.001) => ({ type: 'model', inputTokens, outputTokens, costUsd });
const tool = (name: string, args: Record<string, unknown> | null = {}, ok = true) => ({ type: 'tool', name, arguments: args, ok });
const trajectory = (steps: unknown[], status = 'done') => ({ task: TASK, status, answer: status === 'done' ? 'Refund issued.' : null, steps });
const rules = (evaluation: { violations: Array<{ rule: string }> }) => evaluation.violations.map((violation) => violation.rule).sort();

test('recordTrajectory records one step per model response and per tool call, with usage, parsed arguments and outcome', async () => {
  fakeModel.configure({ pricing: { inputPerMillion: 2, outputPerMillion: 8 } });
  fakeModel.reply(respond.toolCall('get_order', { orderId: 'A-1' }), respond.toolCalls([{ name: 'issue_refund', arguments: { orderId: 'A-1', amount: 30 } }, { name: 'send_email', arguments: { body: 'Done' } }]), respond.text('Refund issued.'));
  const recorded = await mod.recordTrajectory(createModel(), { task: TASK, tools: tools(), maxSteps: 5 });
  expect(recorded).toMatchObject({ task: TASK, status: 'done', answer: 'Refund issued.' });
  expect(recorded.steps.map((step: { type: string; name?: string }) => (step.type === 'tool' ? step.name : 'model'))).toEqual(['model', 'get_order', 'model', 'issue_refund', 'send_email', 'model']);
  expect(recorded.steps[1]).toEqual({ type: 'tool', name: 'get_order', arguments: { orderId: 'A-1' }, ok: true });
  expect(recorded.steps[3]).toEqual({ type: 'tool', name: 'issue_refund', arguments: { orderId: 'A-1', amount: 30 }, ok: true });
  expect(recorded.steps[4]).toMatchObject({ name: 'send_email', ok: false });
  const modelSteps = recorded.steps.filter((step: { type: string }) => step.type === 'model');
  modelSteps.forEach((step: { inputTokens: number; outputTokens: number; costUsd: number }, index: number) => {
    const { usage } = fakeModel.responses[index];
    expect(step).toEqual({ type: 'model', inputTokens: usage.inputTokens, outputTokens: usage.outputTokens, costUsd: usage.cost });
  });
});

test('recordTrajectory keeps attempted calls the harness rejected: unknown tools and broken arguments', async () => {
  fakeModel.reply(respond.unknownTool('wire_money'), respond.invalidToolArguments('issue_refund'), respond.refusal());
  const recorded = await mod.recordTrajectory(createModel(), { task: TASK, tools: tools(), maxSteps: 5 });
  expect(recorded).toMatchObject({ status: 'refused', answer: null });
  expect(recorded.steps.filter((step: { type: string }) => step.type === 'tool')).toEqual([
    { type: 'tool', name: 'wire_money', arguments: {}, ok: false },
    { type: 'tool', name: 'issue_refund', arguments: null, ok: false },
  ]);
  expect(recorded.steps).toHaveLength(5);
});

test('evaluateTrajectory passes a clean run and reports its metrics', () => {
  const clean = trajectory([model(120, 30, 0.0012), tool('get_order', { orderId: 'A-1' }), model(180, 25, 0.0015), tool('issue_refund', { orderId: 'A-1', amount: 30 }), model(220, 10, 0.0013)]);
  const evaluation = mod.evaluateTrajectory(clean, SPEC);
  expect(evaluation.pass).toBe(true);
  expect(evaluation.violations).toEqual([]);
  expect(evaluation.metrics).toMatchObject({ modelCalls: 3, toolCalls: 2, inputTokens: 520, outputTokens: 65 });
  expect(evaluation.metrics.costUsd).toBeCloseTo(0.004, 9);
});

test('evaluateTrajectory reports missing required tools, every forbidden tool call with its step, and an unfinished run', () => {
  const evaluation = mod.evaluateTrajectory(
    trajectory([model(), tool('get_order', { orderId: 'A-1' }, false), model(), tool('delete_account', { userId: 'u1' }), model(), tool('delete_account', { userId: 'u2' }, false), model()], 'max_steps'),
    SPEC,
  );
  expect(evaluation.pass).toBe(false);
  expect(rules(evaluation)).toEqual(['forbidden_tool', 'forbidden_tool', 'missing_tool', 'missing_tool', 'not_done']);
  expect(evaluation.violations.filter((violation: { rule: string }) => violation.rule === 'forbidden_tool').map((violation: { step: number }) => violation.step)).toEqual([3, 5]);
  const missing = evaluation.violations.filter((violation: { rule: string }) => violation.rule === 'missing_tool').map((violation: { detail: string }) => violation.detail).join(' ');
  expect(missing).toContain('get_order');
  expect(missing).toContain('issue_refund');
  evaluation.violations.forEach((violation: { detail: string }) => expect(violation.detail.trim().length).toBeGreaterThan(0));
  expect(mod.evaluateTrajectory(trajectory([model()], 'max_steps'), { requireDone: false }).pass).toBe(true);
});

test('evaluateTrajectory enforces order constraints against the first successful call', () => {
  const refundFirst = mod.evaluateTrajectory(trajectory([model(), tool('issue_refund', { amount: 30 }), model(), tool('get_order'), model(), tool('issue_refund', { amount: 30 }), model()]), SPEC);
  expect(rules(refundFirst)).toEqual(['order']);
  expect(refundFirst.violations[0].step).toBe(1);

  const lookupFailed = mod.evaluateTrajectory(trajectory([model(), tool('get_order', {}, false), tool('issue_refund', { amount: 30 }), model(), tool('get_order'), model()]), SPEC);
  expect(rules(lookupFailed)).toEqual(['order']);
  expect(lookupFailed.violations[0].step).toBe(2);

  const inOrder = mod.evaluateTrajectory(trajectory([model(), tool('get_order'), tool('issue_refund', { amount: 30 }), tool('issue_refund', { amount: 5 }), model()]), SPEC);
  expect(inOrder.violations).toEqual([]);
});

test('evaluateTrajectory flags every forbidden call and every exceeded limit in one report', () => {
  const steps = [model(100, 20, 0.004), tool('get_order'), model(100, 20, 0.004), tool('issue_refund', { amount: 250 }), tool('issue_refund', { amount: 40 }), tool('issue_refund', { amount: 120 }), model(100, 20, 0.004), tool('get_order'), model(), model()];
  const evaluation = mod.evaluateTrajectory(trajectory(steps), SPEC);
  expect(rules(evaluation)).toEqual(['forbidden_call', 'forbidden_call', 'max_cost', 'max_model_calls', 'max_tool_calls']);
  expect(evaluation.violations.filter((violation: { rule: string }) => violation.rule === 'forbidden_call').map((violation: { step: number }) => violation.step)).toEqual([3, 5]);
  expect(evaluation.metrics).toMatchObject({ modelCalls: 5, toolCalls: 5 });
  expect(evaluation.metrics.costUsd).toBeCloseTo(0.014, 9);
  const relaxed = mod.evaluateTrajectory(trajectory(steps), { ...SPEC, forbiddenCalls: [], maxModelCalls: 5, maxToolCalls: 5, maxCostUsd: 0.015 });
  expect(relaxed.violations).toEqual([]);
});

test('across seeded agent runs, the evaluation flags exactly what each recorded trajectory did, and evaluateSuite aggregates it', async () => {
  const cases: Array<{ id: string; trajectory: { steps: Array<{ type: string; name?: string; arguments?: { amount?: number } | null }> }; spec: typeof SPEC }> = [];
  await forEachSeed(16, async (seed: number) => {
    fakeModel.handle((request: { messages: Array<{ role: string }> }) => {
      const toolResults = request.messages.filter((message) => message.role === 'tool').length;
      if (toolResults === 0) {
        return respond.oneOf([respond.toolCall('get_order', { orderId: 'A-1' }), respond.toolCall('issue_refund', { orderId: 'A-1', amount: 30 }), respond.toolCall('delete_account', { userId: 'u1' })]);
      }
      if (toolResults === 1) {
        return respond.oneOf([respond.toolCall('issue_refund', { orderId: 'A-1', amount: 30 }), respond.toolCall('issue_refund', { orderId: 'A-1', amount: 300 }), respond.toolCall('get_order', { orderId: 'A-1' })]);
      }
      return respond.text('Refund issued.');
    });
    const recorded = await mod.recordTrajectory(createModel(), { task: TASK, tools: tools(), maxSteps: 5 });
    const names = recorded.steps.filter((step: { type: string }) => step.type === 'tool').map((step: { name: string }) => step.name);
    const firstLookup = names.indexOf('get_order');
    const firstRefund = names.indexOf('issue_refund');
    const expected = [
      ...(firstLookup === -1 ? ['missing_tool'] : []),
      ...(firstRefund === -1 ? ['missing_tool'] : []),
      ...names.filter((name: string) => name === 'delete_account').map(() => 'forbidden_tool'),
      ...names.filter((name: string, index: number) => name === 'issue_refund' && (firstLookup === -1 || index < firstLookup)).map(() => 'order'),
      ...recorded.steps.filter((step: { name?: string; arguments?: { amount?: number } | null }) => step.name === 'issue_refund' && (step.arguments?.amount ?? 0) > 100).map(() => 'forbidden_call'),
    ].sort();
    expect(rules(mod.evaluateTrajectory(recorded, SPEC))).toEqual(expected);
    cases.push({ id: `seed-${seed}`, trajectory: recorded, spec: SPEC });
  });
  const report = mod.evaluateSuite(cases);
  const evaluations = cases.map((suiteCase) => mod.evaluateTrajectory(suiteCase.trajectory, suiteCase.spec));
  const passing = evaluations.filter((evaluation: { pass: boolean }) => evaluation.pass).length;
  expect(passing).toBeGreaterThan(0);
  expect(passing).toBeLessThan(cases.length);
  expect(report.results.map((result: { id: string; pass: boolean }) => [result.id, result.pass])).toEqual(cases.map((suiteCase, index) => [suiteCase.id, evaluations[index].pass]));
  expect(report.passRate).toBeCloseTo(passing / cases.length, 6);
  const counts: Record<string, number> = {};
  evaluations.flatMap((evaluation: { violations: Array<{ rule: string }> }) => evaluation.violations).forEach((violation: { rule: string }) => (counts[violation.rule] = (counts[violation.rule] ?? 0) + 1));
  expect(report.violationsByRule).toEqual(counts);
});
