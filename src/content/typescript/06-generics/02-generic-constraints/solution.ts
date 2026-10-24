function longest<T extends { length: number }>(a: T, b: T): T {
  return a.length >= b.length ? a : b;
}

function byPriority<T extends { priority: number }>(items: readonly T[]): T[] {
  return [...items].sort((left, right) => right.priority - left.priority);
}

function totalBy<T>(items: readonly T[], select: (item: T) => number): number {
  return items.reduce((sum, item) => sum + select(item), 0);
}
