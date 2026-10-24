1. Write `Mutable` as a homomorphic mapped type over `keyof T` with the `-readonly` modifier; homomorphism keeps arrays as arrays.
2. Write `Concrete` the same way with `-?` after the key clause.
3. Write `Nullable` as a homomorphic mapped type whose value is `T[K] | null`, without touching modifiers.
4. Write `FlagMap` by iterating over the `Keys` union itself and mapping every key to `boolean`.
5. Implement `createFlags` with `Object.fromEntries` and assert the result to `FlagMap<Keys>`.
