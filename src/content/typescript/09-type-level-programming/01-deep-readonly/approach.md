1. Write `DeepReadonly` as a conditional type that returns function types untouched and otherwise applies a recursive homomorphic mapped type with `readonly`.
2. Rely on homomorphic mapping for arrays, tuples and primitives instead of writing extra branches for them.
3. Write `DeepPartial` as a chain of conditional types: functions and arrays return `T`, other objects map every key to an optional recursive property, primitives return `T`.
4. Implement `deepFreeze` recursively over `Object.values`, freezing children before the parent, and assert the returned reference to `DeepReadonly<T>`.
