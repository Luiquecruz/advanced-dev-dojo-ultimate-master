Every helper has the shape `T extends <pattern with infer X> ? X : <fallback>`. For functions, the pattern is `(...args: infer P) => infer R`.
---
`FirstArgument` is tricky: a function with **fewer** parameters is assignable to one with more, so `() => void` happily matches `(first: infer A) => unknown` with `A = unknown`. Infer the whole parameter tuple first, then nest a second conditional type that matches it against `[infer First, ...unknown[]]`.
---
`UnwrapPromise` matches `Promise<infer V>` once and returns `T` in the false branch. Do not recurse.
---
For `ToNumber`, put the pattern inside a template literal and constrain the hole: `` S extends `${infer N extends number}` ? N : never ``.
