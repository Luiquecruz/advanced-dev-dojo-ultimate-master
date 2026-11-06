const pick = (balancer: { next(): string }, count: number) => Array.from({ length: count }, () => balancer.next());

test('next() walks the servers in order and wraps around', () => {
  const balancer = mod.createRoundRobin(['a', 'b', 'c']);
  expect(pick(balancer, 7)).toEqual(['a', 'b', 'c', 'a', 'b', 'c', 'a']);
  expect(balancer.healthy()).toEqual(['a', 'b', 'c']);
});

// beginner mistake: rotating over a shrinking healthy list by counter, or skipping only one server, so a down server is hit or a healthy one is skipped
test('after servers go down mid-rotation, next() continues with the next healthy server and never picks a down one', () => {
  const balancer = mod.createRoundRobin(['a', 'b', 'c', 'd', 'e']);
  expect(pick(balancer, 2)).toEqual(['a', 'b']);
  balancer.markDown('a');
  balancer.markDown('c');
  balancer.markDown('d');
  expect(pick(balancer, 4)).toEqual(['e', 'b', 'e', 'b']);
  expect(balancer.healthy()).toEqual(['b', 'e']);
  balancer.markDown('b');
  balancer.markUp('a');
  expect(pick(balancer, 3)).toEqual(['e', 'a', 'e']);
});

test('marking a server up puts it back at its place in the rotation', () => {
  const balancer = mod.createRoundRobin(['a', 'b', 'c']);
  balancer.markDown('b');
  expect(pick(balancer, 3)).toEqual(['a', 'c', 'a']);
  balancer.markUp('b');
  expect(pick(balancer, 4)).toEqual(['b', 'c', 'a', 'b']);
  expect(balancer.healthy()).toEqual(['a', 'b', 'c']);
});

test('next() fails with "no healthy servers" when every server is down, and recovers once a server is marked up', () => {
  const balancer = mod.createRoundRobin(['a', 'b']);
  balancer.markDown('a');
  balancer.markDown('b');
  expect(() => balancer.next()).toThrow('no healthy servers');
  expect(balancer.healthy()).toEqual([]);
  balancer.markUp('b');
  expect(pick(balancer, 2)).toEqual(['b', 'b']);
  expect(() => mod.createRoundRobin([]).next()).toThrow('no healthy servers');
});
