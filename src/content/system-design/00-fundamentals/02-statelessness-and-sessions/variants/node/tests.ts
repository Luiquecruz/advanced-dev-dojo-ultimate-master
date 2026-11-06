function setup(ttlMs = 1000) {
  const clock = { now: 0 };
  const store = mod.createSessionStore({ ttlMs, now: () => clock.now });
  return { clock, store, serverA: mod.createServer('a', store), serverB: mod.createServer('b', store) };
}

test('login returns a new session id, and asking who is logged in answers 200 with the user, or 401 for an unknown id', () => {
  const { serverA } = setup();
  const ada = serverA.login('ada');
  const alan = serverA.login('alan');
  expect(typeof ada).toBe('string');
  expect(ada).not.toBe(alan);
  expect(serverA.whoAmI(ada)).toEqual({ status: 200, body: { user: 'ada', server: 'a' } });
  expect(serverA.whoAmI(alan)).toEqual({ status: 200, body: { user: 'alan', server: 'a' } });
  expect(serverA.whoAmI('no-such-session')).toEqual({ status: 401, body: { error: 'not logged in' } });
});

// beginner mistake: keeping the session in one server's memory instead of the shared store
test('a session created on one server is recognized by another server that shares the store', () => {
  const { serverA, serverB } = setup();
  const sessionId = serverA.login('ada');
  expect(serverB.whoAmI(sessionId)).toEqual({ status: 200, body: { user: 'ada', server: 'b' } });
  expect(serverB.login('grace')).not.toBe(sessionId);
});

test('a session expires exactly one TTL after login', () => {
  const { clock, store, serverA, serverB } = setup(1000);
  clock.now = 5000;
  const sessionId = serverA.login('ada');
  clock.now = 5999;
  expect(serverB.whoAmI(sessionId).status).toBe(200);
  clock.now = 6000;
  expect(serverB.whoAmI(sessionId)).toEqual({ status: 401, body: { error: 'not logged in' } });
  expect(store.get(sessionId)).toBeUndefined();
});

test('logout on one server answers 204 and ends the session on every server', () => {
  const { serverA, serverB } = setup();
  const ada = serverA.login('ada');
  const alan = serverA.login('alan');
  expect(serverB.logout(ada)).toEqual({ status: 204 });
  expect(serverA.whoAmI(ada).status).toBe(401);
  expect(serverB.whoAmI(ada).status).toBe(401);
  expect(serverB.whoAmI(alan).status).toBe(200);
});
