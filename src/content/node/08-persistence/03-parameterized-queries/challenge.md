Build a tiny parameterized query builder in the style of `pg`, postgres.js and Kysely. Nothing here talks to a database: every function returns a `Query` object, `{ text, values }`, the exact shape `pg`'s `client.query(query)` accepts.

## `sql` tagged template

`` sql`SELECT * FROM users WHERE email = ${email} AND role = ${role}` `` returns

```ts
{ text: 'SELECT * FROM users WHERE email = $1 AND role = $2', values: [email, role] }
```

Placeholders are numbered from `$1` in order. A template without interpolations returns its text and `values: []`.

## `assertIdentifier(name)`

Identifiers (table and column names) cannot be parameters, so they are validated. A safe identifier matches letters, digits and underscores and does not start with a digit (`users`, `created_at`, `_internal`). Return the name when it is safe; otherwise throw `new Error('Unsafe identifier: <name>')`.

## `buildSelect(table, options?)`

`options` is `{ columns?, where?, orderBy?, limit?, offset? }`. Build the text in this exact format, with single spaces:

| Option | Output |
| --- | --- |
| none | `SELECT * FROM users` |
| `columns: ['id', 'name']` | `SELECT id, name FROM users` |
| `where: { role: 'admin' }` | `WHERE role = $1`, entries joined with ` AND ` in object order |
| `where: { deleted_at: null }` | `deleted_at IS NULL` (no value added) |
| `where: { id: [1, 2] }` | `id = ANY($n)` with the whole array as one value |
| `orderBy: { column: 'name', direction? }` | `ORDER BY name ASC`; `direction` defaults to `ASC` and must be exactly `ASC` or `DESC`, otherwise throw `new Error('Unsafe sort direction: <direction>')` |
| `limit: 20`, `offset: 40` | `LIMIT $n OFFSET $m` (both are parameters) |

Clauses appear in the order `WHERE`, `ORDER BY`, `LIMIT`, `OFFSET`, and placeholders are numbered in the order their values appear in the text. Validate the table, every column, every `where` key and the order column with `assertIdentifier`.
