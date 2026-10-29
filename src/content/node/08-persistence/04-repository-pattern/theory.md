# The Repository Pattern

In a frontend you probably wrap `fetch` calls in an API client or a service so components never build URLs. A **repository** is the backend equivalent for storage: an object that looks like a collection of domain objects and hides how they are saved.

```ts
export interface UserRepository {
  findById(id: number): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  create(input: NewUser): Promise<User>;
  update(id: number, patch: Partial<NewUser>): Promise<User | null>;
  delete(id: number): Promise<boolean>;
}
```

Services depend on this interface. The production implementation talks to Postgres; tests and prototypes use an in-memory one.

## What lives where

| Layer | Knows about | Example |
| --- | --- | --- |
| Route handler | HTTP: params, status codes, JSON | `POST /users` → `201` |
| Service | business rules | normalize the email, new users are members, "only admins can..." |
| Repository | storage: SQL, ORM, tables, column names | `INSERT INTO users ... RETURNING *` |

A Postgres implementation is where SQL and row mapping belong:

```ts
export class PostgresUserRepository implements UserRepository {
  constructor(private readonly db: Pool) {}

  async findById(id: number): Promise<User | null> {
    const { rows } = await this.db.query('SELECT id, email, name, role FROM users WHERE id = $1', [id]);
    return rows[0] ?? null;
  }

  async create(input: NewUser): Promise<User> {
    try {
      const { rows } = await this.db.query(
        'INSERT INTO users (email, name, role) VALUES ($1, $2, $3) RETURNING id, email, name, role',
        [input.email, input.name, input.role],
      );
      return rows[0];
    } catch (error) {
      if ((error as { code?: string }).code === '23505') throw new DuplicateEmailError(input.email);
      throw error;
    }
  }
}
```

Note the error translation: Postgres reports a unique violation as code `23505`. The repository turns it into a **domain error** (`DuplicateEmailError`), so the service and the route never parse database error codes. The route then maps the domain error to `409 Conflict`.

## Why bother

- **Testability**: services are tested with an in-memory fake in milliseconds, no database container.
- **One place per query**: when a column is renamed or a query needs an index hint, there is one file to change.
- **Readable services**: `users.findByEmail(email)` says what, not how.
- **Swappable storage**: rarely the real reason (databases are seldom replaced), but it does make moving one aggregate to another store possible.

## The in-memory version must behave like a database

A fake that behaves differently from production hides bugs. Two rules matter most:

1. **Return copies.** A database returns fresh objects for every query. If the fake hands out its internal object, code that mutates a result "works" in tests and silently does nothing in production.
2. **Enforce the same constraints.** If the table has `UNIQUE (lower(email))`, the fake must reject duplicates too. Checking uniqueness only in the service (`if (await users.findByEmail(...)) throw`) is a race: two concurrent requests both pass the check. The constraint in storage is the real guard; the service check is just a friendlier message.

## Pitfalls

- **Generic repositories** (`Repository<T>` with `find(where: any)`) leak the query language to callers and end up as a worse ORM. Prefer methods named after real use cases: `findActiveByTeam(teamId)`.
- **Leaky return types**: returning Prisma models, query builders or `pg` result objects ties every caller to the library.
- **Repository per table** instead of per aggregate: an order and its lines are saved together, through one `OrderRepository`.
- **Business rules inside the repository**: "admins cannot be deleted" is a service rule; the repository only stores.
- **N+1 calls through the interface**: calling `findById` in a loop is easy with a repository (see the batching lesson); add a `findByIds(ids)` method.

## When to choose it

Use repositories when the application has real business logic and tests for it: layered or hexagonal architectures, anything beyond CRUD. For a thin CRUD service where handlers just validate and save, calling a typed query builder or ORM directly from a small service is simpler; Prisma and Drizzle already give you a typed, mockable data layer. The cost of the pattern is one more file per aggregate and the discipline to keep SQL inside it.

## Working with AI

Ask for the interface first, named after use cases, then the implementations: "a `UserRepository` interface, a Postgres implementation with `pg` and parameterized queries, and an in-memory fake with the same uniqueness rules for tests". Review checklist:

- Services import the interface, not the Postgres class; the composition root wires the implementation.
- No SQL, ORM types or database error codes outside the repository.
- Database errors (unique violation, foreign key violation) become domain errors.
- The fake returns copies and enforces the same constraints as the real table.
- Methods match real use cases; no `findAll()` loaded into memory and filtered in JavaScript.
