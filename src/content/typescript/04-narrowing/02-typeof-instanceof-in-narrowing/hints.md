`instanceof` works with classes such as `Date` and `Error`; `typeof` works with primitives such as `"number"` and `"string"`.
---
Check the most specific case first and return early. After `if (value instanceof Date) return ...` and `if (typeof value === 'number') return ...`, the compiler knows `value` is a `string`.
---
For shapes: `if ('radius' in shape) { return Math.PI * shape.radius ** 2; } return shape.side ** 2;`.
