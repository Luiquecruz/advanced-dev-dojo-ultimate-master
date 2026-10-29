import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { requestId, type RequestIdVariables } from 'hono/request-id';
import { endTime, startTime, timing } from 'hono/timing';

export interface LogEntry {
  requestId: string;
  method: string;
  path: string;
  status: number;
  durationMs: number;
}

export interface AppOptions {
  allowedOrigins: string[];
  log: (entry: LogEntry) => void;
}

async function loadUser() {
  return { id: 1, name: 'Ada' };
}

export function createApp(options: AppOptions) {
  const app = new Hono<{ Variables: RequestIdVariables }>();

  app.use(requestId());

  app.use(async (c, next) => {
    const startedAt = Date.now();
    await next();
    options.log({
      requestId: c.get('requestId'),
      method: c.req.method,
      path: c.req.path,
      status: c.res.status,
      durationMs: Date.now() - startedAt,
    });
  });

  app.use(
    '/api/*',
    cors({
      origin: options.allowedOrigins,
      allowMethods: ['GET', 'POST', 'PATCH', 'DELETE'],
      exposeHeaders: ['X-Request-Id'],
    }),
  );

  app.use(timing());

  app.get('/api/me', async (c) => {
    startTime(c, 'db');
    const user = await loadUser();
    endTime(c, 'db');
    return c.json(user);
  });

  app.get('/api/fail', () => {
    throw new Error('Unexpected failure');
  });

  return app;
}

export const app = createApp({
  allowedOrigins: ['http://localhost:5173'],
  log: (entry) => console.log(JSON.stringify(entry)),
});
