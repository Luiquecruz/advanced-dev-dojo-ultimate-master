A function type expression needs parameter names: `(value: string) => boolean`. Once `Validator` is precise, write `isNotEmpty` as `(value) => ...`.
---
`Array.prototype.every` returns `true` for an empty array and stops at the first `false`, which matches `validateAll`.
---
A call signature uses a colon: `type Formatter = { (value: number): string; unit: string };`. Build an arrow function in a `const`, assign `format.unit = unit`, then return it.
