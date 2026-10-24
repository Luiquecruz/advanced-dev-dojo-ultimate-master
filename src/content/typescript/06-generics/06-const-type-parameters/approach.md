1. Add `const` before `T` in each of the three functions.
2. Keep `T[number]` as the guarded type in `oneOf`; it becomes a literal union once `T` is a tuple.
3. Implement the guard with a `typeof` check followed by `includes`.
4. Confirm that no `as const` is needed anywhere.
