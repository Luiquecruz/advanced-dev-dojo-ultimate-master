Add a type parameter and use it in both the parameter and the return type: `function first<T>(items: readonly T[]): T | undefined`.
---
`zip` needs two type parameters, one per array, and returns `[TLeft, TRight][]`. Build the result with a loop up to `Math.min(left.length, right.length)`.
---
`compose` needs three: `f: (input: TInput) => TMiddle`, `g: (value: TMiddle) => TOutput`, returning `(input: TInput) => TOutput`.
