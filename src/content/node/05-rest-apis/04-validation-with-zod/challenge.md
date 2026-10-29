Validate a users API with Zod and `@hono/zod-validator`. The starter exports the `users` array and the `app` with unvalidated routes.

1. Export `createUserSchema`, a `z.object` with:
   - `name`: string, trimmed, at least 2 characters
   - `email`: an email address
   - `age`: optional integer, at least 13
   - `role`: `'admin'` or `'member'`, default `'member'`
2. Export `listQuerySchema`, a `z.object` for the query string with:
   - `page`: coerced to an integer, at least 1, default `1`
   - `role`: optional, `'admin'` or `'member'`
3. Export `formatIssues(issues)` that maps Zod issues to `{ path, message }`, where `path` is the issue path joined with `.` (`['address', 'city']` becomes `'address.city'`).
4. Use `zValidator` on both routes with a hook that answers invalid input with `400` and the body `{ "error": "Validation failed", "issues": formatIssues(...) }`.
5. `POST /users` answers `201` with `{ id, ...validated data }` (`id` one above the highest id). Unknown fields such as `isAdmin` must not appear in the stored user.
6. `GET /users` answers `200` with `{ page, items }`, where `items` are the users filtered by `role` when present (all users otherwise).
