Optional: `last?: string`. Default: `times = 2` (no `?`, no annotation needed). Rest: `...values: number[]`.
---
Default values only apply to `undefined`, so once the defaults are in the signature you can delete the `count` and `glue` lines and use `times` and `separator` directly.
---
Inside `sum`, `values` is a real array: `values.reduce((total, value) => total + value, 0)`.
