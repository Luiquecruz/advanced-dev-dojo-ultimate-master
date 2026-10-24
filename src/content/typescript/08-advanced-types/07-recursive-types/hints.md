`JsonValue` is a union of the four primitives plus two members that mention `JsonValue` again: an array of it and an object with a `[key: string]` index signature.
---
Every recursive conditional type needs a base case. For `DeepElement`, match `T extends readonly (infer Item)[]`, call `DeepElement<Item>` in the true branch and return `T` in the false branch.
---
`Trim` checks two patterns in a row: `` ` ${infer Rest}` `` (leading space) and `` `${infer Rest} ` `` (trailing space). Each match recurses on `Rest`; when neither matches, return `S`.
---
`flattenTree` returns `[node.value, ...node.children.flatMap((child) => flattenTree(child))]`.
