import { randomUUID } from 'node:crypto';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';

const LEVELS = ['debug', 'info', 'warn', 'error'] as const;
export type Level = (typeof LEVELS)[number];
type Fields = Record<string, unknown>;

export interface LoggerOptions {
  level?: Level;
  write?: (line: string) => void;
  now?: () => Date;
  bindings?: Fields;
  redact?: string[];
}

export interface Logger {
  debug(msg: string, fields?: Fields): void;
  info(msg: string, fields?: Fields): void;
  warn(msg: string, fields?: Fields): void;
  error(msg: string, fields?: Fields): void;
  child(bindings: Fields): Logger;
}

export function createLogger(options: LoggerOptions = {}): Logger {
  const {
    level = 'info',
    write = (line: string) => console.log(line),
    now = () => new Date(),
    bindings = {},
    redact = ['password', 'token', 'authorization'],
  } = options;

  const log = (lineLevel: Level) => (msg: string, fields: Fields = {}) => {
    // TODO: skip levels below the minimum, redact sensitive keys, serialize Error values, write one JSON line
    write(`${lineLevel}: ${msg}`);
  };

  return {
    debug: log('debug'),
    info: log('info'),
    warn: log('warn'),
    error: log('error'),
    // TODO: return a logger with the same options and merged bindings
    child: () => createLogger(options),
  };
}

export type ObservedHandler = (req: IncomingMessage, res: ServerResponse, log: Logger) => unknown;

export function withObservability(handler: ObservedHandler, { logger, now = () => performance.now() }: { logger: Logger; now?: () => number }) {
  return async (req: IncomingMessage, res: ServerResponse) => {
    // TODO: request id (header or randomUUID), X-Request-Id response header, child logger, access log on 'finish', 500 on errors
    await handler(req, res, logger);
  };
}

export function percentile(values: readonly number[], p: number): number {
  // TODO: nearest-rank percentile on a sorted copy, 0 for an empty list
  return values[0] ?? 0;
}

async function main() {
  const logger = createLogger({ level: 'debug' });
  const listener = withObservability(
    async (req, res, log) => {
      log.debug('loading orders', { token: 'secret-value' });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end('[]');
    },
    { logger },
  );
  const server = createServer(listener).listen(3000);
  await fetch('http://localhost:3000/orders?page=2', { headers: { 'x-request-id': 'demo-123' } });
  server.close();
  const latencies = [12, 15, 11, 18, 2_400, 14, 13, 16, 12, 17];
  console.log({ p50: percentile(latencies, 50), p95: percentile(latencies, 95) });
}

main();
