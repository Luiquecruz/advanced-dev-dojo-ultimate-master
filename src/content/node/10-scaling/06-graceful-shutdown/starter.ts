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

  const shutdown = async (signal: string): Promise<void> => {
    // TODO: run once; mark shuttingDown, start an unref()'d timeout that exits with 1
    // TODO: close the server (waits for in-flight requests), await cleanup, exit with 0; exit with 1 on errors; exit only once
  };

  // TODO: call shutdown(signal) for each of the signals with process.on

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
