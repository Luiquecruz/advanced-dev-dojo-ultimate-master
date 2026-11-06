const sequence = (...values: number[]) => {
  let index = 0;
  return () => values[index++];
};

test('route sends a path to the pool of its prefix, matching whole path segments', () => {
  const router = mod.createRouter([
    { prefix: '/static', pool: 'cdn' },
    { prefix: '/api', pool: 'api' },
    { prefix: '/', pool: 'web' },
  ]);
  expect(router.route('/api')).toBe('api');
  expect(router.route('/api/users/7')).toBe('api');
  expect(router.route('/static/app.js')).toBe('cdn');
  expect(router.route('/apiary')).toBe('web');
  expect(mod.createRouter([{ prefix: '/api', pool: 'api' }]).route('/admin')).toBeNull();
});

// beginner mistake: taking the first matching prefix instead of the longest one
test('route lets the longest matching prefix win, whatever the order of the routes', () => {
  const router = mod.createRouter([
    { prefix: '/', pool: 'web' },
    { prefix: '/api', pool: 'api' },
    { prefix: '/api/v2', pool: 'api-v2' },
  ]);
  expect(router.route('/api/v2/orders')).toBe('api-v2');
  expect(router.route('/api/v1/orders')).toBe('api');
  expect(router.route('/about')).toBe('web');
  const reversed = mod.createRouter([
    { prefix: '/api/v2', pool: 'api-v2' },
    { prefix: '/api', pool: 'api' },
  ]);
  expect(reversed.route('/api/v2/users')).toBe('api-v2');
  expect(reversed.route('/api/users')).toBe('api');
});

test('pick sends each request to the less loaded of two sampled backends', () => {
  const balancer = mod.createP2C(['a', 'b', 'c', 'd'], sequence(0, 0, 0, 0, 0.5, 0.9, 0, 0.99, 0.25, 0));
  expect(balancer.pick()).toBe('a');
  expect(balancer.pick()).toBe('b');
  expect(balancer.pick()).toBe('c');
  expect(balancer.pick()).toBe('d');
  expect(['a', 'b', 'c', 'd'].map((name) => balancer.inFlight(name))).toEqual([1, 1, 1, 1]);
  balancer.release('a');
  expect(balancer.pick()).toBe('a');
  expect(balancer.inFlight('a')).toBe(1);
});

test('pick samples two distinct backends, breaks ties with the first sample and release never goes below zero', () => {
  const pair = mod.createP2C(['x', 'y'], sequence(0.1, 0.1, 0.1, 0.1));
  expect(pair.pick()).toBe('x');
  expect(pair.pick()).toBe('y');
  pair.release('y');
  pair.release('y');
  pair.release('ghost');
  expect(pair.inFlight('y')).toBe(0);
  expect(pair.inFlight('ghost')).toBe(0);
  expect(mod.createP2C(['solo'], () => 0.5).pick()).toBe('solo');
  expect(() => mod.createP2C([], () => 0.5).pick()).toThrow('no backends');
});
