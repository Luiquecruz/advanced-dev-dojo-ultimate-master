function referenceRing(names: string[], virtualNodes: number) {
  const positions = names
    .flatMap((node) => Array.from({ length: virtualNodes }, (_, index) => ({ position: mod.hash32(`${node}#${index}`), node })))
    .sort((left, right) => left.position - right.position);
  const startOf = (key: string) => {
    const hash = mod.hash32(key);
    const index = positions.findIndex(({ position }) => position >= hash);
    return index === -1 ? 0 : index;
  };
  return {
    owner: (key: string) => positions[startOf(key)].node,
    replicas: (key: string, count: number) => {
      const found: string[] = [];
      const start = startOf(key);
      for (let step = 0; step < positions.length && found.length < count; step++) {
        const node = positions[(start + step) % positions.length].node;
        if (!found.includes(node)) found.push(node);
      }
      return found;
    },
  };
}

function ringOf(names: string[], virtualNodes: number) {
  const ring = mod.createHashRing({ virtualNodes });
  names.forEach((name) => ring.addNode(name));
  return ring;
}

const FOUR = ['node-1', 'node-2', 'node-3', 'node-4'];
const keys = (count: number, prefix = 'key-') => Array.from({ length: count }, (_, index) => `${prefix}${index}`);

test('a key belongs to the first virtual node clockwise, and the ring wraps around', () => {
  expect(mod.createHashRing({ virtualNodes: 10 }).nodeFor('anything')).toBeUndefined();
  const ring = ringOf(FOUR, 10);
  const reference = referenceRing(FOUR, 10);
  for (const key of keys(300)) {
    expect(ring.nodeFor(key)).toBe(reference.owner(key));
  }
  ring.addNode('node-1');
  expect(ring.nodeFor('key-7')).toBe(reference.owner('key-7'));
});

// beginner mistake: hash(key) % N, which remaps almost every key when a node joins
test('adding a fifth node moves well under half of the keys, and only to the new node', () => {
  const ring = ringOf(FOUR, 100);
  const before = new Map(keys(1000).map((key) => [key, ring.nodeFor(key)]));
  ring.addNode('node-5');
  const moved = keys(1000).filter((key) => ring.nodeFor(key) !== before.get(key));
  expect(moved.length).toBeGreaterThan(0);
  expect(moved.length).toBeLessThan(350);
  expect(moved.filter((key) => ring.nodeFor(key) !== 'node-5')).toEqual([]);
});

test('removing a node moves only its own keys, and they spread over the other nodes', () => {
  const ring = ringOf(FOUR, 100);
  ring.addNode('node-2');
  const before = new Map(keys(1000).map((key) => [key, ring.nodeFor(key)]));
  ring.removeNode('node-2');
  ring.removeNode('node-9');
  const receivers = new Set<string>();
  for (const key of keys(1000)) {
    const owner = ring.nodeFor(key);
    expect(owner).not.toBe('node-2');
    if (before.get(key) === 'node-2') {
      receivers.add(owner);
    } else {
      expect(owner).toBe(before.get(key));
    }
  }
  expect([...receivers].sort()).toEqual(['node-1', 'node-3', 'node-4']);
});

test('100 virtual nodes per node balance 10,000 keys far better than one position per node', () => {
  const shares = (virtualNodes: number) => {
    const ring = ringOf(FOUR, virtualNodes);
    const counts = new Map<string, number>();
    for (const key of keys(10000, 'user:')) {
      const owner = ring.nodeFor(key);
      counts.set(owner, (counts.get(owner) ?? 0) + 1);
    }
    return FOUR.map((node) => (counts.get(node) ?? 0) / 10000);
  };
  const single = shares(1);
  const many = shares(100);
  expect(Math.max(...single)).toBeGreaterThan(0.4);
  for (const share of many) {
    expect(share).toBeGreaterThan(0.18);
    expect(share).toBeLessThan(0.32);
  }
});

test('replicas are distinct physical nodes met clockwise, starting with the owner', () => {
  const ring = ringOf(FOUR, 50);
  const reference = referenceRing(FOUR, 50);
  for (const key of keys(200)) {
    const replicas = ring.nodesFor(key, 3);
    expect(replicas).toEqual(reference.replicas(key, 3));
    expect(new Set(replicas).size).toBe(3);
    expect(replicas[0]).toBe(ring.nodeFor(key));
  }
  expect(ring.nodesFor('key-1', 10).sort()).toEqual(FOUR);
  expect(mod.createHashRing({ virtualNodes: 5 }).nodesFor('key-1', 2)).toEqual([]);
});
