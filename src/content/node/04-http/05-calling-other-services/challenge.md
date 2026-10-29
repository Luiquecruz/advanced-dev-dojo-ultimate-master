Build a profile endpoint that aggregates the fake REST API (`https://api.example.com`) and maps every upstream failure to a predictable error.

1. `class UpstreamError extends Error` with `constructor(message, status, code)` and public `status` and `code` properties (provided in the starter).
2. `fetchJson<T>(url: string, options?: { timeoutMs?: number }): Promise<T>` (`timeoutMs` defaults to `2000`):
   - pass a timeout signal to `fetch` (`AbortSignal.timeout(timeoutMs)`);
   - aborted by the timeout: throw `UpstreamError('Upstream timed out', 504, 'UPSTREAM_TIMEOUT')`;
   - any other `fetch` rejection (connection refused, DNS): `UpstreamError('Upstream unreachable', 502, 'UPSTREAM_UNAVAILABLE')`;
   - status `404`: `UpstreamError('Not found', 404, 'NOT_FOUND')`;
   - any other non-2xx status: `UpstreamError('Upstream responded <status>', 502, 'UPSTREAM_BAD_RESPONSE')`;
   - a body that is not valid JSON: `UpstreamError('Invalid upstream response', 502, 'UPSTREAM_BAD_RESPONSE')`;
   - otherwise resolve with the parsed JSON.
3. `getUserProfile(id: number): Promise<{ id, name, postCount }>` fetches `${API_BASE}/users/<id>` and `${API_BASE}/posts?userId=<id>` **in parallel** and returns the user's `id` and `name` and the number of posts.
4. `server` answers `GET /profiles/:id` (numeric id) with `200` and the profile. An `UpstreamError` becomes its `status` with `{ error: message }`; any other error becomes `500 { error: 'Internal server error' }`; other paths answer `404 { error: 'Not found' }`.
