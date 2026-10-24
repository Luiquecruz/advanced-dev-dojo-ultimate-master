1. Build `Paths` as a mapped type over the string keys of `T`, indexed by those keys to collapse the per-key results into one union.
2. For each key, return the key alone for leaves (arrays and functions), the key plus the prefixed recursive paths for plain objects, and the key alone for primitives.
3. Build `Get` as a recursive conditional type that splits the path at the first dot, checks the head against `keyof T` and descends into `T[Head]`.
4. Implement `getByPath` by reducing over the path segments with an `unknown` cursor and asserting the result to `Get<T, P>`.
