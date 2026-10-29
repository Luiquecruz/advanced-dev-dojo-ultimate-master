# SQL Essentials

ORMs and query builders generate SQL, assistants write SQL, and slow endpoints are almost always slow SQL. You do not need to be a DBA, but you must be able to read a query and predict what the database will do.

## Tables, rows, keys

```sql
CREATE TABLE users (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email      text NOT NULL UNIQUE,
  name       text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE orders (
  id       bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id  bigint NOT NULL REFERENCES users(id),
  total    numeric(10, 2) NOT NULL CHECK (total >= 0),
  status   text NOT NULL
);
```

The **primary key** identifies a row. A **foreign key** (`REFERENCES`) guarantees that every order points to an existing user. Constraints are rules the database enforces for every client, including the script someone runs at 2 a.m.

## Reading: SELECT

```sql
SELECT id, name, email
FROM users
WHERE created_at >= '2026-01-01'
ORDER BY created_at DESC
LIMIT 20 OFFSET 40;
```

The logical order of evaluation is not the written order: `FROM` → `WHERE` → `GROUP BY` → `HAVING` → `SELECT` → `ORDER BY` → `LIMIT`. That is why you cannot use a `SELECT` alias inside `WHERE`, and why `HAVING` exists (it filters groups after aggregation). Prefer naming columns over `SELECT *`: it documents intent and avoids shipping columns such as `password_hash` by accident.

`NULL` means unknown: `WHERE deleted_at = NULL` matches nothing. Use `IS NULL` / `IS NOT NULL`.

## Combining tables: JOIN

```sql
SELECT u.name, o.id AS order_id, o.total
FROM users u
JOIN orders o ON o.user_id = u.id
WHERE o.status = 'paid';
```

| Join | Returns |
| --- | --- |
| `INNER JOIN` (`JOIN`) | only pairs that match on both sides |
| `LEFT JOIN` | every left row; right columns are `NULL` when nothing matches |
| `RIGHT JOIN` | mirror of `LEFT JOIN`, rarely used |
| `FULL JOIN` | every row from both sides |

A `LEFT JOIN` answers "users and their orders, including users with none". A frequent bug: filtering the right table in `WHERE` (`WHERE o.status = 'paid'`) silently turns a `LEFT JOIN` back into an inner one; put that condition in the `ON` clause instead.

## Aggregating: GROUP BY

```sql
SELECT u.id, u.name, count(o.id) AS orders, coalesce(sum(o.total), 0) AS spent
FROM users u
LEFT JOIN orders o ON o.user_id = u.id
GROUP BY u.id, u.name
HAVING count(o.id) >= 3
ORDER BY spent DESC;
```

Every selected column is either in `GROUP BY` or inside an aggregate (`count`, `sum`, `avg`, `min`, `max`). `count(*)` counts rows; `count(o.id)` counts non-null values, which is what you want after a `LEFT JOIN`.

## Writing

```sql
INSERT INTO users (email, name) VALUES ($1, $2) RETURNING id;
UPDATE orders SET status = 'shipped' WHERE id = $1;
DELETE FROM sessions WHERE expires_at < now();
```

`$1`, `$2` are **parameters**: values travel separately from the SQL text (next lesson). An `UPDATE` or `DELETE` without `WHERE` changes every row; review those twice.

## Indexes

Without an index, `WHERE email = $1` reads the whole table (a **sequential scan**). A B-tree index keeps the column sorted so lookups take logarithmic time:

```sql
CREATE INDEX orders_user_id_idx ON orders (user_id);
CREATE INDEX orders_user_status_idx ON orders (user_id, status);
```

- Primary keys and `UNIQUE` columns are indexed automatically; **foreign keys are not** in Postgres. Index them, since you join and filter on them.
- A composite index `(user_id, status)` serves filters on `user_id` alone or on both, not on `status` alone (leftmost prefix rule).
- Indexes cost writes and storage: each `INSERT` updates every index on the table.
- `WHERE lower(email) = $1` cannot use an index on `email`; it needs an index on `lower(email)`.
- `EXPLAIN ANALYZE <query>` shows the plan the database chose and the real time spent. Look for `Seq Scan` on large tables.

## When to choose it

Write SQL directly (or with a thin query builder) when queries are reporting-heavy or performance-critical and you want full control. Use an ORM for routine CRUD in a typed codebase, but keep the ability to read its generated SQL and drop to raw SQL for complex queries. Whatever the tool, the data model (keys, constraints, indexes) is the part that lasts.

## Working with AI

Give the assistant the schema (the `CREATE TABLE` statements) and the question in plain words; ask for the query plus the index it relies on. Review checklist:

- Values are passed as parameters (`$1`), never concatenated into the SQL string.
- `LEFT JOIN` filters on the right table live in `ON`, not `WHERE`.
- `GROUP BY` lists every non-aggregated column; `count(column)` after outer joins.
- No `SELECT *` in API code; sensitive columns are never selected.
- Every `UPDATE`/`DELETE` has a `WHERE`; foreign keys and filtered columns are indexed.
- Pagination uses a stable `ORDER BY` (including a unique column such as `id`).
