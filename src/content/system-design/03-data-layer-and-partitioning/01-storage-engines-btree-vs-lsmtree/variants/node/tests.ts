test('a full MemTable flushes into an SSTable sorted by key, and reads find keys in both', () => {
  const store = mod.createLsmStore({ memtableLimit: 3 });
  store.put('cherry', 'red');
  store.put('apple', 'green');
  store.put('apple', 'yellow');
  expect(store.sstableCount()).toBe(0);
  expect(store.get('apple')).toBe('yellow');
  store.put('banana', 'yellow');
  expect(store.sstableCount()).toBe(1);
  expect(store.sstables()).toEqual([[['apple', 'yellow'], ['banana', 'yellow'], ['cherry', 'red']]]);
  store.put('date', 'brown');
  expect(store.get('cherry')).toBe('red');
  expect(store.get('date')).toBe('brown');
  expect(store.get('fig')).toBeUndefined();
});

test('the newest write wins across the MemTable and several SSTables, deletes included', () => {
  const store = mod.createLsmStore({ memtableLimit: 2 });
  store.put('a', 'v1');
  store.put('b', 'b1');
  store.put('a', 'v2');
  store.put('c', 'c1');
  expect(store.sstableCount()).toBe(2);
  expect(store.get('a')).toBe('v2');
  store.put('a', 'v3');
  expect(store.get('a')).toBe('v3');
  expect(store.get('b')).toBe('b1');
  store.delete('b');
  expect(store.sstableCount()).toBe(3);
  store.put('b', 'b2');
  expect(store.get('b')).toBe('b2');
  expect(store.get('a')).toBe('v3');
});

// beginner mistake: deleting only from the MemTable, so the older SSTable value comes back
test('a delete after a flush writes a tombstone that hides the older SSTable value', () => {
  const store = mod.createLsmStore({ memtableLimit: 2 });
  store.put('session:1', 'ada');
  store.put('session:2', 'alan');
  store.delete('session:1');
  expect(store.get('session:1')).toBeUndefined();
  store.put('session:3', 'grace');
  expect(store.sstableCount()).toBe(2);
  expect(store.sstables()[1]).toEqual([['session:1', null], ['session:3', 'grace']]);
  expect(store.get('session:1')).toBeUndefined();
  expect(store.get('session:2')).toBe('alan');
});

test('compact merges every SSTable into one with the newest values and no tombstones', () => {
  const store = mod.createLsmStore({ memtableLimit: 2 });
  store.put('b', 'b1');
  store.put('a', 'a1');
  store.put('b', 'b2');
  store.delete('a');
  store.put('c', 'c1');
  store.put('d', 'd1');
  store.put('e', 'e1');
  expect(store.sstableCount()).toBe(3);
  store.compact();
  expect(store.sstableCount()).toBe(1);
  expect(store.sstables()).toEqual([[['b', 'b2'], ['c', 'c1'], ['d', 'd1']]]);
  expect(store.get('a')).toBeUndefined();
  expect(store.get('e')).toBe('e1');
  store.delete('b');
  store.delete('c');
  store.delete('d');
  store.compact();
  expect(store.sstables()).toEqual([[['e', 'e1']]]);
  store.delete('e');
  store.delete('x');
  store.compact();
  expect(store.sstableCount()).toBe(0);
  expect(store.get('e')).toBeUndefined();
});
