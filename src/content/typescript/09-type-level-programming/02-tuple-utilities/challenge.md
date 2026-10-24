Write a toolkit of tuple utilities. Every helper must accept **readonly** tuples (values created with
`as const`) as well as mutable ones, so constrain the type parameters with `readonly unknown[]`.

1. `type TupleToUnion<T>`: the union of all element types (`never` for `[]`).
2. `type First<T>`: the first element type, `never` for an empty tuple.
3. `type Last<T>`: the last element type, `never` for an empty tuple.
4. `type Length<T>`: the length of the tuple as a number literal.
5. `type Reverse<T>`: a new mutable tuple with the elements in reverse order (`Reverse<[1, 2, 3]>` is
   `[3, 2, 1]`).
6. `function last<const T extends readonly unknown[]>(items: T): Last<T>`: returns the last item at
   runtime, with the precise `Last<T>` type (`last([1, 'two', true])` has the type `true`).
