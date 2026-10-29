# Capstone: a Production-Shaped API

This capstone assembles the track into one small service: a bookmarks API where each user manages their own links. It is the shape of most real backends you will brief and review: validated input, an authenticated user, business rules in a service, storage behind a repository, and one consistent error format.

## The request lifecycle

```
request
  → app.notFound / router
  → requireUser (auth middleware: token → c.var.user, or 401)
  → zValidator (body schema → typed input, or 400)
  → route handler (calls one service method, picks the status)
  → BookmarkService (rules: ownership, uniqueness → domain errors)
  → BookmarkRepository (storage only)
  ← app.onError (AppError / HTTPException / unknown → one JSON envelope)
```

| File | Responsibility | Built on |
| --- | --- | --- |
| `errors.ts` | `AppError` with `status`, `code`, `message`, `details` | Errors lessons (05, 06) |
| `repository.ts` | `BookmarkRepository` interface + in-memory implementation | Repository pattern (08) |
| `schemas.ts` | Zod schemas for request bodies and queries | Validation (05) |
| `service.ts` | `BookmarkService`: ownership and uniqueness rules | Layers, DI (06) |
| `auth.ts` | `requireUser(tokens)` middleware | Authorization middleware (09) |
| `app.ts` | `createApp(deps)`: middleware, routes, error handling | Hono (05) |
| `main.ts` | Composition root: real ids, clock, tokens | DI (06) |

## One error envelope

Clients (your frontend included) should parse failures one way:

```json
{ "error": { "code": "VALIDATION_FAILED", "message": "Invalid request body", "details": [{ "path": "url", "message": "Invalid URL" }] } }
```

A stable machine-readable `code`, a human `message`, optional `details`. Domain code throws `AppError` subclasses; `onError` is the only place that builds the envelope:

```ts
app.onError((error, c) => {
  if (error instanceof AppError) {
    return c.json({ error: { code: error.code, message: error.message, ...(error.details ? { details: error.details } : {}) } }, error.status);
  }
  console.error(error);
  return c.json({ error: { code: 'INTERNAL', message: 'Internal server error' } }, 500);
});
```

Unknown errors are logged with full detail for operators and hidden from clients. RFC 9457 (Problem Details, `application/problem+json`) is a standardized alternative envelope worth considering for public APIs.

## Typed context from middleware

Authentication middleware resolves the user once and stores it on the context. Declaring the variables type makes `c.get('user')` typed in every handler:

```ts
export type AppEnv = { Variables: { user: User } };

export function requireUser(tokens: ReadonlyMap<string, User>) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const match = /^Bearer (.+)$/.exec(c.req.header('Authorization') ?? '');
    const user = match && tokens.get(match[1]);
    if (!user) throw new UnauthorizedError();
    c.set('user', user);
    await next();
  });
}
```

## Validation that feeds the domain

`zValidator('json', schema, hook)` parses the body before the handler runs. The hook converts Zod issues into your envelope instead of Zod's default response:

```ts
zValidator('json', CreateBookmarkSchema, (result) => {
  if (!result.success) {
    throw new ValidationError(result.error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })));
  }
});
```

Schemas also **normalize**: trimmed titles, lowercase tags, a default empty array. The service then receives clean, typed input (`c.req.valid('json')`) and never re-checks shapes. Restrict URLs to `http`/`https` (`z.httpUrl()`): a plain URL check accepts `javascript:` links that become stored XSS in a frontend.

## Ownership: 404, not 403

Every query is scoped by the current user. When Ada asks for Alan's bookmark, the API answers **404**, the same as for a missing id. A 403 would confirm that the id exists, leaking information; scoping lookups by owner is the fix for broken object-level authorization, the top item in the OWASP API Top 10.

## What production would add

Real persistence with migrations and a unique index on `(owner_id, url)`; tokens as hashed API keys or short-lived JWTs from an identity provider, compared in constant time; rate limiting; pagination on lists; request ids and structured logs; config validated at startup; graceful shutdown; and integration tests against a real database. Each one is a lesson in this track, and each is a line in your next brief.

## When to choose it

This structure (schemas at the edge, service with domain errors, repository interface, one error handler, composition root) is the right default for any API with real rules and more than a handful of endpoints. For a tiny internal endpoint, collapse layers. For large domains, keep the same shape per feature module inside a modular monolith.

## Working with AI

Use the briefing template from the previous lesson with this lesson's contract table: it is precise enough that an assistant can generate the whole app, and you can verify it with these tests. Review the result for:

- Every route behind auth except `/health`; the user comes only from middleware, never from the body.
- Every repository call scoped by owner; other users' ids answer 404.
- Input parsed by schemas with normalization and limits; URLs restricted to http(s).
- One error envelope for validation, auth, domain, framework and unknown errors; no stack traces or internal messages in responses.
- `201` with `Location` on create, `204` with no body on delete, `409` for duplicates.
- Dependencies (ids, clock, repository, tokens) injected through `createApp`, so tests are deterministic.
