const { createModel } = require('@dojo/ai');

const QUESTION = 'Compare the vector databases Nimbus, Quill and Rook on pricing, hosting and filtering.';
const PLAN = {
  subtasks: [
    { id: 'nimbus', instruction: 'Research Nimbus: pricing, hosting and filtering.' },
    { id: 'quill', instruction: 'Research Quill: pricing, hosting and filtering.' },
    { id: 'rook', instruction: 'Research Rook: pricing, hosting and filtering.' },
  ],
};

type Request = { messages: Array<{ role: string; content: string }>; responseFormat?: { type: string } };

const systemOf = (request: Request) => request.messages.find((message) => message.role === 'system')?.content;
const userOf = (request: Request) => request.messages.find((message) => message.role === 'user')?.content ?? '';
const requestsWith = (system: string) => fakeModel.requests.filter((request: Request) => systemOf(request) === system);

function scriptRoles(options: { plan?: (callIndex: number) => unknown; worker?: (instruction: string) => unknown } = {}) {
  let planCalls = 0;
  fakeModel.handle((request: Request) => {
    const system = systemOf(request);
    if (system === mod.PLANNER_SYSTEM) {
      planCalls += 1;
      return options.plan ? options.plan(planCalls) : respond.json(PLAN);
    }
    if (system === mod.WORKER_SYSTEM) {
      const instruction = userOf(request);
      return options.worker ? options.worker(instruction) : respond.text(`Findings for: ${instruction}`);
    }
    return respond.text('Synthesized comparison of the findings.');
  });
}

function sumUsage() {
  return fakeModel.responses.reduce(
    (totals: { inputTokens: number; outputTokens: number; cost: number }, response: { usage: { inputTokens: number; outputTokens: number; cost: number } }) => ({
      inputTokens: totals.inputTokens + response.usage.inputTokens,
      outputTokens: totals.outputTokens + response.usage.outputTokens,
      cost: totals.cost + response.usage.cost,
    }),
    { inputTokens: 0, outputTokens: 0, cost: 0 },
  );
}

const options = (extra: Record<string, unknown> = {}) => ({ model: createModel(), maxSubtasks: 5, concurrency: 2, maxPlanAttempts: 2, ...extra });

test('parsePlan reads plain, fenced and prose-wrapped plans, keeps at most maxSubtasks and rejects invalid shapes', () => {
  const json = JSON.stringify(PLAN);
  expect(mod.parsePlan(json, 5)).toEqual(PLAN.subtasks);
  expect(mod.parsePlan(`Here is the plan:\n\`\`\`json\n${json}\n\`\`\``, 5)).toEqual(PLAN.subtasks);
  expect(mod.parsePlan(json, 2)).toEqual(PLAN.subtasks.slice(0, 2));
  [
    '',
    'no plan today',
    json.slice(0, 40),
    json.replace(/}$/, ',}'),
    json.replace(/"/g, "'"),
    '{"subtasks": []}',
    '{"tasks": [{"id": "a", "instruction": "x"}]}',
    '{"subtasks": [{"id": "a"}]}',
    '{"subtasks": [{"id": "a", "instruction": "  "}]}',
    '{"subtasks": [{"id": 1, "instruction": "x"}]}',
    '{"subtasks": [{"id": "a", "instruction": "x"}, {"id": "a", "instruction": "y"}]}',
  ].forEach((text) => expect(mod.parsePlan(text, 5)).toBe(null));
});

test('runWithConcurrency keeps input order and never runs more than the limit at once', async () => {
  let active = 0;
  let peak = 0;
  const delays = [12, 2, 8, 1, 6, 3, 1];
  const results = await mod.runWithConcurrency(delays, 3, async (delay: number, index: number) => {
    active += 1;
    peak = Math.max(peak, active);
    await sleep(delay);
    active -= 1;
    return `item-${index}`;
  });
  expect(results).toEqual(delays.map((_, index) => `item-${index}`));
  expect(peak).toBe(3);
  peak = 0;
  expect(await mod.runWithConcurrency([1, 2], 10, async (delay: number) => {
    active += 1;
    peak = Math.max(peak, active);
    await sleep(delay);
    active -= 1;
    return delay * 2;
  })).toEqual([2, 4]);
  expect(peak).toBe(2);
  expect(await mod.runWithConcurrency([], 3, async () => 1)).toEqual([]);
});

test('plans with a JSON request, runs one worker per subtask and synthesizes every finding', async () => {
  scriptRoles();
  const result = await mod.orchestrate(QUESTION, options());
  expect(result.plan).toEqual(PLAN.subtasks);
  expect(result.answer).toBe('Synthesized comparison of the findings.');
  expect(result.results).toEqual(
    PLAN.subtasks.map((subtask) => ({ id: subtask.id, status: 'ok', output: `Findings for: ${subtask.instruction}`, error: null })),
  );
  const [planner] = requestsWith(mod.PLANNER_SYSTEM);
  expect(planner.responseFormat).toEqual({ type: 'json' });
  expect(userOf(planner)).toContain(QUESTION);
  expect(userOf(planner)).toContain('5');
  const workers = requestsWith(mod.WORKER_SYSTEM);
  expect(workers.map((request: Request) => request.messages)).toEqual(
    PLAN.subtasks.map((subtask) => [
      { role: 'system', content: mod.WORKER_SYSTEM },
      { role: 'user', content: subtask.instruction },
    ]),
  );
  const synthesis = requestsWith(mod.SYNTHESIZER_SYSTEM);
  expect(synthesis).toHaveLength(1);
  const synthesisInput = userOf(synthesis[0]);
  expect(synthesisInput).toContain(QUESTION);
  PLAN.subtasks.forEach((subtask) => expect(synthesisInput).toContain(`Findings for: ${subtask.instruction}`));
  expect(fakeModel.requests).toHaveLength(5);
});

