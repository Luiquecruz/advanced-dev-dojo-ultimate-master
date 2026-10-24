1. In `schema.ts`, replace `z.string()` for `email` with `z.email(...)` and add `.min(8, ...)` to `password`.
2. Chain `.refine(...)` on the object with the equality check, message and `path: ['confirm']`.
3. In `toTypedSchema.ts`, await `schema.safeParseAsync(values)` and return early with `{ value, errors: [] }` on success.
4. Otherwise group `result.error.issues` by joined path and return them as `{ path, errors }` entries.
