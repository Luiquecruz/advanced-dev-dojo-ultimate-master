Change the return type to `value is User`. The body still returns a `boolean` expression.
---
Check step by step: `typeof value === 'object' && value !== null && 'id' in value && typeof value.id === 'number' && ...`. After each `&&` the compiler knows a bit more about `value`.
---
`values.filter(isUser)` already returns `User[]`. For `compact`, `values.filter((value) => value != null)` removes `null` and `undefined` (but not `''`) and is inferred as a predicate.
