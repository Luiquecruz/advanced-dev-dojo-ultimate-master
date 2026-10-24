// TODO: make longest generic with a { length: number } constraint
function longest(a: { length: number }, b: { length: number }): { length: number } {
  return a.length >= b.length ? a : b;
}

// TODO: make byPriority generic with a { priority: number } constraint and stop mutating the input
function byPriority(items: { priority: number }[]): { priority: number }[] {
  return items.sort((left, right) => right.priority - left.priority);
}

// TODO: make totalBy generic over the item type
function totalBy(items: readonly unknown[], select: (item: unknown) => number): number {
  return 0;
}
