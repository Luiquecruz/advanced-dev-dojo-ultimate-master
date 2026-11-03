const { createModel } = require('@dojo/ai');

function bankTools() {
  const lookup = fn(({ accountId }: { accountId: string }) => ({ accountId, balance: 1200 }));
  const transfer = fn(({ to, amount }: { to: string; amount: number }) => ({ transferred: amount, to }));
  const close = fn(({ accountId }: { accountId: string }) => `account ${accountId} closed`);
  return {
    lookup,
    transfer,
    close,
    tools: [
      { name: 'lookup_account', description: 'Read an account balance', parameters: { type: 'object' }, execute: lookup },
      { name: 'transfer_money', description: 'Transfer money', parameters: { type: 'object' }, execute: transfer, requiresApproval: (args: { amount: number }) => args.amount > 100 },
      { name: 'close_account', description: 'Close an account', parameters: { type: 'object' }, execute: close, requiresApproval: true },
    ],
  };
}

const roundTrip = (value: unknown) => JSON.parse(JSON.stringify(value));

function isPlainJson(value: unknown): boolean {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(isPlainJson);
  if (typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
    return Object.values(value as object).every((entry) => entry !== undefined && isPlainJson(entry));
  }
  return false;
}

const toolMessages = (messages: Array<{ role: string }>) => messages.filter((message) => message.role === 'tool') as Array<{ toolCallId: string; content: string }>;

const options = (tools: unknown[]) => ({ tools, maxSteps: 8 });

test('safe tools and calls below an approval threshold run without interrupting', async () => {
  const { tools, lookup, transfer } = bankTools();
  fakeModel.reply(
    respond.toolCalls([
      { name: 'lookup_account', arguments: { accountId: 'acc-1' } },
      { name: 'transfer_money', arguments: { to: 'acc-2', amount: 50 } },
    ]),
    respond.text('Done: 50 transferred.'),
  );
  const run = await mod.startAgent(createModel(), { task: 'Send 50 to acc-2', ...options(tools) });
  expect(run.status).toBe('done');
  expect(run.answer).toBe('Done: 50 transferred.');
  expect(lookup).toHaveBeenCalledTimes(1);
  expect(transfer).toHaveBeenCalledWith({ to: 'acc-2', amount: 50 });
  expect(run.state.pending).toEqual([]);
});

test('a risky call interrupts before running and returns the pending call and a plain JSON state', async () => {
  const { tools, close } = bankTools();
  fakeModel.reply(respond.toolCall('close_account', { accountId: 'acc-9' }), respond.text('should not be requested yet'));
  const run = await mod.startAgent(createModel(), { task: 'Close acc-9', ...options(tools) });
  const callId = fakeModel.responses[0].toolCalls[0].id;
  expect(run.status).toBe('interrupted');
  expect(run.pending).toEqual([{ toolCallId: callId, name: 'close_account', arguments: { accountId: 'acc-9' } }]);
  expect(run.state.pending).toEqual(run.pending);
  expect(close).not.toHaveBeenCalled();
  expect(fakeModel.requests).toHaveLength(1);
  expect(isPlainJson(run.state)).toBe(true);
  expect(roundTrip(run.state)).toEqual(run.state);
});

test('approve after a JSON round trip runs the call once with its original arguments and continues the loop', async () => {
  const first = bankTools();
  fakeModel.reply(respond.toolCall('close_account', { accountId: 'acc-9' }), respond.text('acc-9 is closed.'));
  const interrupted = await mod.startAgent(createModel(), { task: 'Close acc-9', ...options(first.tools) });
  const saved = JSON.stringify(interrupted.state);
  const callId = interrupted.pending[0].toolCallId;

  const restarted = bankTools();
  const run = await mod.resumeAgent(createModel(), options(restarted.tools), JSON.parse(saved), { [callId]: { type: 'approve' } });
  expect(first.close).not.toHaveBeenCalled();
  expect(restarted.close).toHaveBeenCalledTimes(1);
  expect(restarted.close).toHaveBeenCalledWith({ accountId: 'acc-9' });
  expect(run.status).toBe('done');
  expect(run.answer).toBe('acc-9 is closed.');
  expect(toolMessages(fakeModel.requests[1].messages)).toEqual([{ role: 'tool', toolCallId: callId, content: 'account acc-9 closed' }]);
  expect(run.state.pending).toEqual([]);
});

test('deny never runs the tool and tells the model it was denied, with the reason', async () => {
  const { tools, transfer } = bankTools();
  fakeModel.reply(respond.toolCall('transfer_money', { to: 'acc-666', amount: 5000 }), respond.text('The transfer was not approved.'));
  const interrupted = await mod.startAgent(createModel(), { task: 'Send 5000 to acc-666', ...options(tools) });
  const callId = interrupted.pending[0].toolCallId;
  const run = await mod.resumeAgent(createModel(), options(tools), roundTrip(interrupted.state), { [callId]: { type: 'deny', reason: 'Recipient is not on the allowlist' } });
  expect(transfer).not.toHaveBeenCalled();
  const [result] = toolMessages(fakeModel.requests[1].messages);
  expect(result.toolCallId).toBe(callId);
  expect(result.content).toMatch(/^Denied/);
  expect(result.content).toContain('Recipient is not on the allowlist');
  expect(run.status).toBe('done');
});

