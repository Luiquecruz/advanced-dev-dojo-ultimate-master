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
  const signal = AbortSignal.timeout(options.timeoutMs ?? 2000);
  let response: Response;
  try {
    response = await fetch(url, { signal, headers: { Accept: 'application/json' } });
  } catch {
    if (signal.aborted) {
      throw new UpstreamError('Upstream timed out', 504, 'UPSTREAM_TIMEOUT');
    }
    throw new UpstreamError('Upstream unreachable', 502, 'UPSTREAM_UNAVAILABLE');
  }
  if (response.status === 404) {
    throw new UpstreamError('Not found', 404, 'NOT_FOUND');
  }
  if (!response.ok) {
    throw new UpstreamError(`Upstream responded ${response.status}`, 502, 'UPSTREAM_BAD_RESPONSE');
  }
  try {
    return (await response.json()) as T;
  } catch {
    throw new UpstreamError('Invalid upstream response', 502, 'UPSTREAM_BAD_RESPONSE');
  }
}

export async function getUserProfile(id: number): Promise<Profile> {
  const [user, posts] = await Promise.all([
    fetchJson<{ id: number; name: string }>(`${API_BASE}/users/${id}`),
    fetchJson<unknown[]>(`${API_BASE}/posts?userId=${id}`),
  ]);
  return { id: user.id, name: user.name, postCount: posts.length };
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
  try {
    sendJson(res, 200, await getUserProfile(Number(match[1])));
  } catch (error) {
    if (error instanceof UpstreamError) {
      return sendJson(res, error.status, { error: error.message });
    }
    console.error(error);
    sendJson(res, 500, { error: 'Internal server error' });
  }
});

const PORT = Number(process.env.PORT ?? 3000);
server.listen(PORT, async () => {
  console.log(await (await fetch(`http://localhost:${PORT}/profiles/1`)).json());
  console.log(await (await fetch(`http://localhost:${PORT}/profiles/42`)).json());
});
