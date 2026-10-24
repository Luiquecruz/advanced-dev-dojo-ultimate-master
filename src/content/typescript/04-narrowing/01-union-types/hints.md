Start each function with `typeof value === 'string'` (or `'number'`) and let the compiler narrow each branch.
---
Normalize the "one or many" input first: `const tags = typeof input === 'string' ? input.split(',') : input;` then clean `tags` once.
---
`padStart(6, '0')` pads a string. For the total, convert inside `reduce`: `typeof value === 'number' ? value : Number(value)`.
