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

  // TODO: 1. requestId()

  // TODO: 2. logging middleware calling options.log({ requestId, method, path, status, durationMs }) after next()

  // TODO: 3. cors() on '/api/*' with the allowed origins, methods and exposed X-Request-Id

  // TODO: 4. timing()

  app.get('/api/me', async (c) => {
    // TODO: measure loadUser() as the 'db' metric with startTime / endTime
    const user = await loadUser();
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
