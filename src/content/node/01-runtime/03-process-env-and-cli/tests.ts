test('loadConfig converts PORT to a number and applies the defaults', async () => {
  expect(mod.loadConfig({ DATABASE_URL: 'postgres://db/app' })).toEqual({ port: 3000, nodeEnv: 'development', databaseUrl: 'postgres://db/app' });
  expect(mod.loadConfig({ DATABASE_URL: 'postgres://db/app', PORT: '8080', NODE_ENV: 'production' })).toEqual({ port: 8080, nodeEnv: 'production', databaseUrl: 'postgres://db/app' });
});

test('loadConfig fails fast on a missing DATABASE_URL or an invalid PORT', async () => {
  expect(() => mod.loadConfig({})).toThrow('DATABASE_URL is required');
  for (const PORT of ['abc', '0', '70000', '3000.5', '']) {
    expect(() => mod.loadConfig({ DATABASE_URL: 'postgres://db/app', PORT })).toThrow('PORT must be an integer between 1 and 65535');
  }
});

test('parseCli reads --port/-p as a string and --verbose/-v as a boolean that defaults to false', async () => {
  const parsed = mod.parseCli(['--port', '8080', '-v']);
  expect(parsed.port).toBe('8080');
  expect(parsed.verbose).toBe(true);
  expect(mod.parseCli(['-p', '9000']).port).toBe('9000');
  const empty = mod.parseCli([]);
  expect(empty.port).toBeUndefined();
  expect(empty.verbose).toBe(false);
});

test('main returns 0 and logs the start line, with --port overriding PORT', async () => {
  const logs = captureLogs();
  const code = mod.main(['--port', '8080'], { PORT: '3000', NODE_ENV: 'production', DATABASE_URL: 'postgres://user:secret@db/app' });
  expect(code).toBe(0);
  expect(logs).toContain('Starting in production on port 8080');
  mod.main(['-v'], { DATABASE_URL: 'postgres://user:secret@db/app' });
  expect(logs.some((line: string) => line.includes('secret'))).toBe(false);
});

test('main returns 1 on config errors and 2 on usage errors, with a message on stderr', async () => {
  const logs = captureLogs();
  expect(mod.main([], {})).toBe(1);
  expect(logs).toContain('Config error: DATABASE_URL is required');
  expect(mod.main(['--nope'], { DATABASE_URL: 'postgres://db/app' })).toBe(2);
  expect(logs.some((line: string) => line.startsWith('Usage error: '))).toBe(true);
});

test('uses parseArgs from node:util and sets process.exitCode instead of calling process.exit()', async () => {
  expect(source).toMatch(/parseArgs\s*\(/);
  expect(source).toMatch(/process\.exitCode\s*=/);
  expect(source).not.toMatch(/process\.exit\s*\(/);
});
