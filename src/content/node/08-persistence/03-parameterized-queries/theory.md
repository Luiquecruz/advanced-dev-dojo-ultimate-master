# Parameterized Queries

SQL injection has been on the OWASP Top 10 for over twenty years, and it still ships, often in code that "only builds a small filter". The fix is old and simple: never put values into the SQL text.

## The bug

```ts
const email = req.query.email;
await db.query(`SELECT * FROM users WHERE email = '${email}'`);
```

With `email = "x' OR '1'='1"` the database receives `WHERE email = 'x' OR '1'='1'`, which matches every user. With `'; DROP TABLE users; --` it may run a second statement. Escaping quotes by hand looks like a fix, but encodings, backslashes and numeric contexts (`WHERE id = ${id}` has no quotes to escape) keep breaking it.

## Parameters: text and values travel separately

```ts
await db.query('SELECT * FROM users WHERE email = $1 AND role = $2', [email, 'admin']);
```

The driver sends the SQL text and the values in separate fields of the protocol. The database parses the text first, so the values can only ever be **data**, never syntax. Placeholder style depends on the driver:

| Driver | Placeholder |
| --- | --- |
| `pg` (node-postgres), postgres.js | `$1`, `$2` |
| `mysql2`, `better-sqlite3` | `?` |
| SQL Server (`mssql`) | `@name` |

A `{ text, values }` object is the common currency: `pg` accepts `client.query({ text, values })` directly.

## Tagged templates: safe by construction

Modern libraries (postgres.js, Slonik, Drizzle's `sql`, Prisma's `$queryRaw`) use **tagged templates** so the safe version is also the shortest one:

```ts
function sql(strings: TemplateStringsArray, ...values: unknown[]) {
  return { text: strings.reduce((text, part, index) => `${text}$${index}${part}`), values };
}

const query = sql`SELECT * FROM users WHERE email = ${email}`;
```

The tag function receives the literal parts and the interpolated values separately, so it can turn every `${}` into a placeholder. The danger is the look-alike: `` prisma.$queryRawUnsafe(`... ${email}`) `` or a template **without** the tag is plain string concatenation again.

## Identifiers cannot be parameters

Placeholders stand for values. Table names, column names and keywords such as `ASC` are part of the query structure, so `ORDER BY $1` does not sort by a column. Real APIs need dynamic sorting (`?sort=created_at&dir=desc`), and this is where injection comes back. Two defenses, from strongest to weakest:

1. **Whitelist**: map the user input to known columns (`{ newest: 'created_at', name: 'name' }`) and reject the rest.
2. **Strict validation**: allow only `^[A-Za-z_][A-Za-z0-9_]*$`, then optionally quote with `"`. Anything else throws.

```ts
const SORTABLE = new Set(['created_at', 'name']);
if (!SORTABLE.has(sort)) throw new HttpError(400, 'Invalid sort column');
const direction = dir === 'desc' ? 'DESC' : 'ASC';
```

Note that `direction` is never the raw input: it is one of two literals chosen by code.

## Values that need care

- `NULL`: `WHERE deleted_at = $1` with `null` matches nothing; generate `IS NULL` instead.
- Lists: `IN ($1, $2, $3)` needs one placeholder per item and breaks on an empty list. Postgres accepts the whole array as one parameter: `id = ANY($1)`.
- `LIKE` patterns: the value is safe, but `%` and `_` inside it are wildcards; escape them if the user should match them literally.
- `LIMIT`/`OFFSET`: parameterize them too, and cap them (`Math.min(limit, 100)`) so nobody asks for a million rows.

## Query builders and ORMs

Kysely, Knex, Drizzle and Prisma parameterize values for you and validate identifiers through their typed schema. They still expose raw escape hatches (`sql.raw`, `knex.raw`, `$queryRawUnsafe`) that are exactly as dangerous as string concatenation. In code review, search for those names first.

## When to choose it

Always parameterize; there is no trade-off to weigh. The real decision is the abstraction: raw `pg` with tagged templates gives full control and transparent SQL; a typed builder (Kysely, Drizzle) adds autocomplete and identifier safety from the schema; an ORM (Prisma) hides most SQL. Choose the lowest level your team will review comfortably, and ban the unsafe raw helpers with a lint rule.

## Working with AI

Assistants still produce `` `WHERE id = ${id}` `` in raw `pg` code, especially for "quick" admin endpoints. Ask explicitly for parameterized queries and a whitelist for sortable or filterable columns. Review checklist:

- No template literal or `+` builds SQL with request data; tagged templates are actually tagged.
- `ORDER BY`, column lists and table names come from a whitelist, never straight from `req.query`.
- No `sql.raw`, `knex.raw`, `$queryRawUnsafe`, `$executeRawUnsafe` with user input.
- `null` and lists are handled (`IS NULL`, `= ANY($1)`), and `LIMIT` is capped.
- Errors returned to clients do not echo the SQL or the database message.
