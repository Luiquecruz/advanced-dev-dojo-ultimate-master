Use the literal types `true` and `false` for `ok`. A plain `boolean` cannot act as a discriminant.
---
For `parseAge`, trim first, then convert with `Number(trimmed)` and validate with `Number.isInteger`, which rejects `NaN` and decimals in one check.
---
In `mapResult`, write `result.ok ? ok(transform(result.value)) : result`. In the error branch `result` is already `{ ok: false; error: E }`, which fits `Result<U, E>`.
