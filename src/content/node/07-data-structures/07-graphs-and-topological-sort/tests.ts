const expectValidOrder = (graph: Record<string, string[]>, order: string[]) => {
  const nodes = new Set([...Object.keys(graph), ...Object.values(graph).flat()]);
  expect(order.length).toBe(nodes.size);
  expect(new Set(order).size).toBe(nodes.size);
  const position = new Map(order.map((node, index) => [node, index]));
  for (const [node, dependencies] of Object.entries(graph)) {
    for (const dependency of dependencies) {
      if (position.get(dependency)! > position.get(node)!) throw new Error(`${dependency} must come before ${node}`);
    }
  }
};

const catchError = (run: () => unknown): any => {
  try {
    run();
  } catch (error) {
    return error;
  }
  return undefined;
};

const migrations = {
  'add-order-index': ['add-orders'],
  'add-orders': ['create-users', 'create-products'],
  'seed-admin': ['create-users'],
  'add-reviews': ['add-orders', 'create-products'],
  'create-products': [],
};

test('topologicalSort puts every node after its dependencies, including dependency-only nodes', () => {
  const order = mod.topologicalSort(migrations);
  expectValidOrder(migrations, order);
  expect(order).toContain('create-users');
  expectValidOrder({ a: [], b: ['a'], c: ['a', 'b'], d: ['b', 'c'] }, mod.topologicalSort({ a: [], b: ['a'], c: ['a', 'b'], d: ['b', 'c'] }));
});

test('a cycle throws CycleError with the cycle path in the error', () => {
  const graph = { start: ['a'], a: ['b'], b: ['c'], c: ['a'], other: [] };
  const error = catchError(() => mod.topologicalSort(graph));
  expect(error).toBeInstanceOf(mod.CycleError);
  const cycle: string[] = error.cycle;
  expect(cycle.length).toBe(4);
  expect(cycle[0]).toBe(cycle[3]);
  expect([...cycle.slice(0, 3)].sort()).toEqual(['a', 'b', 'c']);
  for (let index = 0; index < cycle.length - 1; index++) {
    expect((graph as any)[cycle[index]]).toContain(cycle[index + 1]);
  }
  expect(error.message).toBe(`Dependency cycle: ${cycle.join(' -> ')}`);
});

test('a self-dependency is a cycle and diamonds are not', () => {
  expect(catchError(() => mod.topologicalSort({ a: ['a'] }))?.cycle).toEqual(['a', 'a']);
  const diamond = { app: ['auth', 'billing'], auth: ['db'], billing: ['db'], db: [] };
  expect(catchError(() => mod.topologicalSort(diamond))).toBeUndefined();
  expectValidOrder(diamond, mod.topologicalSort(diamond));
});

test('executionWaves groups nodes into sorted parallel waves', () => {
  expect(mod.executionWaves(migrations)).toEqual([
    ['create-products', 'create-users'],
    ['add-orders', 'seed-admin'],
    ['add-order-index', 'add-reviews'],
  ]);
  expect(mod.executionWaves({ c: ['a'], b: [], a: [] })).toEqual([['a', 'b'], ['c']]);
  expect(catchError(() => mod.executionWaves({ x: ['y'], y: ['x'] }))).toBeInstanceOf(mod.CycleError);
});

test('20 000 migrations are sorted and grouped in linear time', () => {
  const graph: Record<string, string[]> = {};
  for (let index = 1; index <= 20_000; index++) {
    graph[`m${index}`] = [...new Set([Math.floor(index / 2), Math.floor(index / 3), Math.floor(index / 5)])].filter((dependency) => dependency > 0).map((dependency) => `m${dependency}`);
  }
  const startedAt = performance.now();
  const order = mod.topologicalSort(graph);
  const waves = mod.executionWaves(graph);
  const elapsed = performance.now() - startedAt;
  expectValidOrder(graph, order);
  expect(waves[0]).toEqual(['m1']);
  expect(waves.flat().length).toBe(20_000);
  expect(elapsed).toBeLessThan(400);
});
