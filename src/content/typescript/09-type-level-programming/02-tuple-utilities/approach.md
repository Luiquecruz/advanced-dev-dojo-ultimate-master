1. Return `T[number]` for `TupleToUnion` and `T['length']` for `Length`.
2. Match `readonly [infer Head, ...unknown[]]` for `First` and `readonly [...unknown[], infer Tail]` for `Last`, falling back to `never`.
3. Write `Reverse` recursively: peel off the head, reverse the rest, append the head at the end, and return `[]` once the tuple is empty.
4. Implement `last` with `items[items.length - 1]` asserted to `Last<T>`; the `const` type parameter keeps literal types at call sites.
