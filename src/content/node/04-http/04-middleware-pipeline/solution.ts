import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';

export interface Context {
  method: string;
  path: string;
  requestHeaders: Record<string, string | string[] | undefined>;
  status: number;
  body: unknown;
  responseHeaders: Record<string, string>;
}

export type Next = () => Promise<void>;
export type Middleware = (ctx: Context, next: Next) => Promise<void> | void;

export function compose(middleware: Middleware[]) {
  return async (ctx: Context, next?: Next): Promise<void> => {
    let lastIndex = -1;
    const dispatch = async (index: number): Promise<void> => {
      if (index <= lastIndex) {
        throw new Error('next() called multiple times');
      }
      lastIndex = index;
      const current = index === middleware.length ? next : middleware[index];
      if (!current) {
        return;
      }
      await current(ctx, () => dispatch(index + 1));
    };
    await dispatch(0);
  };
}

export const errorHandler: Middleware = async (ctx, next) => {
  try {
    await next();
  } catch (error) {
    const status = (error as { status?: unknown }).status;
    if (typeof status === 'number' && status >= 400 && status < 500) {
      ctx.status = status;
      ctx.body = { error: (error as Error).message };
      return;
    }
    console.error(error);
    ctx.status = 500;
    ctx.body = { error: 'Internal server error' };
  }
};

export function responseTime(now: () => number = Date.now): Middleware {
  return async (ctx, next) => {
    const start = now();
    await next();
    ctx.responseHeaders['X-Response-Time'] = `${now() - start}ms`;
  };
}

export function requireApiKey(expected: string): Middleware {
  return async (ctx, next) => {
    if (ctx.requestHeaders['x-api-key'] !== expected) {
      ctx.status = 401;
      ctx.body = { error: 'Unauthorized' };
      return;
    }
    await next();
  };
}

export function createListener(middleware: Middleware[]) {
  const run = compose(middleware);
  return async (req: IncomingMessage, res: ServerResponse) => {
    const ctx: Context = {
      method: req.method ?? 'GET',
      path: new URL(req.url ?? '/', 'http://localhost').pathname,
      requestHeaders: req.headers,
      status: 404,
      body: { error: 'Not found' },
      responseHeaders: {},
    };
    try {
      await run(ctx);
    } catch {
      ctx.status = 500;
      ctx.body = { error: 'Internal server error' };
    }
    res.writeHead(ctx.status, { 'Content-Type': 'application/json', ...ctx.responseHeaders });
    res.end(JSON.stringify(ctx.body));
  };
}

const routes: Middleware = async (ctx, next) => {
  if (ctx.method === 'GET' && ctx.path === '/reports') {
    ctx.status = 200;
    ctx.body = { reports: ['daily', 'weekly'] };
    return;
  }
  if (ctx.path === '/boom') {
    throw new Error('Report database unavailable');
  }
  if (ctx.path === '/forbidden') {
    throw Object.assign(new Error('Reports are read-only'), { status: 403 });
  }
  await next();
};

export const app = createListener([errorHandler, responseTime(), requireApiKey(process.env.API_KEY ?? 'dev-key'), routes]);

export const server = createServer(app);

const PORT = Number(process.env.PORT ?? 3000);
server.listen(PORT, () => console.log(`Listening on http://localhost:${PORT}`));
