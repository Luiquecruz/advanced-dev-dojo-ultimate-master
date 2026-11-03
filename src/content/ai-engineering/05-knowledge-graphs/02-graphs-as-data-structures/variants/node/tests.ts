function node(id: string, label = 'Thing', properties: Record<string, unknown> = {}) {
  return { id, label, properties: { name: id, ...properties } };
}

function graphOf(ids: string[], edges: Array<[string, string, string]>, labels: Record<string, string> = {}) {
  const graph = new mod.PropertyGraph();
  ids.forEach((id) => graph.addNode(node(id, labels[id] ?? 'Thing')));
  edges.forEach(([from, type, to]) => graph.addEdge({ from, type, to }));
  return graph;
}

function organization() {
  const labels: Record<string, string> = {
    payments: 'Team', checkout: 'Team', growth: 'Team', search: 'Team',
    'payments-api': 'Service', 'invoices-worker': 'Service', 'checkout-web': 'Service', recommendations: 'Service', 'search-api': 'Service',
    'payments-db': 'Database', 'cache': 'Database',
  };
  return graphOf(Object.keys(labels), [
    ['payments', 'OWNS', 'payments-api'],
    ['payments', 'OWNS', 'invoices-worker'],
    ['checkout', 'OWNS', 'checkout-web'],
    ['growth', 'OWNS', 'recommendations'],
    ['search', 'OWNS', 'search-api'],
    ['payments-api', 'DEPENDS_ON', 'payments-db'],
    ['invoices-worker', 'DEPENDS_ON', 'payments-db'],
    ['checkout-web', 'DEPENDS_ON', 'payments-api'],
    ['recommendations', 'DEPENDS_ON', 'checkout-web'],
    ['search-api', 'DEPENDS_ON', 'cache'],
    ['checkout-web', 'CALLS', 'search-api'],
  ], labels);
}

function createRandom(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) % 2147483648;
    return state / 2147483648;
  };
}

test('stores nodes and typed directed edges, rejecting duplicate ids and edges to unknown nodes with a GraphError', async () => {
  const graph = new mod.PropertyGraph();
  graph.addNode(node('ana', 'Person', { onCall: true }));
  graph.addNode(node('bruno', 'Person', { onCall: false }));
  graph.addNode(node('payments', 'Team'));
  expect(graph.getNode('ana')).toEqual(node('ana', 'Person', { onCall: true }));
  expect(graph.getNode('nobody')).toBeUndefined();
  const duplicate = await captureError(() => graph.addNode(node('ana', 'Person')));
  expect(duplicate).toBeInstanceOf(mod.GraphError);
  expect(duplicate.message).toContain('ana');
  const dangling = await captureError(() => graph.addEdge({ from: 'ana', to: 'ghost-team', type: 'MEMBER_OF' }));
  expect(dangling).toBeInstanceOf(mod.GraphError);
  expect(dangling.message).toContain('ghost-team');
  expect(graph.neighbors('ana')).toEqual([]);
  expect(graph.findNodes('Person').map((found: { id: string }) => found.id)).toEqual(['ana', 'bruno']);
  expect(graph.findNodes('Person', { onCall: true }).map((found: { id: string }) => found.id)).toEqual(['ana']);
  expect(graph.findNodes('Team', { onCall: true })).toEqual([]);
});

