const { createServer } = require('node:http');

const deferred = () => {
  let release: () => void = () => {};
  const promise = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { promise, release };
};

const startServer = (gate?: Promise<void>) => {
  const server = createServer(async (req: any, res: any) => {
    if (gate) await gate;
    res.end('done');
  });
  server.listen(0);
  return server;
};

test('SIGTERM stops accepting new connections and marks the service as shutting down', async () => {
  const server = startServer();
  const port = server.address().port;
  const handle = mod.setupGracefulShutdown(server, { exit: fn(), cleanup: fn() });
  expect(handle.isShuttingDown()).toBe(false);
  process.emit('SIGTERM');
  expect(handle.isShuttingDown()).toBe(true);
  expect(server.listening).toBe(false);
  await expect(fetch(`http://localhost:${port}/`)).rejects.toThrow('fetch failed');
});

test('in-flight requests finish before cleanup runs, then the process exits with 0', async () => {
  const gate = deferred();
  const server = startServer(gate.promise);
  const calls: string[] = [];
  const exit = fn((code: number) => calls.push(`exit:${code}`));
  const cleanup = fn(async () => {
    calls.push('cleanup');
  });
  mod.setupGracefulShutdown(server, { exit, cleanup, timeoutMs: 1_000 });
  const pending = request(server, '/report');
  process.emit('SIGTERM');
  await sleep(20);
  expect(calls).toEqual([]);
  gate.release();
  const response = await pending;
  expect(response.text).toBe('done');
  await sleep(10);
  expect(calls).toEqual(['cleanup', 'exit:0']);
});

test('a second signal does not start a second shutdown', async () => {
  const server = startServer();
  const close = fn(server.close.bind(server));
  server.close = close;
  const exit = fn();
  const cleanup = fn();
  mod.setupGracefulShutdown(server, { exit, cleanup });
  process.emit('SIGTERM');
  process.emit('SIGTERM');
  process.emit('SIGINT');
  await sleep(10);
  expect(close).toHaveBeenCalledTimes(1);
  expect(cleanup).toHaveBeenCalledTimes(1);
  expect(exit).toHaveBeenCalledTimes(1);
  expect(exit).toHaveBeenCalledWith(0);
});

test('a request that never finishes forces exit(1) after timeoutMs', async () => {
  const server = startServer(new Promise<void>(() => {}));
  const exit = fn();
  mod.setupGracefulShutdown(server, { exit, cleanup: fn(), timeoutMs: 30 });
  request(server, '/stuck');
  process.emit('SIGTERM');
  await sleep(10);
  expect(exit).not.toHaveBeenCalled();
  await sleep(50);
  expect(exit).toHaveBeenCalledTimes(1);
  expect(exit).toHaveBeenCalledWith(1);
});

test('a failing cleanup exits with 1, and exit is called only once per shutdown', async () => {
  const failing = startServer();
  const exitAfterFailure = fn();
  mod.setupGracefulShutdown(failing, {
    exit: exitAfterFailure,
    cleanup: async () => {
      throw new Error('pool already closed');
    },
    timeoutMs: 30,
    signals: ['SIGTERM'],
  });
  const healthy = startServer();
  const exitAfterSuccess = fn();
  mod.setupGracefulShutdown(healthy, { exit: exitAfterSuccess, cleanup: fn(), timeoutMs: 30, signals: ['SIGINT'] });
  process.emit('SIGTERM');
  process.emit('SIGINT');
  await sleep(60);
  expect(exitAfterFailure).toHaveBeenCalledTimes(1);
  expect(exitAfterFailure).toHaveBeenCalledWith(1);
  expect(exitAfterSuccess).toHaveBeenCalledTimes(1);
  expect(exitAfterSuccess).toHaveBeenCalledWith(0);
});

test('the shutdown timer is unref()d so it never keeps the process alive', () => {
  expect(source).toMatch(/\.unref\(\s*\)/);
});
