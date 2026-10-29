export type DependencyGraph = Record<string, string[]>;

export class CycleError extends Error {
  constructor(readonly cycle: string[]) {
    super(`Dependency cycle: ${cycle.join(' -> ')}`);
    this.name = 'CycleError';
  }
}

export function topologicalSort(graph: DependencyGraph): string[] {
  const state = new Map<string, 'visiting' | 'done'>();
  const path: string[] = [];
  const order: string[] = [];

  const visit = (node: string): void => {
    const current = state.get(node);
    if (current === 'done') {
      return;
    }
    if (current === 'visiting') {
      throw new CycleError([...path.slice(path.indexOf(node)), node]);
    }
    state.set(node, 'visiting');
    path.push(node);
    for (const dependency of graph[node] ?? []) {
      visit(dependency);
    }
    path.pop();
    state.set(node, 'done');
    order.push(node);
  };

  for (const node of Object.keys(graph)) {
    visit(node);
  }
  return order;
}

export function executionWaves(graph: DependencyGraph): string[][] {
  const nodes = topologicalSort(graph);
  const remaining = new Map<string, number>();
  const dependents = new Map<string, string[]>();
  for (const node of nodes) {
    const dependencies = new Set(graph[node] ?? []);
    remaining.set(node, dependencies.size);
    for (const dependency of dependencies) {
      const list = dependents.get(dependency);
      if (list) {
        list.push(node);
      } else {
        dependents.set(dependency, [node]);
      }
    }
  }

  const waves: string[][] = [];
  let wave = nodes.filter((node) => remaining.get(node) === 0).sort();
  while (wave.length > 0) {
    waves.push(wave);
    const next: string[] = [];
    for (const node of wave) {
      for (const dependent of dependents.get(node) ?? []) {
        const count = remaining.get(dependent)! - 1;
        remaining.set(dependent, count);
        if (count === 0) {
          next.push(dependent);
        }
      }
    }
    wave = next.sort();
  }
  return waves;
}

const migrations: DependencyGraph = {
  'add-order-index': ['add-orders'],
  'add-orders': ['create-users'],
  'seed-admin': ['create-users'],
};

console.log(topologicalSort(migrations));
console.log(executionWaves(migrations));
try {
  topologicalSort({ a: ['b'], b: ['c'], c: ['a'] });
} catch (error) {
  console.log((error as Error).message);
}
