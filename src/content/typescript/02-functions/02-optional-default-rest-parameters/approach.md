1. Add `?` to `last` in `formatName`; the body already handles `undefined`.
2. Move the fallbacks of `repeatText` into the signature as `times = 2` and `separator = ' '`, then remove the `||` lines.
3. Confirm that `repeatText('ha', 0)` now produces an empty string because `0` is not `undefined`.
4. Declare `...values: number[]` on `sum`, drop the `arguments` loop and reduce the array starting from `0`.