test('neighbors follows outgoing, incoming or both directions in insertion order and filters by edge type', async () => {
  const graph = organization();
  const ids = (neighbors: Array<{ node: { id: string } }>) => neighbors.map((neighbor) => neighbor.node.id);
  expect(ids(graph.neighbors('checkout-web'))).toEqual(['payments-api', 'search-api']);
  expect(ids(graph.neighbors('checkout-web', { direction: 'out' }))).toEqual(['payments-api', 'search-api']);
  expect(ids(graph.neighbors('checkout-web', { direction: 'in' }))).toEqual(['checkout', 'recommendations']);
  expect(ids(graph.neighbors('checkout-web', { direction: 'both' }))).toEqual(['payments-api', 'search-api', 'checkout', 'recommendations']);
  expect(ids(graph.neighbors('checkout-web', { direction: 'both', types: ['DEPENDS_ON'] }))).toEqual(['payments-api', 'recommendations']);
  expect(ids(graph.neighbors('payments-db', { direction: 'in' }))).toEqual(['payments-api', 'invoices-worker']);
  const [first] = graph.neighbors('payments', { types: ['OWNS'] });
  expect(first.edge).toEqual({ from: 'payments', type: 'OWNS', to: 'payments-api' });
  expect(await captureError(() => graph.neighbors('ghost'))).toBeInstanceOf(mod.GraphError);
});

test('nodesWithinHops returns each reachable node once at its smallest depth, stops at the depth limit and survives cycles', () => {
  const graph = graphOf(['a', 'b', 'c', 'd', 'e', 'f'], [
    ['a', 'LINKS', 'b'],
    ['a', 'LINKS', 'c'],
    ['b', 'LINKS', 'd'],
    ['c', 'LINKS', 'd'],
    ['d', 'LINKS', 'a'],
    ['d', 'LINKS', 'e'],
    ['e', 'LINKS', 'f'],
    ['f', 'OTHER', 'b'],
  ]);
  const summary = (reached: Array<{ node: { id: string }; depth: number }>) => reached.map((entry) => `${entry.node.id}@${entry.depth}`);
  expect(summary(mod.nodesWithinHops(graph, 'a', 1))).toEqual(['b@1', 'c@1']);
  expect(summary(mod.nodesWithinHops(graph, 'a', 2))).toEqual(['b@1', 'c@1', 'd@2']);
  expect(summary(mod.nodesWithinHops(graph, 'a', 10))).toEqual(['b@1', 'c@1', 'd@2', 'e@3', 'f@4']);
  expect(summary(mod.nodesWithinHops(graph, 'a', 0))).toEqual([]);
  expect(summary(mod.nodesWithinHops(graph, 'd', 2, { direction: 'in', types: ['LINKS'] }))).toEqual(['b@1', 'c@1', 'a@2']);
  expect(summary(mod.nodesWithinHops(graph, 'f', 1, { direction: 'both' }))).toEqual(['b@1', 'e@1']);
});

test('shortestPath returns the path with the fewest hops, reconstructed from the start, or null beyond the depth limit', () => {
  const graph = graphOf(['start', 'long-1', 'long-2', 'long-3', 'short-1', 'goal', 'island'], [
    ['start', 'NEXT', 'long-1'],
    ['long-1', 'NEXT', 'long-2'],
    ['long-2', 'NEXT', 'long-3'],
    ['long-3', 'NEXT', 'goal'],
    ['start', 'NEXT', 'short-1'],
    ['short-1', 'NEXT', 'goal'],
  ]);
  const path = mod.shortestPath(graph, 'start', 'goal', { maxDepth: 5 });
  expect(path.nodes).toEqual(['start', 'short-1', 'goal']);
  expect(path.edges).toEqual([
    { from: 'start', type: 'NEXT', to: 'short-1' },
    { from: 'short-1', type: 'NEXT', to: 'goal' },
  ]);
  expect(mod.shortestPath(graph, 'start', 'goal', { maxDepth: 1 })).toBeNull();
  expect(mod.shortestPath(graph, 'start', 'goal', { maxDepth: 2 }).nodes).toHaveLength(3);
  expect(mod.shortestPath(graph, 'start', 'island', { maxDepth: 10 })).toBeNull();
  expect(mod.shortestPath(graph, 'goal', 'start', { maxDepth: 10 })).toBeNull();
  expect(mod.shortestPath(graph, 'start', 'start', { maxDepth: 3 })).toEqual({ nodes: ['start'], edges: [] });
  const backwards = mod.shortestPath(graph, 'goal', 'start', { maxDepth: 10, direction: 'both' });
  expect(backwards.nodes).toEqual(['goal', 'short-1', 'start']);
  expect(backwards.edges).toEqual([
    { from: 'short-1', type: 'NEXT', to: 'goal' },
    { from: 'start', type: 'NEXT', to: 'short-1' },
  ]);
});

