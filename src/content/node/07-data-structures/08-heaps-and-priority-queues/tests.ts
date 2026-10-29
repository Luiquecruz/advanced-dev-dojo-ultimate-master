const random = (seed: number) => () => {
  seed = (seed * 1103515245 + 12345) % 2147483648;
  return seed / 2147483648;
};

test('pop returns items in compare order, with peek and size', () => {
  const queue = new mod.PriorityQueue((a: number, b: number) => a - b);
  expect(queue.pop()).toBeUndefined();
  expect(queue.peek()).toBeUndefined();
  [5, 1, 8, 3, 9, 2, 7, 3].forEach((value) => queue.push(value));
  expect(queue.size).toBe(8);
  expect(queue.peek()).toBe(1);
  const out: number[] = [];
  while (queue.size > 0) out.push(queue.pop());
  expect(out).toEqual([1, 2, 3, 3, 5, 7, 8, 9]);
  expect(queue.pop()).toBeUndefined();
});

test('the comparator decides the direction (max-heap of job priorities)', () => {
  const queue = new mod.PriorityQueue((a: any, b: any) => b.priority - a.priority);
  queue.push({ id: 'export', priority: 1 });
  queue.push({ id: 'password-reset', priority: 10 });
  queue.push({ id: 'invoice', priority: 5 });
  expect(queue.pop().id).toBe('password-reset');
  queue.push({ id: 'login-alert', priority: 8 });
  expect([queue.pop().id, queue.pop().id, queue.pop().id]).toEqual(['login-alert', 'invoice', 'export']);
});

test('100 000 pushes and pops stay ordered with O(log n) comparisons each', () => {
  let comparisons = 0;
  const queue = new mod.PriorityQueue((a: number, b: number) => {
    comparisons++;
    return a - b;
  });
  const next = random(7);
  const startedAt = performance.now();
  for (let index = 0; index < 100_000; index++) queue.push(Math.floor(next() * 1_000_000));
  let previous = -1;
  for (let index = 0; index < 100_000; index++) {
    const value = queue.pop();
    if (value < previous) throw new Error('pop returned items out of order');
    previous = value;
  }
  const elapsed = performance.now() - startedAt;
  expect(queue.size).toBe(0);
  expect(comparisons).toBeLessThan(5_000_000);
  expect(elapsed).toBeLessThan(600);
});

test('takeDue pops every due job in runAt order and leaves the rest', () => {
  const queue = new mod.PriorityQueue((a: any, b: any) => a.runAt - b.runAt);
  [['digest', 300], ['retry', 100], ['trial', 200], ['report', 250], ['cleanup', 900]].forEach(([id, runAt]) => queue.push({ id, runAt }));
  expect(mod.takeDue(queue, 250).map((job: any) => job.id)).toEqual(['retry', 'trial', 'report']);
  expect(queue.size).toBe(2);
  expect(mod.takeDue(queue, 250)).toEqual([]);
  expect(mod.takeDue(queue, 1_000).map((job: any) => job.id)).toEqual(['digest', 'cleanup']);
});

test('topK returns the k highest scores, highest first, from any iterable', () => {
  const requests = [
    { path: '/a', ms: 120 },
    { path: '/b', ms: 2 },
    { path: '/c', ms: 870 },
    { path: '/d', ms: 45 },
    { path: '/e', ms: 300 },
  ];
  expect(mod.topK(requests, 3, (request: any) => request.ms).map((request: any) => request.path)).toEqual(['/c', '/e', '/a']);
  expect(mod.topK(requests, 10, (request: any) => request.ms).length).toBe(5);
  expect(mod.topK(requests, 0, (request: any) => request.ms)).toEqual([]);
  function* stream() {
    for (let index = 0; index < 200_000; index++) yield { id: index, ms: (index * 7919) % 200_000 };
  }
  expect(mod.topK(stream(), 3, (entry: any) => entry.ms).map((entry: any) => entry.ms)).toEqual([199_999, 199_998, 199_997]);
});
