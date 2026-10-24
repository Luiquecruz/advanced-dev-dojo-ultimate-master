The brand is an intersection: `type Brand<T, Name extends string> = T & { readonly [brand]: Name };`. Then `type UserId = Brand<string, 'UserId'>`.
---
Once the aliases are branded, the compiler flags each `return raw` in the constructors. Validate first, then return `raw as UserId`: the cast is safe because the check just ran.
---
`toEmail` should validate the normalized value: `const normalized = raw.trim().toLowerCase();`. For `toCents`, `Number.isInteger(amount) && amount >= 0` covers decimals, `NaN` and negatives.
