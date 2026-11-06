import { randomUUID } from 'node:crypto';

export interface SessionStore {
  create(user: string): string;
  get(sessionId: string): string | undefined;
  destroy(sessionId: string): void;
}

export interface HttpResponse {
  status: number;
  body?: unknown;
}

export interface Server {
  name: string;
  login(user: string): string;
  whoAmI(sessionId: string): HttpResponse;
  logout(sessionId: string): HttpResponse;
}

interface SessionRecord {
  user: string;
  expiresAt: number;
}

export function createSessionStore(options: { ttlMs: number; now: () => number }): SessionStore {
  const sessions = new Map<string, SessionRecord>();

  return {
    create(user) {
      const sessionId = randomUUID();
      sessions.set(sessionId, { user, expiresAt: options.now() + options.ttlMs });
      return sessionId;
    },
    get(sessionId) {
      // TODO: an expired session (now() >= expiresAt) must be removed and return undefined
      return sessions.get(sessionId)?.user;
    },
    destroy(sessionId) {
      // TODO: remove the session
    },
  };
}

export function createServer(name: string, store: SessionStore): Server {
  // TODO: this server remembers sessions in its own memory; keep them in the shared store instead
  const localSessions = new Map<string, string>();

  return {
    name,
    login(user) {
      const sessionId = randomUUID();
      localSessions.set(sessionId, user);
      return sessionId;
    },
    whoAmI(sessionId) {
      const user = localSessions.get(sessionId);
      if (user === undefined) {
        return { status: 401, body: { error: 'not logged in' } };
      }
      return { status: 200, body: { user, server: name } };
    },
    logout(sessionId) {
      // TODO: end the session for every server that shares the store
      return { status: 204 };
    },
  };
}

let clock = 0;
const store = createSessionStore({ ttlMs: 1_000, now: () => clock });
const serverA = createServer('a', store);
const serverB = createServer('b', store);
const sessionId = serverA.login('ada');
console.log(serverB.whoAmI(sessionId));
clock = 1_000;
console.log(serverA.whoAmI(sessionId));
