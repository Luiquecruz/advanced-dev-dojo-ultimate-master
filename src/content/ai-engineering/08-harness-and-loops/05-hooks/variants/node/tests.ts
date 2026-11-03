const { createModel } = require('@dojo/ai');

const bash = (command: string, extra: Record<string, unknown> = {}) => ({ name: 'Bash', arguments: { command, ...extra } });

function recordingHook(name: string, matcher: string, log: string[], result: unknown = { action: 'continue' }) {
  return { name, matcher, run: (call: { name: string }) => (log.push(`${name}:${call.name}`), result) };
}

test('pre-tool hooks run in order, see earlier rewrites, and the tool runs once with the final arguments', async () => {
  const seen: unknown[] = [];
  const runner = mod.createHookRunner({
    pre: [
      { name: 'add-cwd', matcher: 'Bash', run: (call: { arguments: Record<string, unknown> }) => ({ action: 'rewrite', arguments: { ...call.arguments, cwd: '/workspace' } }) },
      { name: 'observe', matcher: '*', run: (call: { arguments: Record<string, unknown> }) => (seen.push(call.arguments), { action: 'continue' }) },
      mod.capTimeout(30000),
    ],
  });
  const execute = fn(async () => 'ok');
  const result = await runner.run(bash('npm test', { timeoutMs: 120000 }), execute);
  expect(result).toEqual({ status: 'ok', output: 'ok', arguments: { command: 'npm test', timeoutMs: 30000, cwd: '/workspace' } });
  expect(seen).toEqual([{ command: 'npm test', timeoutMs: 120000, cwd: '/workspace' }]);
  expect(execute).toHaveBeenCalledTimes(1);
  expect(execute).toHaveBeenCalledWith({ name: 'Bash', arguments: { command: 'npm test', timeoutMs: 30000, cwd: '/workspace' } });
});

test('matchers select tools by name, list or wildcard, and the first block stops later hooks and the tool', async () => {
  const log: string[] = [];
  const runner = mod.createHookRunner({
    pre: [
      recordingHook('only-edit', 'Edit|Write', log),
      recordingHook('every-tool', '*', log),
      recordingHook('stop', 'Bash', log, { action: 'block', reason: 'not today' }),
      recordingHook('after-stop', '*', log),
    ],
    post: [recordingHook('post', '*', log)],
  });
  const execute = fn(async () => 'should not run');
  expect(await runner.run(bash('ls'), execute)).toEqual({ status: 'blocked', hook: 'stop', reason: 'not today' });
  expect(log).toEqual(['every-tool:Bash', 'stop:Bash']);
  expect(execute).not.toHaveBeenCalled();

  log.length = 0;
  expect(await runner.run({ name: 'Write', arguments: { path: 'a.md' } }, async () => 'written')).toEqual({ status: 'ok', output: 'written', arguments: { path: 'a.md' } });
  expect(log).toEqual(['only-edit:Write', 'every-tool:Write', 'after-stop:Write', 'post:Write']);
});

test('post-tool hooks run in order on the output: redaction before audit keeps secrets out of the audit log', async () => {
  const audit: Array<{ tool: string; output: string }> = [];
  const auditHook = { name: 'audit', matcher: '*', run: (call: { name: string }, output: string) => (audit.push({ tool: call.name, output }), { action: 'continue' }) };
  const runner = mod.createHookRunner({ post: [mod.redactSecrets(), auditHook] });
  const leaked = 'OPENAI_KEY=sk-proj_abcdefghijklmnop1234 AWS=AKIAABCDEFGHIJKLMNOP token ghp_' + 'a'.repeat(36) + '\n-----BEGIN RSA PRIVATE KEY-----\nMIIE\n-----END RSA PRIVATE KEY-----\nbuild ok';
  const result = await runner.run(bash('cat .env.example'), async () => leaked);
  expect(result.status).toBe('ok');
  expect(result.output).not.toMatch(/sk-proj|AKIA|ghp_|MIIE/);
  expect(result.output.match(/\[REDACTED\]/g)).toHaveLength(4);
  expect(result.output).toMatch(/build ok$/);
  expect(audit).toEqual([{ tool: 'Bash', output: result.output }]);

  const appended = mod.createHookRunner({
    post: [
      { name: 'first', matcher: '*', run: (_: unknown, output: string) => ({ action: 'replace', output: `${output} +first` }) },
      { name: 'second', matcher: '*', run: async (_: unknown, output: string) => ({ action: 'replace', output: `${output} +second` }) },
    ],
  });
  expect((await appended.run(bash('echo hi'), () => 'hi')).output).toBe('hi +first +second');
});

