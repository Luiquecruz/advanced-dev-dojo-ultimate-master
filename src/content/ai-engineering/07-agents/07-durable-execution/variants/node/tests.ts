const { createModel } = require('@dojo/ai');

function memoryStore() {
  const data = new Map<string, string>();
  const saves: any[] = [];
  return {
    data,
    saves,
    latest: (runId: string) => (data.has(runId) ? JSON.parse(data.get(runId)!) : undefined),
    async load(runId: string) {
      return data.has(runId) ? JSON.parse(data.get(runId)!) : undefined;
    },
    async save(checkpoint: any) {
      saves.push(JSON.parse(JSON.stringify(checkpoint)));
      data.set(checkpoint.runId, JSON.stringify(checkpoint));
    },
  };
}

function crashingStore(inner: ReturnType<typeof memoryStore>, shouldCrash: (checkpoint: any, saveNumber: number) => boolean) {
  let saveNumber = 0;
  return {
    load: (runId: string) => inner.load(runId),
    async save(checkpoint: any) {
      saveNumber += 1;
      if (shouldCrash(checkpoint, saveNumber)) {
        throw new Error('simulated crash: the process died');
      }
      await inner.save(checkpoint);
    },
  };
}

function paymentTools() {
  const ledger = new Map<string, number>();
  const charge = fn(({ amount }: { amount: number }, { idempotencyKey }: { idempotencyKey: string }) => {
    if (!ledger.has(idempotencyKey)) {
      ledger.set(idempotencyKey, amount);
    }
    return { charged: amount, receipt: `r-${ledger.size}` };
  });
  return { ledger, charge, tools: [{ name: 'charge_card', description: 'Charge the customer card', parameters: { type: 'object' }, execute: charge }] };
}

const toolCount = (request: { messages: Array<{ role: string }> }) => request.messages.filter((message) => message.role === 'tool').length;

function scriptThreeCharges() {
  fakeModel.handle((request: any) => (toolCount(request) < 3 ? respond.toolCall('charge_card', { amount: toolCount(request) + 1 }) : respond.text('Charged 1, 2 and 3.')));
}

test('createFileStore saves atomically under its directory, loads what it saved, returns undefined for an unknown run and rejects unsafe run ids', async () => {
  const store = mod.createFileStore('/tmp/runs');
  expect(await store.load('order-42')).toBeUndefined();
  const checkpoint = { runId: 'order-42', status: 'running', messages: [{ role: 'user', content: 'Charge it' }], steps: 0, answer: null };
  await store.save(checkpoint);
  expect(fs.existsSync('/tmp/runs/order-42.json')).toBe(true);
  expect(fs.readdirSync('/tmp/runs')).toEqual(['order-42.json']);
  expect(await store.load('order-42')).toEqual(checkpoint);
  await store.save({ ...checkpoint, steps: 3 });
  expect((await store.load('order-42')).steps).toBe(3);
  expect(fs.readdirSync('/tmp/runs')).toEqual(['order-42.json']);
  const unsafe = await captureError(store.save({ ...checkpoint, runId: '../../app/secrets' }));
  expect(unsafe).toBeInstanceOf(Error);
  expect(fs.existsSync('/app/secrets.json')).toBe(false);
});

test('checkpoints the start, every model response and every tool result, and saves the tool call before running it', async () => {
  const store = memoryStore();
  const { tools, charge } = paymentTools();
  const seenBeforeExecute: boolean[] = [];
  charge.mockImplementation((args: any, context: any) => {
    const saved = store.latest('order-1');
    const lastMessage = saved.messages[saved.messages.length - 1];
    seenBeforeExecute.push(lastMessage.role === 'assistant' && lastMessage.toolCalls.some((call: { id: string }) => context.idempotencyKey.endsWith(call.id)));
    return { charged: args.amount };
  });
  fakeModel.reply(respond.toolCall('charge_card', { amount: 30 }), respond.text('Charged $30.'));
  const result = await mod.runDurableAgent(createModel(), { runId: 'order-1', task: 'Charge $30', tools, store, maxSteps: 5 });
  expect(result).toEqual({ status: 'done', answer: 'Charged $30.', steps: 2, resumed: false });
  expect(seenBeforeExecute).toEqual([true]);
  expect(store.saves.length).toBeGreaterThanOrEqual(4);
  expect(store.saves[0].messages).toEqual([{ role: 'user', content: 'Charge $30' }]);
  expect(store.latest('order-1')).toEqual(expect.objectContaining({ status: 'done', answer: 'Charged $30.', steps: 2 }));
  expect(charge.mock.calls[0][1]).toEqual({ idempotencyKey: `order-1:${fakeModel.responses[0].toolCalls[0].id}` });
});

test('after a crash during a model call, resuming continues from the checkpoint without repeating the completed charge', async () => {
  const store = memoryStore();
  const { tools, charge, ledger } = paymentTools();
  fakeModel.reply(respond.toolCall('charge_card', { amount: 30 }), respond.error(500));
  const crash = await captureError(mod.runDurableAgent(createModel(), { runId: 'order-2', task: 'Charge $30', tools, store, maxSteps: 5 }));
  expect(crash).toBeInstanceOf(Error);
  expect(charge).toHaveBeenCalledTimes(1);

  fakeModel.reply(respond.text('Charged $30.'));
  const result = await mod.runDurableAgent(createModel(), { runId: 'order-2', task: 'Charge $30', tools, store, maxSteps: 5 });
  expect(result).toEqual({ status: 'done', answer: 'Charged $30.', steps: 2, resumed: true });
  expect(charge).toHaveBeenCalledTimes(1);
  expect([...ledger.values()]).toEqual([30]);
  expect(toolCount(fakeModel.requests[2])).toBe(1);
});

