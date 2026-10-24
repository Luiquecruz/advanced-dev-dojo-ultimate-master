1. Implement `MyExclude` as `T extends U ? never : T` and `MyExtract` with the branches swapped; distribution applies the check to each member.
2. Fix `IsNever` by wrapping both sides of the check in tuples so `never` is no longer distributed into an empty result.
3. Fix `ArrayOf` the same way, checking `[T] extends [unknown]` so the union stays together inside one array.
4. Build `IsUnion` with a defaulted second parameter that remembers the original type, return `false` early for `never`, then distribute over `T` and compare `[All]` with each `[T]` member.
