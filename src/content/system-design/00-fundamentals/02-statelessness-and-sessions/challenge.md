Model two copies of a server that share one session store, so a user who logs in on one copy is recognized by the other. Time is injected: `now()` returns the current time in milliseconds, so the tests can move the clock without waiting.

```ts
interface SessionStore {
  create(user: string): string;
  get(sessionId: string): string | undefined;
  destroy(sessionId: string): void;
}
interface HttpResponse { status: number; body?: unknown }
interface Server {
  name: string;
  login(user: string): string;
  whoAmI(sessionId: string): HttpResponse;
  logout(sessionId: string): HttpResponse;
}

export function createSessionStore(options: { ttlMs: number; now: () => number }): SessionStore
export function createServer(name: string, store: SessionStore): Server
```

**The store** (`createSessionStore`):

- `create(user)` stores a session for `user` that expires `ttlMs` after `now()` and returns a new, unique session id (the starter already uses `randomUUID()`).
- `get(sessionId)` returns the user of a live session. It returns `undefined` for an unknown id and for an expired one: a session created at time `t` is valid while `now() < t + ttlMs`. An expired session is removed from the store.
- `destroy(sessionId)` removes the session. An unknown id is ignored.

**A server** (`createServer`) keeps no session data of its own; every method goes through the `store` it was given:

| Method | Result |
| --- | --- |
| `login(user)` | the session id returned by the store |
| `whoAmI(sessionId)` | `{ status: 200, body: { user, server: name } }` for a live session, otherwise `{ status: 401, body: { error: 'not logged in' } }` |
| `logout(sessionId)` | removes the session from the store and returns `{ status: 204 }` |

A session created through server `a` must work on server `b` when both share the store, and a logout on either ends it for both.
