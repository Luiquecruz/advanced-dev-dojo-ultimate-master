# Validation with Zod

TypeScript types disappear at runtime. `await c.req.json<CreateUser>()` is a cast, not a check: the body can be `null`, a string, or an object with `"isAdmin": true`. Every value that crosses the network boundary (body, query, params, headers) must be **parsed** before your code trusts it. Zod lets you write the rule once and get both the runtime check and the TypeScript type.

## A schema is a parser

```ts
import { z } from 'zod';

const createUserSchema = z.object({
  name: z.string().trim().min(2),
  email: z.email(),
  age: z.number().int().min(13).optional(),
  role: z.enum(['admin', 'member']).default('member'),
});

type CreateUser = z.infer<typeof createUserSchema>;

const result = createUserSchema.safeParse({ name: '  Ada ', email: 'ada@example.com', isAdmin: true });
```

`safeParse` returns `{ success: true, data }` or `{ success: false, error }`. The output is not the input: `name` is trimmed, `role` gets its default and the unknown `isAdmin` key is **stripped** (`z.object` drops unknown keys by default; `z.strictObject` rejects them). Stripping is a security feature: it stops **mass assignment**, where a client sets fields it should never control.

Zod 4 notes: string formats are top-level (`z.email()`, `z.url()`, `z.uuid()`), and error customization uses `{ error: '...' }`. Older code uses `z.string().email()` and `{ message }`, which still work but are deprecated.

## Validating requests in Hono

`@hono/zod-validator` turns a schema into middleware. The validated value is available, typed, through `c.req.valid(target)`:

```ts
import { zValidator } from '@hono/zod-validator';

app.post('/users', zValidator('json', createUserSchema), (c) => {
  const input = c.req.valid('json');
  return c.json({ id: 1, ...input }, 201);
});
```

Targets: `'json'`, `'query'`, `'param'`, `'header'`, `'form'`, `'cookie'`. Query strings and params are always strings, so their schemas **coerce**:

```ts
const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  role: z.enum(['admin', 'member']).optional(),
});

app.get('/users', zValidator('query', listQuerySchema), (c) => {
  const { page, role } = c.req.valid('query');
});
```

Use `z.coerce` only at string boundaries: in a JSON body, `z.coerce.number()` would accept `"12"` and even `""` (which becomes `0`).

## Owning the error shape

By default the validator answers `400` with the raw Zod result, which exposes internal structure and changes between Zod versions. Pass a **hook** to control it:

```ts
zValidator('json', createUserSchema, (result, c) => {
  if (!result.success) {
    return c.json({ error: 'Validation failed', issues: formatIssues(result.error.issues) }, 400);
  }
});
```

A good error body lists **every** problem at once (Zod collects all issues, it does not stop at the first), with the field path as a string clients can map to form fields:

```json
{
  "error": "Validation failed",
  "issues": [
    { "path": "name", "message": "Too small: expected string to have >=2 characters" },
    { "path": "email", "message": "Invalid email address" }
  ]
}
```

Malformed JSON never reaches your schema: Hono's validator answers `400` before parsing.

## 400 or 422?

Both are used. `400 Bad Request` is the common default for "the input is wrong"; some APIs reserve `422 Unprocessable Content` for syntactically valid JSON that breaks the rules. Pick one, document it, and keep business conflicts (duplicate email) as `409`, decided after validation.

## Where validation belongs

Validate **shape** at the edge (route middleware) and **business rules** in the service ("email must be unique", "a member cannot downgrade an admin"). The schema should not query the database. Export schemas from a shared module: the same schema can validate a React form with `@hookform/resolvers`, which the TypeScript module builds on.

## When to choose it

Use schema validation for every external input of a production API. Zod is the TypeScript default with the largest ecosystem (Hono, tRPC, React Hook Form, OpenAPI generators). Alternatives: **Valibot** (tree-shakable, smaller bundles, good for edge and frontend), **ArkType** (fast, TypeScript-like syntax), **TypeBox/JSON Schema** (native to Fastify, directly publishable as OpenAPI). A framework that already ships a validator (NestJS `class-validator`, Fastify schemas) is usually better used than mixed with another.

## Working with AI

Ask for "Zod schemas for body, query and params, `zValidator` with a hook that answers `400 { error, issues: [{ path, message }] }`". Review checklist:

- No `c.req.json()` cast reaches business code without a schema.
- Query and param schemas use `z.coerce`; body schemas do not.
- Objects strip or reject unknown keys; no spreading raw input into stored records.
- Limits exist: string `max`, array `max`, number ranges, so input cannot be unbounded.
- The error shape is the API's own, lists every issue, and does not echo secrets.
- Business rules (uniqueness, permissions) live after validation, not inside the schema.
