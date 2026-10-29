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
  const hidden = new Set(redact.map((key) => key.toLowerCase()));

  const serialize = (key: string, value: unknown): unknown => {
    if (hidden.has(key.toLowerCase())) {
      return '[REDACTED]';
    }
    if (value instanceof Error) {
      return { name: value.name, message: value.message, stack: value.stack };
    }
    return value;
  };

  const log = (lineLevel: Level) => (msg: string, fields: Fields = {}) => {
    if (LEVELS.indexOf(lineLevel) < LEVELS.indexOf(level)) {
      return;
    }
    const entry: Fields = { level: lineLevel, time: now().toISOString(), msg };
    for (const [key, value] of Object.entries({ ...bindings, ...fields })) {
      entry[key] = serialize(key, value);
    }
    write(JSON.stringify(entry));
  };

  return {
    debug: log('debug'),
    info: log('info'),
    warn: log('warn'),
    error: log('error'),
    child: (extra) => createLogger({ ...options, bindings: { ...bindings, ...extra } }),
  };
}

export type ObservedHandler = (req: IncomingMessage, res: ServerResponse, log: Logger) => unknown;

export function withObservability(handler: ObservedHandler, { logger, now = () => performance.now() }: { logger: Logger; now?: () => number }) {
  return async (req: IncomingMessage, res: ServerResponse) => {
    const startedAt = now();
    const header = req.headers['x-request-id'];
    const requestId = typeof header === 'string' && header ? header : randomUUID();
    const log = logger.child({ requestId });
    res.setHeader('X-Request-Id', requestId);
    res.on('finish', () => {
      log.info('request completed', {
        method: req.method,
        path: new URL(req.url ?? '/', 'http://localhost').pathname,
        status: res.statusCode,
        durationMs: Math.round(now() - startedAt),
      });
    });
    try {
      await handler(req, res, log);
    } catch (error) {
      log.error('request failed', { err: error });
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Internal Server Error' }));
      }
    }
  };
}

export function percentile(values: readonly number[], p: number): number {
  if (values.length === 0) {
    return 0;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const rank = Math.max(1, Math.ceil((p / 100) * sorted.length));
  return sorted[rank - 1];
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