test('a crash after the side effect but before its checkpoint re-runs the call with the same idempotency key, so the card is charged once', async () => {
  const inner = memoryStore();
  const { tools, charge, ledger } = paymentTools();
  let crashed = false;
  const flaky = crashingStore(inner, (checkpoint) => {
    if (!crashed && checkpoint.messages.some((message: { role: string }) => message.role === 'tool')) {
      crashed = true;
      return true;
    }
    return false;
  });
  fakeModel.reply(respond.toolCall('charge_card', { amount: 75 }), respond.text('Charged $75.'));
  expect(await captureError(mod.runDurableAgent(createModel(), { runId: 'order-3', task: 'Charge $75', tools, store: flaky, maxSteps: 5 }))).toBeInstanceOf(Error);
  const result = await mod.runDurableAgent(createModel(), { runId: 'order-3', task: 'Charge $75', tools, store: flaky, maxSteps: 5 });
  expect(result.status).toBe('done');
  expect(result.resumed).toBe(true);
  expect(charge).toHaveBeenCalledTimes(2);
  const keys = charge.mock.calls.map((call: any[]) => call[1].idempotencyKey);
  expect(keys[0]).toBe(keys[1]);
  expect(keys[0]).toBe(`order-3:${fakeModel.responses[0].toolCalls[0].id}`);
  expect([...ledger.values()]).toEqual([75]);
  expect(fakeModel.requests).toHaveLength(2);
});

test('a finished run returns its stored answer without calling the model, and another run id starts fresh', async () => {
  const store = memoryStore();
  const { tools } = paymentTools();
  fakeModel.reply(respond.text('Nothing to charge.'));
  await mod.runDurableAgent(createModel(), { runId: 'order-4', task: 'Check order 4', tools, store, maxSteps: 5 });
  const again = await mod.runDurableAgent(createModel(), { runId: 'order-4', task: 'Check order 4', tools, store, maxSteps: 5 });
  expect(again).toEqual({ status: 'done', answer: 'Nothing to charge.', steps: 1, resumed: true });
  expect(fakeModel.requests).toHaveLength(1);

  fakeModel.reply(respond.text('Order 5 needs no charge.'));
  const other = await mod.runDurableAgent(createModel(), { runId: 'order-5', task: 'Check order 5', tools, store, maxSteps: 5 });
  expect(other).toEqual({ status: 'done', answer: 'Order 5 needs no charge.', steps: 1, resumed: false });
  expect(fakeModel.requests[1].messages).toEqual([{ role: 'user', content: 'Check order 5' }]);
});

test('works with the file store across separate runs, as after a process restart', async () => {
  const { tools, ledger } = paymentTools();
  scriptThreeCharges();
  let crashed = false;
  const fileStore = mod.createFileStore('/app/checkpoints');
  const flaky = {
    load: (runId: string) => fileStore.load(runId),
    async save(checkpoint: any) {
      if (!crashed && checkpoint.steps === 2) {
        crashed = true;
        throw new Error('simulated crash');
      }
      await fileStore.save(checkpoint);
    },
  };
  expect(await captureError(mod.runDurableAgent(createModel(), { runId: 'invoice-9', task: 'Charge 1, 2, 3', tools, store: flaky, maxSteps: 10 }))).toBeInstanceOf(Error);
  const restarted = await mod.runDurableAgent(createModel(), { runId: 'invoice-9', task: 'Charge 1, 2, 3', tools, store: mod.createFileStore('/app/checkpoints'), maxSteps: 10 });
  expect(restarted.status).toBe('done');
  expect(restarted.resumed).toBe(true);
  expect([...ledger.values()]).toEqual([1, 2, 3]);
  expect(JSON.parse(fs.readFileSync('/app/checkpoints/invoice-9.json', 'utf8')).status).toBe('done');
});

test('across seeds, crashing at any save and resuming until done charges each amount exactly once', async () => {
  await forEachSeed(16, async (seed: number) => {
    const inner = memoryStore();
    const { tools, ledger, charge } = paymentTools();
    scriptThreeCharges();
    let crashes = 0;
    let attempt = 0;
    while (true) {
      attempt += 1;
      const crashAt = attempt <= 3 ? ((seed * 7 + attempt * 3) % 6) + 1 : Infinity;
      const store = crashingStore(inner, (_checkpoint, saveNumber) => saveNumber === crashAt);
      try {
        const result = await mod.runDurableAgent(createModel(), { runId: `run-${seed}`, task: 'Charge 1, 2, 3', tools, store, maxSteps: 10 });
        expect(result.status).toBe('done');
        break;
      } catch (error) {
        expect((error as Error).message).toContain('simulated crash');
        crashes += 1;
      }
      expect(attempt).toBeLessThan(10);
    }
    expect([...ledger.values()].sort()).toEqual([1, 2, 3]);
    expect(charge.mock.calls.length).toBeLessThanOrEqual(3 + crashes);
    expect(inner.latest(`run-${seed}`).status).toBe('done');
  });
});
