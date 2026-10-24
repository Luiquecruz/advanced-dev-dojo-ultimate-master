1. Change the distributive part of `UnionToIntersection` so each member becomes the parameter of a function type instead of its return type.
2. Change the matching pattern to `(arg: infer I) => void`, so the multiple candidates for `I` meet in a contravariant position and are intersected.
3. Build `MergeAll` from `T[number]`, `UnionToIntersection` and `Simplify`.
4. Implement `mergeAll` with `Object.assign` onto a fresh empty object and assert the result type.
