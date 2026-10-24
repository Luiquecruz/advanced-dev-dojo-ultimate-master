1. Write `If` as a single conditional type on `C extends true`, keeping the `boolean` constraint on `C`.
2. Write `IsString` the same way, returning the literal types `true` and `false`.
3. Build `TypeName` as a chain of conditional types ordered like the table, each `false` branch holding the next check, ending with `'object'`.
4. For `Flatten`, check against `readonly unknown[]` so mutable arrays, readonly arrays and tuples all match, and return `T[number]`.
5. Implement `typeName` with the runtime `typeof` operator and assert the result to `TypeName<T>`, because the compiler defers conditional types over unresolved generics.
