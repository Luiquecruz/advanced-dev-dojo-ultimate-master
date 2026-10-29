import { createServer, type Server } from 'node:http';

export interface ShutdownOptions {
  timeoutMs?: number;
  cleanup?: () => void | Promise<void>;
  exit?: (code: number) => void;
  signals?: string[];
}

export interface ShutdownHandle {
  isShuttingDown(): boolean;
  shutdown(signal: string): Promise<void>;
}

export function setupGracefulShutdown(server: Server, options: ShutdownOptions = {}): ShutdownHandle {
  const {
    timeoutMs = 10_000,
    cleanup = () => {},
    exit = (code: number) => process.exit(code),
    signals = ['SIGTERM', 'SIGINT'],
  } = options;
  let shuttingDown = false;
  let exited = false;
  let done: Promise<void> | undefined;

  const finish = (code: number) => {
    if (!exited) {
      exited = true;
      exit(code);
    }
  };

  const closeServer = () => new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));

  const shutdown = (signal: string): Promise<void> => {
    if (done) {
      return done;
    }
    shuttingDown = true;
    console.log(`Received ${signal}, draining in-flight requests`);
    const timer = setTimeout(() => {
      console.error(`Shutdown did not finish within ${timeoutMs} ms, forcing exit`);
      finish(1);
    }, timeoutMs);
    timer.unref();
    done = (async () => {
      try {
        await closeServer();
        await cleanup();
        finish(0);
      } catch (error) {
        console.error('Shutdown failed:', error);
        finish(1);
      } finally {
        clearTimeout(timer);
      }
    })();
    return done;
  };

  for (const signal of signals) {
    process.on(signal, () => {
      shutdown(signal);
    });
  }

  return { isShuttingDown: () => shuttingDown, shutdown };
}

async function main() {
  const server = createServer((req, res) => {
    setTimeout(() => res.end('report ready'), 50);
  });
  server.listen(3000);
  const { shutdown } = setupGracefulShutdown(server, {
    timeoutMs: 1_000,
    signals: [],
    cleanup: async () => console.log('Database pool closed'),
    exit: (code) => console.log(`process.exit(${code})`),
  });
  const pending = fetch('http://localhost:3000/report').then((response) => response.text());
  await new Promise((resolve) => setTimeout(resolve, 10));
  const finished = shutdown('SIGTERM');
  console.log(`In-flight request finished: ${await pending}`);
  await finished;
}

main();
