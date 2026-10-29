# REST Resource Design

REST is less a protocol than a set of conventions: **resources** identified by URLs, manipulated with **HTTP methods**, answered with **status codes** that mean something. Following the conventions means every client, proxy, cache, API gateway and AI assistant already knows how your API behaves.

## Nouns in the URL, verbs in the method

```text
GET    /projects          list
POST   /projects          create
GET    /projects/42       read one
PATCH  /projects/42       update some fields
PUT    /projects/42       replace the whole resource
DELETE /projects/42       delete
```

Avoid `/getProjects`, `/projects/42/delete` or `POST /updateProject`: the method already says what happens. Use plural nouns, kebab-case, and nest only for real ownership (`/projects/42/members`), at most one level deep. Actions that do not fit CRUD become sub-resources: `POST /orders/42/cancellation` instead of `POST /cancelOrder`.

## Status codes that carry meaning

| Situation | Status | Body |
| --- | --- | --- |
| Read or update succeeded | `200 OK` | the resource |
| Created | `201 Created` + `Location: /projects/43` | the new resource |
| Deleted, nothing to return | `204 No Content` | empty |
| Malformed or invalid input | `400 Bad Request` (or `422`) | error details |
| Not authenticated / not allowed | `401` / `403` | error |
| Resource does not exist | `404 Not Found` | error |
| Conflicts with current state (duplicate slug, version mismatch) | `409 Conflict` | error |

Returning `200 { "error": "not found" }` breaks every client that checks `response.ok`, retries on the wrong things and pollutes monitoring dashboards that count errors by status.

```ts
app.post('/projects', async (c) => {
  const input = await c.req.json<{ slug: string; name: string }>();
  if (projects.some((project) => project.slug === input.slug)) {
    return c.json({ error: 'Slug already exists' }, 409);
  }
  const project = { id: nextId++, ...input };
  projects.push(project);
  c.header('Location', `/projects/${project.id}`);
  return c.json(project, 201);
});

app.delete('/projects/:id{[0-9]+}', (c) => {
  return c.body(null, 204);
});
```

`c.body(null, 204)` matters: a `204` must not have a body, and some clients fail to parse an empty JSON document.

## Safe, idempotent, and why you care

| Method | Safe (no changes) | Idempotent (repeat = same result) |
| --- | --- | --- |
| `GET`, `HEAD` | yes | yes |
| `PUT`, `DELETE` | no | yes |
| `PATCH` | no | not guaranteed |
| `POST` | no | no |

Idempotency decides what a client, proxy or retry library may safely repeat after a timeout. Retrying `PUT /projects/42` is harmless; retrying `POST /payments` may charge twice. For non-idempotent operations that must be retryable, accept an `Idempotency-Key` header and store the first result (Stripe's approach).

Deleting twice: the first `DELETE` answers `204`, the second `404`. The **state** is the same, which is what idempotency promises; the status may differ.

## PATCH vs PUT

`PUT` replaces the representation: fields you omit are gone (or reset to defaults). `PATCH` changes only the fields you send. Most JSON APIs offer `PATCH` with a partial object (JSON Merge Patch semantics). Whatever you choose, re-check invariants on update: changing a project's slug to one that another project uses is still a `409`, but keeping its own slug is not a conflict.

## Responses are representations

Return the resource after create and update, so the client does not need a second request and sees server-generated fields (`id`, `createdAt`). Keep field names stable and consistent (`camelCase` everywhere), never leak internal columns (password hashes, soft-delete flags), and keep a single error shape (`{ "error": "..." }`, or RFC 9457 `application/problem+json`).

## When to choose it

Resource-oriented REST is the default for public and partner APIs, for anything consumed by many clients and for CRUD-heavy domains: it is cacheable, debuggable with `curl`, and understood by every tool. It strains when clients need many related resources per screen (consider GraphQL or a backend-for-frontend endpoint), when client and server are one TypeScript codebase (a typed RPC client such as Hono RPC or tRPC removes the contract work) and for workflow-heavy domains where "resources" are forced; model those as sub-resource actions or commands.

## Working with AI

Give the assistant the resource list, the fields, the uniqueness rules and the status code table you expect; otherwise it tends to return `200` for everything and invent error shapes. Review checklist:

- URLs are plural nouns; no verbs in paths.
- `POST` answers `201` with a `Location` header; `DELETE` answers `204` with no body.
- Missing resources answer `404` on read, update **and** delete.
- Uniqueness and state conflicts answer `409`, and updates do not conflict with the resource itself.
- `PATCH` only changes sent fields and cannot overwrite `id`.
- One consistent error shape; no internal fields in responses.
