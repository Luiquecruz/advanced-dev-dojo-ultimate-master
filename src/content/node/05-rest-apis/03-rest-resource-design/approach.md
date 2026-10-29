1. List the invariants before the routes: ids are unique and server-generated, slugs are unique. Each one maps to a status code (`404` when the id does not exist, `409` when the slug is taken).
2. Extract the lookups (`findProject`, `slugInUse(slug, exceptId)`) so the four routes share one definition of "exists" and "conflicts".
3. `POST`: check the conflict first, then build the project from the allowed fields only, store it, set `Location` and answer `201` with the representation.
4. `PATCH`: the order of checks matters. Missing resource first, then the conflict excluding the project itself, then copy only `slug` and `name` so a client cannot overwrite `id`.
5. `DELETE`: remove the item and answer `204` with `c.body(null, 204)`; a second delete of the same id naturally becomes `404`.
6. Re-read the status table and make sure every error path returns the same `{ error }` shape.
