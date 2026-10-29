Copies are one spread away: return `{ ...row }` (or `null`) from every read and write, and store a new object in `create` and `update` instead of the caller's input.
---
Write a private helper `findRowByEmail(email)` that lowercases both sides, and reuse it in `findByEmail`, `create` and `update`. In `update`, the duplicate check must ignore the row you are updating: throw only when `owner && owner.id !== id`.
---
`list` is `[...this.rows.values()].sort((a, b) => a.id - b.id).slice(offset, offset + limit).map((row) => ({ ...row }))`, with the defaults destructured in the parameter: `{ limit = 50, offset = 0 } = {}`. `delete` can return `this.rows.delete(id)` directly.