test('edit runs the tool with the human arguments only, and the model sees the result', async () => {
  const { tools, transfer } = bankTools();
  fakeModel.reply(respond.toolCall('transfer_money', { to: 'acc-2', amount: 5000 }), respond.text('Transferred 500.'));
  const interrupted = await mod.startAgent(createModel(), { task: 'Send money to acc-2', ...options(tools) });
  const callId = interrupted.pending[0].toolCallId;
  await mod.resumeAgent(createModel(), options(tools), roundTrip(interrupted.state), { [callId]: { type: 'edit', arguments: { to: 'acc-2', amount: 500 } } });
  expect(transfer).toHaveBeenCalledTimes(1);
  expect(transfer).toHaveBeenCalledWith({ to: 'acc-2', amount: 500 });
  const [result] = toolMessages(fakeModel.requests[1].messages);
  expect(result.toolCallId).toBe(callId);
  expect(result.content).toContain(JSON.stringify({ transferred: 500, to: 'acc-2' }));
});

test('in a mixed batch the safe call runs at once, the risky one waits, and after resuming every call id has exactly one result', async () => {
  const { tools, lookup, close } = bankTools();
  fakeModel.reply(
    respond.toolCalls([
      { name: 'lookup_account', arguments: { accountId: 'acc-3' } },
      { name: 'close_account', arguments: { accountId: 'acc-3' } },
    ]),
    respond.text('Balance read and account closed.'),
  );
  const interrupted = await mod.startAgent(createModel(), { task: 'Read and close acc-3', ...options(tools) });
  expect(interrupted.status).toBe('interrupted');
  expect(lookup).toHaveBeenCalledTimes(1);
  expect(close).not.toHaveBeenCalled();
  expect(interrupted.pending.map((pending: { name: string }) => pending.name)).toEqual(['close_account']);
  const ids = fakeModel.responses[0].toolCalls.map((call: { id: string }) => call.id);
  await mod.resumeAgent(createModel(), options(tools), roundTrip(interrupted.state), { [interrupted.pending[0].toolCallId]: { type: 'approve' } });
  expect(lookup).toHaveBeenCalledTimes(1);
  expect(close).toHaveBeenCalledTimes(1);
  expect(toolMessages(fakeModel.requests[1].messages).map((message) => message.toolCallId)).toEqual(ids);
});

test('resuming without a decision for every pending call throws and runs nothing', async () => {
  const { tools, close, transfer } = bankTools();
  fakeModel.reply(
    respond.toolCalls([
      { name: 'close_account', arguments: { accountId: 'acc-4' } },
      { name: 'transfer_money', arguments: { to: 'acc-5', amount: 900 } },
    ]),
  );
  const interrupted = await mod.startAgent(createModel(), { task: 'Move funds and close acc-4', ...options(tools) });
  expect(interrupted.pending).toHaveLength(2);
  const error = await captureError(mod.resumeAgent(createModel(), options(tools), roundTrip(interrupted.state), { [interrupted.pending[0].toolCallId]: { type: 'approve' } }));
  expect(error).toBeInstanceOf(Error);
  expect(close).not.toHaveBeenCalled();
  expect(transfer).not.toHaveBeenCalled();
  expect(fakeModel.requests).toHaveLength(1);
});

test('across seeds, a risky tool runs only when a human approved or edited it, and every call gets exactly one result', async () => {
  await forEachSeed(20, async () => {
    const { tools, transfer, close } = bankTools();
    fakeModel.handle((request: any) =>
      toolMessages(request.messages).length >= 4
        ? respond.text('All done.')
        : respond.oneOf([
            respond.toolCall('lookup_account', { accountId: 'acc-1' }),
            respond.toolCall('transfer_money', { to: 'acc-2', amount: 50 }),
            respond.toolCall('transfer_money', { to: 'acc-2', amount: 700 }),
            respond.toolCall('close_account', { accountId: 'acc-1' }),
          ]),
    );
    const kinds = ['approve', 'deny', 'edit'];
    let decided = 0;
    let allowedRisky = 0;
    let run = await mod.startAgent(createModel(), { task: 'Tidy up the accounts', tools, maxSteps: 12 });
    while (run.status === 'interrupted') {
      const decisions: Record<string, unknown> = {};
      for (const pending of run.pending) {
        const kind = kinds[decided++ % kinds.length];
        decisions[pending.toolCallId] = kind === 'edit' ? { type: 'edit', arguments: pending.arguments } : { type: kind };
        if (kind !== 'deny') allowedRisky += 1;
      }
      run = await mod.resumeAgent(createModel(), { tools, maxSteps: 12 }, roundTrip(run.state), decisions);
    }
    const riskyRuns = close.mock.calls.length + transfer.mock.calls.filter(([args]: [{ amount: number }]) => args.amount > 100).length;
    expect(riskyRuns).toBe(allowedRisky);
    const callIds = run.state.messages.flatMap((message: any) => (message.toolCalls ?? []).map((call: { id: string }) => call.id));
    const resultIds = toolMessages(run.state.messages).map((message) => message.toolCallId);
    expect([...resultIds].sort()).toEqual([...callIds].sort());
    expect(run.status).toBe('done');
  });
});
