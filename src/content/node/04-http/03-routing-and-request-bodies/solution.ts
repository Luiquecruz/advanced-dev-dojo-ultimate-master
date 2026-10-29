import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';

export class HttpError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

export type Params = Record<string, string>;

export interface Route {
  method: string;
  pattern: string;
  handler: (req: IncomingMessage, params: Params) => Promise<{ status: number; body: unknown }> | { status: number; body: unknown };
}

export interface User {
  id: number;
  name: string;
}

export const users: User[] = [
  { id: 1, name: 'Ada Lovelace' },
  { id: 2, name: 'Alan Turing' },
];

function sendJson(res: ServerResponse, status: number, data: unknown): void {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

export function matchRoute(pattern: string, pathname: string): Params | null {
  const expected = pattern.split('/').filter(Boolean);
  const actual = pathname.split('/').filter(Boolean);
  if (expected.length !== actual.length) {
    return null;
  }
  const params: Params = {};
  for (let index = 0; index < expected.length; index++) {
    const segment = expected[index];
    if (segment.startsWith(':')) {
      params[segment.slice(1)] = decodeURIComponent(actual[index]);
    } else if (segment !== actual[index]) {
      return null;
    }
  }
  return params;
}

export async function readJsonBody(req: IncomingMessage, limitBytes: number): Promise<unknown> {
  if (!req.headers['content-type']?.startsWith('application/json')) {
    throw new HttpError(415, 'Content-Type must be application/json');
  }
  req.setEncoding('utf8');
  let text = '';
  let size = 0;
  for await (const chunk of req) {
    size += Buffer.byteLength(chunk);
    if (size > limitBytes) {
      throw new HttpError(413, 'Payload too large');
    }
    text += chunk;
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new HttpError(400, 'Invalid JSON');
  }
}

export function createListener(routes: Route[]) {
  return async (req: IncomingMessage, res: ServerResponse) => {
    const { pathname } = new URL(req.url ?? '/', 'http://localhost');
    const candidates = routes
      .map((route) => ({ route, params: matchRoute(route.pattern, pathname) }))
      .filter((candidate): candidate is { route: Route; params: Params } => candidate.params !== null);
    if (candidates.length === 0) {
      return sendJson(res, 404, { error: 'Not found' });
    }
    const match = candidates.find(({ route }) => route.method === req.method);
    if (!match) {
      res.setHeader('Allow', candidates.map(({ route }) => route.method).join(', '));
      return sendJson(res, 405, { error: 'Method not allowed' });
    }
    try {
      const result = await match.route.handler(req, match.params);
      sendJson(res, result.status, result.body);
    } catch (error) {
      if (error instanceof HttpError) {
        return sendJson(res, error.status, { error: error.message });
      }
      console.error(error);
      sendJson(res, 500, { error: 'Internal server error' });
    }
  };
}

export const routes: Route[] = [
  {
    method: 'GET',
    pattern: '/users/:id',
    handler: (req, params) => {
      const user = users.find((candidate) => candidate.id === Number(params.id));
      if (!user) {
        throw new HttpError(404, 'User not found');
      }
      return { status: 200, body: user };
    },
  },
  {
    method: 'POST',
    pattern: '/users',
    handler: async (req) => {
      const body = (await readJsonBody(req, 1024)) as { name?: unknown } | null;
      const name = body?.name;
      if (typeof name !== 'string' || name.trim() === '') {
        throw new HttpError(422, 'name is required');
      }
      const user = { id: Math.max(0, ...users.map((existing) => existing.id)) + 1, name };
      users.push(user);
      return { status: 201, body: user };
    },
  },
];

export const server = createServer(createListener(routes));

const PORT = Number(process.env.PORT ?? 3000);
server.listen(PORT, () => console.log(`Listening on http://localhost:${PORT}`));
