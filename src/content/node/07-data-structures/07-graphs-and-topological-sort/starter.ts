export type DependencyGraph = Record<string, string[]>;

export class CycleError extends Error {
  constructor(readonly cycle: string[]) {
    super(`Dependency cycle: ${cycle.join(' -> ')}`);
    this.name = 'CycleError';
  }
}

export function topologicalSort(graph: DependencyGraph): string[] {
  // TODO: depth-first search with 'visiting' and 'done' states; append a node after its dependencies
  // TODO: when a 'visiting' node is reached again, throw new CycleError(path from that node back to it)
  return Object.keys(graph);
}

export function executionWaves(graph: DependencyGraph): string[][] {
  // TODO: count unmet dependencies per node, start with the zero-count nodes, build sorted waves (Kahn's algorithm)
  return [topologicalSort(graph)];
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
