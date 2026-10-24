A teammate wrote `UnionToIntersection`, but it returns the original union. **Fix it**, then use it to type
a `mergeAll` helper.

1. `type UnionToIntersection<U>`: `{ a: string } | { b: number }` must become
   `{ a: string } & { b: number }`, and a union of function types must become a callable overloaded type.
2. `type Simplify<T>` is given.
3. `type MergeAll<T extends readonly object[]>`: the simplified intersection of every object in the tuple,
   e.g. `MergeAll<[{ a: 1 }, { b: 2 }]>` is `{ a: 1; b: 2 }`.
4. `function mergeAll<const T extends readonly object[]>(...objects: T): MergeAll<T>`: copies every object,
   in order, into a **new** object and returns it. The inputs must not be mutated.
