async function failure(promise: Promise<unknown>) {
  try {
    await promise;
  } catch (error: any) {
    return { name: error.constructor.name, message: error.message, status: error.status, code: error.code };
  }
  throw new Error('Expected the call to reject');
}

test('fetchJson() resolves with the parsed JSON of a 2xx response', async () => {
  const user = await mod.fetchJson('https://api.example.com/users/1');
  expect(user).toEqual(expect.objectContaining({ id: 1, name: 'Ada Lovelace' }));
});

test('fetchJson() maps 404 to NOT_FOUND and other statuses to 502 UPSTREAM_BAD_RESPONSE', async () => {
  expect(await failure(mod.fetchJson('https://api.example.com/users/99'))).toEqual({ name: 'UpstreamError', message: 'Not found', status: 404, code: 'NOT_FOUND' });
  mockApi('/users/3', () => jsonResponse({ error: 'maintenance' }, 503));
  expect(await failure(mod.fetchJson('https://api.example.com/users/3'))).toEqual({ name: 'UpstreamError', message: 'Upstream responded 503', status: 502, code: 'UPSTREAM_BAD_RESPONSE' });
});

test('fetchJson() aborts slow upstreams with AbortSignal.timeout and maps them to 504 UPSTREAM_TIMEOUT', async () => {
  expect(await failure(mod.fetchJson('https://api.example.com/users/2', { timeoutMs: 1 }))).toEqual({ name: 'UpstreamError', message: 'Upstream timed out', status: 504, code: 'UPSTREAM_TIMEOUT' });
  expect(source).toMatch(/AbortSignal\.timeout\s*\(|new\s+AbortController/);
});

test('fetchJson() maps unreachable hosts and invalid JSON to 502 errors', async () => {
  expect(await failure(mod.fetchJson('http://localhost:4999/users'))).toEqual({ name: 'UpstreamError', message: 'Upstream unreachable', status: 502, code: 'UPSTREAM_UNAVAILABLE' });
  mockApi('/users/4', () => new Response('<html>Bad gateway</html>', { status: 200, headers: { 'Content-Type': 'text/html' } }));
  expect(await failure(mod.fetchJson('https://api.example.com/users/4'))).toEqual({ name: 'UpstreamError', message: 'Invalid upstream response', status: 502, code: 'UPSTREAM_BAD_RESPONSE' });
});

test('getUserProfile() fetches the user and the posts in parallel', async () => {
  const calls: string[] = [];
  let active = 0;
  let maxActive = 0;
  const track = (data: unknown) => async ({ url }: any) => {
    calls.push(url.pathname);
    active++;
    maxActive = Math.max(maxActive, active);
    await sleep(20);
    active--;
    return data;
  };
  mockApi(/\/users\/2$/, track({ id: 2, name: 'Alan Turing', email: 'alan@example.com', role: 'editor' }));
  mockApi(/\/posts\?userId=2$/, track([{ id: 2, userId: 2 }, { id: 9, userId: 2 }]));
  await expect(mod.getUserProfile(2)).resolves.toEqual({ id: 2, name: 'Alan Turing', postCount: 2 });
  expect(calls.sort()).toEqual(['/posts', '/users/2']);
  expect(maxActive).toBe(2);
});

test('GET /profiles/:id answers the profile and maps upstream failures to their status', async () => {
  captureLogs();
  const ok = await request(mod.server, '/profiles/2');
  expect([ok.status, ok.body]).toEqual([200, { id: 2, name: 'Alan Turing', postCount: 1 }]);
  const missing = await request(mod.server, '/profiles/42');
  expect([missing.status, missing.body]).toEqual([404, { error: 'Not found' }]);
  mockApi('/posts', () => jsonResponse({ error: 'database exploded at 10.0.3.7' }, 500));
  const broken = await request(mod.server, '/profiles/1');
  expect([broken.status, broken.body]).toEqual([502, { error: 'Upstream responded 500' }]);
  expect((await request(mod.server, '/elsewhere')).status).toBe(404);
});
