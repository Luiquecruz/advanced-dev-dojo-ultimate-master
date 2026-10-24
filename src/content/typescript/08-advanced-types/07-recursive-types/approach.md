1. Declare `JsonValue` as a union of the JSON primitives, `JsonValue[]` and an index-signature object of `JsonValue`.
2. Add `children: TreeNode<T>[]` to the interface.
3. Write `DeepElement` with `infer` on a readonly array pattern and recurse on the inferred element until the base case returns a non-array type.
4. Write `Trim` as two chained template literal checks, one per side, each recursing on the remaining text, with `S` as the base case.
5. Implement `flattenTree` recursively: own value first, then the flattened children in order.
