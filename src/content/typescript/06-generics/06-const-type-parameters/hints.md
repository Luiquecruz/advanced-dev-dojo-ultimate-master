The modifier goes before the type parameter name: `function tuple<const T extends unknown[]>(...items: T): T`.
---
Keep the existing constraints. With `const`, `oneOf(['admin', 'editor'])` infers `T` as `readonly ['admin', 'editor']`, so `T[number]` is the union of the values.
---
The guard body: `typeof input === 'string' && values.includes(input)`.
