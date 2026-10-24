Describe recursive data and write recursive type helpers.

1. `type JsonValue`: `string`, `number`, `boolean`, `null`, arrays of `JsonValue`, or objects with string
   keys whose values are `JsonValue`. `undefined`, functions and `Date` objects must be rejected.
2. `interface TreeNode<T>` with `value: T` and `children: TreeNode<T>[]`.
3. `type DeepElement<T>`: unwraps **all** array levels. `DeepElement<number[][][]>` is `number`; a
   non-array type stays unchanged.
4. `type Trim<S extends string>`: removes every leading and trailing space (`' '`) from a string literal
   type. `Trim<'  hi  '>` is `'hi'`.
5. `function flattenTree<T>(node: TreeNode<T>): T[]`: returns the values in depth-first order, the node's
   own value first, then each child subtree from left to right.

`any` is not allowed.