test('shortestPath matches a reference breadth-first distance on random graphs, and every returned path is made of real edges', () => {
  for (let seed = 1; seed <= 25; seed++) {
    const random = createRandom(seed);
    const ids = Array.from({ length: 12 }, (_, index) => `n${index}`);
    const edges: Array<[string, string, string]> = [];
    for (let count = 0; count < 18; count++) {
      edges.push([ids[Math.floor(random() * ids.length)], random() < 0.5 ? 'A' : 'B', ids[Math.floor(random() * ids.length)]]);
    }
    const graph = graphOf(ids, edges);
    const distances = new Map<string, number>([['n0', 0]]);
    let frontier = ['n0'];
    while (frontier.length > 0) {
      const next: string[] = [];
      for (const id of frontier) {
        for (const [from, , to] of edges) {
          if (from === id && !distances.has(to)) {
            distances.set(to, distances.get(id)! + 1);
            next.push(to);
          }
        }
      }
      frontier = next;
    }
    for (const target of ids.slice(1)) {
      const path = mod.shortestPath(graph, 'n0', target, { maxDepth: 4 });
      const expected = distances.get(target);
      if (expected === undefined || expected > 4) {
        expect(path).toBeNull();
        continue;
      }
      expect(path.edges).toHaveLength(expected);
      expect(path.nodes[0]).toBe('n0');
      expect(path.nodes[path.nodes.length - 1]).toBe(target);
      path.edges.forEach((edge: { from: string; to: string; type: string }, index: number) => {
        expect(edge.from).toBe(path.nodes[index]);
        expect(edge.to).toBe(path.nodes[index + 1]);
        expect(edges.some(([from, type, to]) => from === edge.from && type === edge.type && to === edge.to)).toBe(true);
      });
    }
  }
});

test('followPattern answers a multi-hop question step by step, keeping distinct nodes in discovery order', () => {
  const graph = organization();
  const ids = (nodes: Array<{ id: string }>) => nodes.map((found) => found.id);
  expect(ids(mod.followPattern(graph, ['payments-db'], [{ type: 'DEPENDS_ON', direction: 'in' }]))).toEqual(['payments-api', 'invoices-worker']);
  expect(ids(mod.followPattern(graph, ['payments-db'], [
    { type: 'DEPENDS_ON', direction: 'in' },
    { type: 'OWNS', direction: 'in' },
  ]))).toEqual(['payments']);
  expect(ids(mod.followPattern(graph, ['payments', 'checkout'], [
    { type: 'OWNS', direction: 'out' },
    { type: 'DEPENDS_ON', direction: 'out' },
  ]))).toEqual(['payments-db', 'payments-api']);
  expect(ids(mod.followPattern(graph, ['cache'], [{ type: 'OWNS', direction: 'in' }]))).toEqual([]);
  expect(ids(mod.followPattern(graph, ['growth'], []))).toEqual(['growth']);
});

test('teamsAffectedBy finds the owners of every service that depends on a node within the hop limit, sorted and without duplicates', () => {
  const graph = organization();
  expect(mod.teamsAffectedBy(graph, 'payments-db', 1)).toEqual(['payments']);
  expect(mod.teamsAffectedBy(graph, 'payments-db', 2)).toEqual(['checkout', 'payments']);
  expect(mod.teamsAffectedBy(graph, 'payments-db', 3)).toEqual(['checkout', 'growth', 'payments']);
  expect(mod.teamsAffectedBy(graph, 'payments-db', 10)).toEqual(['checkout', 'growth', 'payments']);
  expect(mod.teamsAffectedBy(graph, 'cache', 3)).toEqual(['search']);
  expect(mod.teamsAffectedBy(graph, 'recommendations', 3)).toEqual([]);
});
