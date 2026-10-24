The bug is about **variance**: `infer` in a return position combines candidates into a union. Move the type into a parameter position, where candidates are combined into an intersection.
---
First distribute each member into a function parameter: `U extends unknown ? (arg: U) => void : never`. Then match the whole result against `(arg: infer I) => void`.
---
`MergeAll` chains three tools: `T[number]` for the union of elements, `UnionToIntersection` to combine them and `Simplify` to flatten the intersection.
---
At runtime, `Object.assign({}, ...objects)` creates a new object; assert the result to `MergeAll<T>`.