test('runs workers in parallel without exceeding the concurrency limit', async () => {
  const subtasks = Array.from({ length: 6 }, (_, index) => ({ id: `vendor-${index + 1}`, instruction: `Research vendor ${index + 1}.` }));
  scriptRoles({ plan: () => respond.json({ subtasks }), worker: (instruction) => respond.slow(8, respond.text(`Findings for: ${instruction}`)) });
  const model = createModel();
  let active = 0;
  let peak = 0;
  const countingModel = {
    async generate(request: Request) {
      const isWorker = systemOf(request) === mod.WORKER_SYSTEM;
      if (isWorker) {
        active += 1;
        peak = Math.max(peak, active);
      }
      try {
        return await model.generate(request);
      } finally {
        if (isWorker) active -= 1;
      }
    },
  };
  const result = await mod.orchestrate(QUESTION, options({ model: countingModel, maxSubtasks: 6, concurrency: 3 }));
  expect(peak).toBe(3);
  expect(result.results.map((worker: { id: string }) => worker.id)).toEqual(subtasks.map((subtask) => subtask.id));
  expect(result.results.every((worker: { status: string }) => worker.status === 'ok')).toBe(true);
});

test('a failed worker does not sink the run, and a run where every worker fails returns no answer without synthesis', async () => {
  scriptRoles({
    worker: (instruction) => {
      if (instruction.includes('Quill')) return respond.error(503);
      if (instruction.includes('Rook')) return respond.refusal();
      return respond.text(`Findings for: ${instruction}`);
    },
  });
  const result = await mod.orchestrate(QUESTION, options());
  expect(result.results.map((worker: { id: string; status: string; error: string | null }) => [worker.id, worker.status, worker.error])).toEqual([
    ['nimbus', 'ok', null],
    ['quill', 'failed', 'overloaded'],
    ['rook', 'failed', 'refusal'],
  ]);
  expect(result.results[1].output).toBe(null);
  expect(result.answer).toBe('Synthesized comparison of the findings.');
  const synthesisInput = userOf(requestsWith(mod.SYNTHESIZER_SYSTEM)[0]);
  expect(synthesisInput).toContain('Findings for: Research Nimbus');
  expect(synthesisInput).toContain('quill');
  expect(synthesisInput).toContain('rook');

  fakeModel.reset();
  scriptRoles({ worker: () => respond.oneOf([respond.error(500), respond.truncated('Partial findings about the vendor', 0.3)]) });
  const failed = await mod.orchestrate(QUESTION, options());
  expect(failed.answer).toBe(null);
  expect(failed.results.every((worker: { status: string }) => worker.status === 'failed')).toBe(true);
  expect(requestsWith(mod.SYNTHESIZER_SYSTEM)).toHaveLength(0);
});

test('survives malformed plans by re-planning, and falls back to one subtask when every attempt fails', async () => {
  await forEachSeed(20, async () => {
    scriptRoles({ plan: (call) => (call === 1 ? respond.malformedJson(PLAN) : respond.json(PLAN)) });
    const result = await mod.orchestrate(QUESTION, options());
    expect(result.plan).toEqual(PLAN.subtasks);
    expect(requestsWith(mod.PLANNER_SYSTEM).length).toBeLessThanOrEqual(2);
    expect(requestsWith(mod.WORKER_SYSTEM)).toHaveLength(3);
  });

  fakeModel.reset();
  scriptRoles({ plan: (call) => (call === 1 ? respond.error(500) : respond.text('I would split this by vendor.')) });
  const fallback = await mod.orchestrate(QUESTION, options({ maxPlanAttempts: 2 }));
  expect(requestsWith(mod.PLANNER_SYSTEM)).toHaveLength(2);
  expect(fallback.plan).toEqual([{ id: 'task-1', instruction: QUESTION }]);
  expect(userOf(requestsWith(mod.WORKER_SYSTEM)[0])).toBe(QUESTION);
  expect(fallback.answer).toBe('Synthesized comparison of the findings.');
});

test('accounts usage and cost from every response of every role, across seeds', async () => {
  await forEachSeed(15, async () => {
    fakeModel.configure({ pricing: { inputPerMillion: 3, outputPerMillion: 15 } });
    scriptRoles({
      plan: () => respond.oneOf([respond.json(PLAN), respond.malformedJson(PLAN), respond.error(429, { retryAfterMs: 1 })]),
      worker: (instruction) => respond.oneOf([respond.text([`Findings for: ${instruction}`, `Notes on ${instruction}`]), respond.error(500), respond.refusal()]),
    });
    const result = await mod.orchestrate(QUESTION, options({ maxPlanAttempts: 3 }));
    const totals = sumUsage();
    expect(result.usage.calls).toBe(fakeModel.responses.length);
    expect(result.usage.inputTokens).toBe(totals.inputTokens);
    expect(result.usage.outputTokens).toBe(totals.outputTokens);
    expect(result.usage.cost).toBeCloseTo(totals.cost, 12);
    expect(result.results).toHaveLength(result.plan.length);
    expect(requestsWith(mod.SYNTHESIZER_SYSTEM)).toHaveLength(result.answer === null ? 0 : 1);
  });
});
