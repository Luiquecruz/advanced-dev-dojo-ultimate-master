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
    // TODO: dispatch(i) runs middleware[i] with () => dispatch(i + 1), guards double next() calls and ends with next
  };
}

export const errorHandler: Middleware = async (ctx, next) => {
  // TODO: await next() in try/catch; 4xx errors keep status and message, others log and become 500
  await next();
};

export function responseTime(now: () => number = Date.now): Middleware {
  return async (ctx, next) => {
    // TODO: measure around next() and set the X-Response-Time header
    await next();
  };
}

export function requireApiKey(expected: string): Middleware {
  return async (ctx, next) => {
    // TODO: 401 { error: 'Unauthorized' } when x-api-key differs, otherwise next()
    await next();
  };
}

export function createListener(middleware: Middleware[]) {
  const run = compose(middleware);
  return async (req: IncomingMessage, res: ServerResponse) => {
    // TODO: build the context, run the pipeline, write status, headers and JSON body (500 if it rejects)
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
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
