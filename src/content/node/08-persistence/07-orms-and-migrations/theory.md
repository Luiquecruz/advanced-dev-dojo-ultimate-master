# ORMs, Query Builders and Migrations

Almost no Node.js project sends SQL strings through a bare driver for everything. Between your code and the database sits one of three kinds of tools, plus a migration system that evolves the schema. Choosing the layer decides how much SQL your team writes, how types flow, and what an assistant will generate.

## The spectrum

| Level | Examples | You write | You get |
| --- | --- | --- | --- |
| Driver | `pg`, postgres.js, `mysql2`, `better-sqlite3` | SQL strings with parameters | full control, no types for results unless you declare them |
| Query builder | Kysely, Knex, Drizzle (core API) | TypeScript calls that map 1:1 to SQL | typed queries, composable filters, SQL you can predict |
| ORM | Prisma, Drizzle (relational API), TypeORM, MikroORM, Sequelize | model operations (`user.findMany({ include })`) | relations, nested writes, migrations, generated types |

```ts
const users = await db
  .selectFrom('users')
  .select(['id', 'email'])
  .where('role', '=', 'admin')
  .orderBy('created_at', 'desc')
  .limit(20)
  .execute();

const admins = await prisma.user.findMany({
  where: { role: 'admin' },
  select: { id: true, email: true, posts: { select: { title: true } } },
  take: 20,
});
```

The first is Kysely: you can read the SQL through the method names. The second is Prisma: the client decides how to fetch `posts` (an extra query or a join, depending on the relation load strategy).

## The current landscape

- **Prisma**: schema file (`schema.prisma`) as the source of truth, generated client with excellent types, `prisma migrate` for migrations. Very productive for CRUD; complex queries go to `$queryRaw` (tagged, parameterized) or TypedSQL.
- **Drizzle**: schema in TypeScript, SQL-like API plus a relational query API, light runtime, works on edge and serverless drivers; `drizzle-kit` generates SQL migrations.
- **Kysely**: type-safe query builder only; types come from your own interfaces or a generator (`kysely-codegen`). Pairs with any migration tool.
- **TypeORM / MikroORM**: decorator-based entities, Active Record or Data Mapper, unit of work (MikroORM). Common in NestJS codebases; more magic, more runtime.
- **Sequelize, Knex**: older but widespread; you will review code that uses them.

## Migrations

The schema changes over time, and every environment (developer laptops, CI, staging, production) must apply the same changes in the same order. A **migration** is a versioned, ordered script that moves the schema one step forward, and the tool records applied migrations in a table (`_prisma_migrations`, `kysely_migration`).

```ts
export async function up(db: Kysely<unknown>) {
  await db.schema.alterTable('users').addColumn('display_name', 'text').execute();
}

export async function down(db: Kysely<unknown>) {
  await db.schema.alterTable('users').dropColumn('display_name').execute();
}
```

Rules that keep production alive:

1. **Migrations are immutable** once merged; fix mistakes with a new migration.
2. **Review the generated SQL**. A renamed field can be generated as drop column + add column, which deletes data.
3. **Expand and contract** for zero-downtime changes: add the new column (nullable), deploy code that writes both, backfill, switch reads, then drop the old column in a later release. Old and new app versions run side by side during a deploy.
4. **Locks**: `ALTER TABLE` and `CREATE INDEX` can block writes on large tables. In Postgres, use `CREATE INDEX CONCURRENTLY` and add `NOT NULL` constraints in steps.
5. **Run migrations as a deploy step** (or a release job), not on every app start across ten instances.
6. Never use `prisma db push` or `synchronize: true` (TypeORM) against production: they apply the diff without a reviewed migration.

## Common ORM pitfalls

- N+1 through lazy relations (see the batching lesson).
- Fetching whole rows (and secrets) when the API needs three columns: use `select`.
- Business invariants only in the model layer; keep constraints in the database too.
- `findMany()` without `take` on a table that will grow.
- Transactions that mix `tx` and the global client.

## When to choose it

- **Prisma**: teams that want the fastest CRUD with strong types and are fine dropping to SQL for complex reports.
- **Drizzle**: TypeScript-first teams that like SQL, serverless or edge runtimes, smaller bundles.
- **Kysely**: SQL-fluent teams who want type safety without an ORM's abstractions.
- **Raw driver**: small services, performance-critical paths, or a team that reviews SQL well.
- **TypeORM / MikroORM**: existing NestJS codebases or teams used to Hibernate-style entities.

Whatever you pick, keep migrations reviewed and in version control, and make sure someone on the team can read the SQL the tool produces.

## Working with AI

State the stack in the brief ("Drizzle with Postgres, migrations with drizzle-kit"), otherwise assistants mix APIs from different tools or versions. Review checklist:

- Generated migrations are read before merging: no accidental drops, renames handled as renames, indexes created concurrently on big tables.
- Destructive changes follow expand and contract across releases.
- Queries select only needed fields and paginate; relations are eager-loaded where used.
- Raw SQL escape hatches are tagged and parameterized.
- No `db push`/`synchronize` in production scripts; migrations run once per deploy.
