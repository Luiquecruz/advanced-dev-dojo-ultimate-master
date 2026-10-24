`TupleToUnion` and `Length` are one indexed access each: `T[number]` and `T['length']`.
---
For `First` and `Last`, destructure with `infer` and a rest element. Keep `readonly` in the pattern so `as const` tuples match: `T extends readonly [infer Head, ...unknown[]] ? Head : never`. The rest element can also come first.
---
`Reverse` is recursive: split into `[infer Head, ...infer Rest]`, then build `[...Reverse<Rest>, Head]`. The base case for an empty tuple is `[]`.
---
At runtime, `items[items.length - 1]` returns the last item; assert it to `Last<T>` because the compiler cannot connect an index expression to the conditional type.
