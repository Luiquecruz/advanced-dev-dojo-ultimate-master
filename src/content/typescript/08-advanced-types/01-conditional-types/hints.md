The shape of every helper is `T extends Something ? WhenTrue : WhenFalse`. For `If`, check `C extends true`.
---
`TypeName` is a chain: put the next conditional type in the false branch of the previous one, and end with `'object'` as the final fallback.
---
`Flatten` can check `T extends readonly unknown[]` (covers mutable arrays, readonly arrays and tuples) and then read the element type with the indexed access `T[number]`.
---
At runtime `typeof value` already produces the right string; the compiler cannot connect it to `TypeName<T>` on its own, so finish with `as TypeName<T>`.
