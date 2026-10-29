import { createServer, type ServerResponse } from 'node:http';

export const API_BASE = 'https://api.example.com';

export type UpstreamCode = 'UPSTREAM_TIMEOUT' | 'UPSTREAM_UNAVAILABLE' | 'UPSTREAM_BAD_RESPONSE' | 'NOT_FOUND';

export class UpstreamError extends Error {
  constructor(message: string, readonly status: number, readonly code: UpstreamCode) {
    super(message);
  }
}

export interface Profile {
  id: number;
  name: string;
  postCount: number;
}

export async function fetchJson<T>(url: string, options: { timeoutMs?: number } = {}): Promise<T> {
  // TODO: fetch with AbortSignal.timeout, then map timeout, network, 404, other statuses and invalid JSON to UpstreamError
  const response = await fetch(url);
  return (await response.json()) as T;
}

export async function getUserProfile(id: number): Promise<Profile> {
  // TODO: fetch the user and their posts in parallel and build the profile
  const user = await fetchJson<{ id: number; name: string }>(`${API_BASE}/users/${id}`);
  return { id: user.id, name: user.name, postCount: 0 };
}

function sendJson(res: ServerResponse, status: number, data: unknown): void {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

export const server = createServer(async (req, res) => {
  const match = /^\/profiles\/(\d+)$/.exec(new URL(req.url ?? '/', 'http://localhost').pathname);
  if (req.method !== 'GET' || !match) {
    return sendJson(res, 404, { error: 'Not found' });
  }
  // TODO: answer the profile, map UpstreamError to its status and anything else to a generic 500
  sendJson(res, 200, await getUserProfile(Number(match[1])));
});

const PORT = Number(process.env.PORT ?? 3000);
server.listen(PORT, async () => {
  console.log(await (await fetch(`http://localhost:${PORT}/profiles/1`)).json());
  console.log(await (await fetch(`http://localhost:${PORT}/profiles/42`)).json());
});
