Start from the homomorphic skeleton `{ [K in keyof T]: T[K] }` and change only the modifiers or the value side.
---
Modifiers can be removed with a minus sign: `-readonly` goes before the brackets, `-?` goes after them.
---
`Nullable` keeps modifiers for free as long as you iterate over `keyof T`; just change the value side to `T[K] | null`. `FlagMap` iterates over `Keys` directly: `{ [K in Keys]: boolean }`.
---
At runtime, `Object.fromEntries(keys.map((key) => [key, false]))` builds the object. Its static type is a plain dictionary, so finish with `as FlagMap<Keys>`.
