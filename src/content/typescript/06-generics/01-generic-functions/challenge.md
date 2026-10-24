The starter functions use `unknown`, so callers lose every type. Rewrite them as **generic functions** that
preserve types. `any` is not allowed.

1. `first(items)` — returns the first element or `undefined`. Accepts readonly arrays.
   `first([1, 2])` has type `number | undefined`.
2. `last(items)` — same, with the last element.
3. `zip(left, right)` — pairs elements by index into tuples, stopping at the shorter array.
   `zip([1, 2, 3], ['a', 'b'])` returns `[[1, 'a'], [2, 'b']]` typed as `[number, string][]`.
4. `compose(f, g)` — returns a function that applies `f` then `g`.
   `compose((s: string) => s.length, (n: number) => n > 3)` has type `(input: string) => boolean`.
