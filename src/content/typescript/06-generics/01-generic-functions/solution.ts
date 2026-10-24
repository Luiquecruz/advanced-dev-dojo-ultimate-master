function first<T>(items: readonly T[]): T | undefined {
  return items[0];
}

function last<T>(items: readonly T[]): T | undefined {
  return items[items.length - 1];
}

function zip<TLeft, TRight>(left: readonly TLeft[], right: readonly TRight[]): [TLeft, TRight][] {
  const length = Math.min(left.length, right.length);
  const pairs: [TLeft, TRight][] = [];
  for (let index = 0; index < length; index++) {
    pairs.push([left[index], right[index]]);
  }
  return pairs;
}

function compose<TInput, TMiddle, TOutput>(
  f: (input: TInput) => TMiddle,
  g: (value: TMiddle) => TOutput,
): (input: TInput) => TOutput {
  return (input) => g(f(input));
}
