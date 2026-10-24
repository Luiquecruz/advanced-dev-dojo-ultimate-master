// TODO: make every function generic so that types flow from the inputs to the output

function first(items: readonly unknown[]): unknown {
  return items[0];
}

function last(items: readonly unknown[]): unknown {
  // TODO: return the last element
  return undefined;
}

function zip(left: readonly unknown[], right: readonly unknown[]): unknown[][] {
  // TODO: pair the elements by index, stopping at the shorter array
  return [];
}

function compose(f: (input: unknown) => unknown, g: (value: unknown) => unknown): (input: unknown) => unknown {
  return (input) => g(f(input));
}
