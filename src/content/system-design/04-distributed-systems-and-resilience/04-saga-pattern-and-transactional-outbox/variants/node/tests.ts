function recordingStep(name: string, log: string[], fails = false, compensationFails = false) {
  return {
    name,
    action: (context: { orderId: string }) => {
      log.push(`do ${name} ${context.orderId}`);
      if (fails) {
        throw new Error(`${name} failed`);
      }
    },
    compensate: async (context: { orderId: string }) => {
      log.push(`undo ${name} ${context.orderId}`);
      if (compensationFails) {
        throw new Error(`undo ${name} failed`);
      }
    },
  };
}

test('the saga runs every action in order with the context and reports completed', async () => {
  const log: string[] = [];
  const result = await mod.runSaga([recordingStep('order', log), recordingStep('payment', log), recordingStep('inventory', log)], { orderId: 'o-1' });
  expect(log).toEqual(['do order o-1', 'do payment o-1', 'do inventory o-1']);
  expect(result.status).toBe('completed');
  expect(result.completed).toEqual(['order', 'payment', 'inventory']);
  expect(result.compensated).toEqual([]);
  expect(result.failedCompensations).toEqual([]);
  expect(result.failedStep).toBeUndefined();
});

// beginner mistake: compensating in forward order, compensating the failed step or running the steps after it
test('a failing step stops the saga and compensates only the completed steps, in reverse order', async () => {
  const log: string[] = [];
  const steps = [recordingStep('order', log), recordingStep('payment', log), recordingStep('inventory', log, true), recordingStep('shipping', log)];
  const result = await mod.runSaga(steps, { orderId: 'o-2' });
  expect(log).toEqual(['do order o-2', 'do payment o-2', 'do inventory o-2', 'undo payment o-2', 'undo order o-2']);
  expect(result.status).toBe('compensated');
  expect(result.failedStep).toBe('inventory');
  expect(result.completed).toEqual(['order', 'payment']);
  expect(result.compensated).toEqual(['payment', 'order']);
  expect(result.failedCompensations).toEqual([]);
});

test('a failing compensation is reported and the remaining compensations still run', async () => {
  const log: string[] = [];
  const steps = [recordingStep('order', log), recordingStep('payment', log, false, true), recordingStep('inventory', log), recordingStep('shipping', log, true)];
  const result = await mod.runSaga(steps, { orderId: 'o-3' });
  expect(log.slice(4)).toEqual(['undo inventory o-3', 'undo payment o-3', 'undo order o-3']);
  expect(result.status).toBe('compensated');
  expect(result.compensated).toEqual(['inventory', 'order']);
  expect(result.failedCompensations).toEqual(['payment']);
});

test('the idempotent handler returns the stored result for a repeated key without running the handler again', async () => {
  let charges = 0;
  const handler = fn(async (amount: number) => ({ chargeId: `ch-${++charges}`, amount }));
  const charge = mod.createIdempotentHandler(handler);
  const first = await charge('key-1', 40);
  expect(await charge('key-1', 40)).toEqual(first);
  expect(handler).toHaveBeenCalledTimes(1);
  expect(await charge('key-2', 40)).toEqual({ chargeId: 'ch-2', amount: 40 });
  expect(handler).toHaveBeenCalledTimes(2);
});

test('concurrent retries share one execution and a failed attempt is not stored', async () => {
  const pending: Array<(value: string) => void> = [];
  const handler = fn(() => new Promise<string>((resolve) => { pending.push(resolve); }));
  const charge = mod.createIdempotentHandler(handler);
  const first = charge('key-1', 'request');
  const retry = charge('key-1', 'request');
  await sleep(0);
  pending.forEach((resolve) => resolve('done'));
  expect(await Promise.all([first, retry])).toEqual(['done', 'done']);
  expect(handler).toHaveBeenCalledTimes(1);

  const flaky = fn().mockRejectedValueOnce(new Error('timeout')).mockResolvedValue('ok');
  const send = mod.createIdempotentHandler(flaky);
  const error = await captureError(send('key-9', 'request'));
  expect(error.message).toBe('timeout');
  expect(await send('key-9', 'request')).toBe('ok');
  expect(flaky).toHaveBeenCalledTimes(2);
});
