1. Rewrite `Result<T, E>` as a union of two object types with `ok: true` and `ok: false`.
2. Leave `ok` and `err` as they are; they now return the narrow members of the union.
3. In `parseAge`, check the trimmed string, then integer validity, then the range, returning `err(...)` for each failure and `ok(age)` at the end.
4. Implement `mapResult` and `unwrapOr` with a single `result.ok` check each.
5. Remove the `throw` placeholder.
