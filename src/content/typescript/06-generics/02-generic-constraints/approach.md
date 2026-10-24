1. Introduce a type parameter per function and move the old parameter type into its `extends` constraint.
2. Use the type parameter in the return type so the caller's exact type comes back.
3. Accept `readonly T[]` and copy before sorting so the input is never mutated.
4. For `totalBy`, let `T` flow from the array into the selector callback and sum with `reduce`.
