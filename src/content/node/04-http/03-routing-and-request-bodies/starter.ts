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
  // TODO: compare segments, capture :params with decodeURIComponent, return null on mismatch
  return pattern === pathname ? {} : null;
}

export async function readJsonBody(req: IncomingMessage, limitBytes: number): Promise<unknown> {
  // TODO: check Content-Type (415), count bytes while reading (413), parse JSON (400)
  return {};
}

export function createListener(routes: Route[]) {
  return async (req: IncomingMessage, res: ServerResponse) => {
    // TODO: match the pathname, answer 404 / 405 with Allow, run the handler and map errors
    sendJson(res, 404, { error: 'Not found' });
  };
}

export const routes: Route[] = [
  {
    method: 'GET',
    pattern: '/users/:id',
    handler: (req, params) => {
      // TODO: find the user by Number(params.id) or throw HttpError(404, 'User not found')
      return { status: 200, body: users[0] };
    },
  },
  {
    method: 'POST',
    pattern: '/users',
    handler: async (req) => {
      // TODO: read the body (limit 1024), require a non-empty name (422), add the user and answer 201
      return { status: 201, body: {} };
    },
  },
];

export const server = createServer(createListener(routes));

const PORT = Number(process.env.PORT ?? 3000);
server.listen(PORT, () => console.log(`Listening on http://localhost:${PORT}`));