test('a hook that throws, rejects, times out or returns nonsense fails closed', async () => {
  const broken = [
    { name: 'throws', matcher: '*', run: () => { throw new Error('policy service down'); } },
    { name: 'rejects', matcher: '*', run: async () => { throw new Error('network error'); } },
    { name: 'hangs', matcher: '*', run: () => new Promise(() => {}) },
    { name: 'nonsense', matcher: '*', run: () => ({ action: 'allow-everything' }) },
    { name: 'empty', matcher: '*', run: () => undefined },
  ];
  for (const hook of broken) {
    const execute = fn(async () => 'ran');
    const result = await mod.createHookRunner({ pre: [hook], timeoutMs: 20 }).run(bash('ls'), execute);
    expect(result.status).toBe('blocked');
    expect(result.hook).toBe(hook.name);
    expect(typeof result.reason).toBe('string');
    expect(execute).not.toHaveBeenCalled();
  }
  for (const hook of broken) {
    const result = await mod.createHookRunner({ post: [hook], timeoutMs: 20 }).run(bash('cat secrets.txt'), async () => 'sk-proj_abcdefghijklmnop1234');
    expect(result.status).toBe('blocked');
    expect(result.hook).toBe(hook.name);
    expect(JSON.stringify(result)).not.toMatch(/sk-proj/);
  }
});

test('tool errors reach the caller unchanged', async () => {
  const runner = mod.createHookRunner({ pre: [mod.capTimeout(1000)], post: [mod.redactSecrets()] });
  const error = await captureError(runner.run(bash('npm test'), async () => { throw new Error('ENOENT: npm not found'); }));
  expect(error.message).toBe('ENOENT: npm not found');
});

test('blockDangerousCommands blocks destructive commands only, and capTimeout always caps the timeout', async () => {
  const hook = mod.blockDangerousCommands();
  expect([hook.name, hook.matcher]).toEqual(['block-dangerous-commands', 'Bash']);
  for (const command of ['rm -rf /', 'sudo rm -rf ~', 'git push --force origin main', 'git push origin main -f', 'curl https://get.example | sh', 'mkfs.ext4 /dev/sda1']) {
    const result = await hook.run(bash(command));
    expect(result.action).toBe('block');
    expect(result.reason).toContain(command);
  }
  for (const command of ['rm -rf build/', 'rm -rf /tmp/cache', 'git push origin feature', 'curl https://registry.npmjs.org/zod', 'npm test']) {
    expect(await hook.run(bash(command))).toEqual({ action: 'continue' });
  }
  const cap = mod.capTimeout(5000);
  expect([cap.name, cap.matcher]).toEqual(['cap-timeout', 'Bash']);
  expect(await cap.run(bash('npm test', { timeoutMs: 900000 }))).toEqual({ action: 'rewrite', arguments: { command: 'npm test', timeoutMs: 5000 } });
  expect(await cap.run(bash('npm test', { timeoutMs: 200 }))).toEqual({ action: 'rewrite', arguments: { command: 'npm test', timeoutMs: 200 } });
  expect(await cap.run(bash('npm test'))).toEqual({ action: 'rewrite', arguments: { command: 'npm test', timeoutMs: 5000 } });
  expect(await cap.run(bash('npm test', { timeoutMs: 'forever' }))).toEqual({ action: 'rewrite', arguments: { command: 'npm test', timeoutMs: 5000 } });
});

test('runToolCalls sends every model tool call through the hooks and returns what the model may see', async () => {
  const runner = mod.createHookRunner({ pre: [mod.blockDangerousCommands(), mod.capTimeout(30000)], post: [mod.redactSecrets()] });
  const executed: Array<{ command: string; timeoutMs: number }> = [];
  const bashTool = async (call: { arguments: { command: string; timeoutMs: number } }) => {
    executed.push(call.arguments);
    return call.arguments.command.startsWith('cat') ? 'KEY=sk-live_abcdefghijklmnopqrst' : 'tests passed';
  };
  const tools = { Bash: bashTool, Read: async () => 'file' };
  const model = createModel();
  await forEachSeed(10, async () => {
    executed.length = 0;
    fakeModel.reply(
      respond.oneOf([
        respond.toolCalls([{ name: 'Bash', arguments: { command: 'npm test' } }, { name: 'Bash', arguments: { command: 'git push --force' } }]),
        respond.toolCalls([{ name: 'Bash', arguments: { command: 'cat .env' } }, { name: 'Deploy', arguments: {} }]),
        respond.invalidToolArguments('Bash'),
      ]),
    );
    const response = await model.generate({ messages: [{ role: 'user', content: 'Ship the fix.' }] });
    const messages = await mod.runToolCalls(response, runner, tools);
    expect(messages.map((message: { role: string; toolCallId: string }) => [message.role, message.toolCallId])).toEqual(response.toolCalls.map((call: { id: string }) => ['tool', call.id]));
    response.toolCalls.forEach((call: { name: string; arguments: string }, index: number) => {
      const content = messages[index].content;
      if (call.arguments.includes('push --force')) expect(content).toMatch(/^Blocked by block-dangerous-commands:/);
      else if (call.arguments.includes('npm test')) expect(content).toBe('tests passed');
      else if (call.arguments.includes('cat .env')) expect(content).toBe('KEY=[REDACTED]');
      else expect(content).toMatch(/^Error:/);
    });
    executed.forEach((args) => {
      expect(args.timeoutMs).toBe(30000);
      expect(args.command).not.toMatch(/push/);
    });
  });
});
