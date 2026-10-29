test('push and unshift link nodes and keep head, tail and size', () => {
  const list = new mod.LinkedList();
  const b = list.push('b');
  const c = list.push('c');
  const a = list.unshift('a');
  expect(list.size).toBe(3);
  expect(list.head).toBe(a);
  expect(list.tail).toBe(c);
  expect(a.prev).toBeNull();
  expect(a.next).toBe(b);
  expect(b.prev).toBe(a);
  expect(c.next).toBeNull();
  expect(list.toArray()).toEqual(['a', 'b', 'c']);
  expect([...list]).toEqual(['a', 'b', 'c']);
  const single = new mod.LinkedList();
  const only = single.unshift('x');
  expect(single.head).toBe(only);
  expect(single.tail).toBe(only);
});

test('shift and pop return values and empty the list cleanly', () => {
  const list = new mod.LinkedList();
  list.push(1);
  list.push(2);
  list.push(3);
  expect(list.shift()).toBe(1);
  expect(list.pop()).toBe(3);
  expect(list.head).toBe(list.tail);
  expect(list.pop()).toBe(2);
  expect(list.size).toBe(0);
  expect(list.head).toBeNull();
  expect(list.tail).toBeNull();
  expect(list.shift()).toBeUndefined();
  expect(list.pop()).toBeUndefined();
});

test('remove unlinks a node from the middle, the head or the tail', () => {
  const list = new mod.LinkedList();
  const [a, b, c, d] = ['a', 'b', 'c', 'd'].map((value) => list.push(value));
  expect(list.remove(b)).toBe('b');
  expect(b.prev).toBeNull();
  expect(b.next).toBeNull();
  expect(a.next).toBe(c);
  expect(c.prev).toBe(a);
  list.remove(a);
  expect(list.head).toBe(c);
  expect(c.prev).toBeNull();
  list.remove(d);
  expect(list.tail).toBe(c);
  expect(c.next).toBeNull();
  expect(list.toArray()).toEqual(['c']);
  expect(list.size).toBe(1);
});

test('moveToBack moves a node to the tail', () => {
  const list = new mod.LinkedList();
  const [a, , c] = ['a', 'b', 'c'].map((value) => list.push(value));
  list.moveToBack(a);
  expect(list.toArray()).toEqual(['b', 'c', 'a']);
  expect(list.tail).toBe(a);
  expect(list.head.prev).toBeNull();
  list.moveToBack(a);
  expect(list.toArray()).toEqual(['b', 'c', 'a']);
  list.moveToBack(c);
  expect(list.toArray()).toEqual(['b', 'a', 'c']);
  expect(list.size).toBe(3);
});

test('removing 50 000 nodes in random order is O(1) per node', () => {
  const list = new mod.LinkedList();
  const nodes = Array.from({ length: 50_000 }, (_, index) => list.push(index));
  let seed = 42;
  for (let index = nodes.length - 1; index > 0; index--) {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    const other = seed % (index + 1);
    [nodes[index], nodes[other]] = [nodes[other], nodes[index]];
  }
  const startedAt = performance.now();
  for (const node of nodes.slice(0, 49_998)) list.remove(node);
  const elapsed = performance.now() - startedAt;
  expect(list.size).toBe(2);
  expect(list.toArray().sort((x: number, y: number) => x - y)).toEqual([nodes[49_998].value, nodes[49_999].value].sort((x, y) => x - y));
  expect(elapsed).toBeLessThan(300);
});

test('expireIdle removes expired connections from the front and stops at the first active one', () => {
  const list = new mod.LinkedList();
  [['a', 100], ['b', 200], ['c', 900], ['d', 950]].forEach(([id, lastSeen]) => list.push({ id, lastSeen }));
  const expired = mod.expireIdle(list, 1_000, 500);
  expect(expired).toEqual([{ id: 'a', lastSeen: 100 }, { id: 'b', lastSeen: 200 }]);
  expect(list.toArray().map((connection: any) => connection.id)).toEqual(['c', 'd']);
  expect(mod.expireIdle(list, 1_000, 500)).toEqual([]);
  const unordered = new mod.LinkedList();
  unordered.push({ id: 'fresh', lastSeen: 990 });
  unordered.push({ id: 'stale', lastSeen: 0 });
  expect(mod.expireIdle(unordered, 1_000, 500)).toEqual([]);
});
