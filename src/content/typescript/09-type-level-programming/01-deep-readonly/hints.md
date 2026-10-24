Start from the recursive mapped type `{ readonly [K in keyof T]: DeepReadonly<T[K]> }`. Homomorphic mapped types already leave primitives alone and keep arrays and tuples as arrays.
---
Mapping over a function type drops its call signature. Put a conditional type in front: `T extends (...args: never[]) => unknown ? T : <mapped type>`.
---
For `DeepPartial`, chain the checks in this order: function, then `readonly unknown[]`, then `object` (mapped type with `?` that recurses), and finally `T` for primitives.
---
At runtime, check `typeof value === 'object' && value !== null`, call `deepFreeze` on every `Object.values(value)` entry, freeze the value itself, and return `value as DeepReadonly<T>`.
