# End-to-End Type Safety

In most full-stack projects the frontend declares `interface Todo` by hand and hopes the backend still returns that shape. The backend renames `done` to `completed`, both sides compile, and the bug appears in production. **End-to-end type safety** means the client's types are derived from the server's code or contract, so a breaking change is a compile error in the frontend, not a runtime surprise.

## The approaches

| Approach | Source of truth | Fits |
| --- | --- | --- |
| **Shared schemas** (Zod in a shared package) | Schemas imported by both sides | Any monorepo; also validates forms |
| **Typed RPC** (Hono RPC, tRPC) | The server's route types | TypeScript client and server in one repo |
| **OpenAPI + codegen** (openapi-typescript, orval, Kubb) | An OpenAPI document generated from or written for the API | Many clients, other languages, separate repos |
| **GraphQL codegen** | The GraphQL schema | GraphQL APIs |

They combine well: shared Zod schemas validate on both sides, and Hono's RPC client carries the route types.

## Shared schemas: one rule, two runtimes

```ts
import { z } from 'zod';

export const createTodoSchema = z.object({
  title: z.string().trim().min(1).max(100),
});

export type CreateTodo = z.input<typeof createTodoSchema>;
```

The server validates requests with it (`zValidator('json', createTodoSchema)`); the React form uses the same schema through `zodResolver`, so the user sees the same rules before submitting. Keep shared schemas free of server-only imports (database, `node:fs`), or the frontend bundle breaks. `z.input` is the type before transforms (what a form holds), `z.infer`/`z.output` the type after.

## Hono RPC: types from routes

Hono infers each route's input (from validators) and output (from `c.json` calls, **per status code**). Export the type of the app and give it to the client:

```ts
export const app = new Hono()
  .get('/todos', (c) => c.json(todos, 200))
  .post('/todos', zValidator('json', createTodoSchema), (c) => c.json(create(c.req.valid('json')), 201));

export type AppType = typeof app;
```

```ts
import { hc } from 'hono/client';
import type { AppType } from './server';

const client = hc<AppType>('https://api.example.com');
const response = await client.todos.$post({ json: { title: 'Ship it' } });
if (response.status === 201) {
  const todo = await response.json();
}
```

`client.todos.$post` only accepts `{ json: { title: string } }`, and `response.json()` is typed from the `c.json(..., 201)` call. Checking `response.status` narrows the body type: the `404` branch has `{ error: string }`, the `201` branch has a todo.

Rules that make it work:

- **Chain the routes.** Types accumulate through the method chain. `app.get(...)` as separate statements registers the routes but loses the types. For large apps, chain per resource and combine with `app.route('/todos', todos)`.
- **`import type` only.** The client imports the **type**, never the server module, so no server code (or secrets) ends up in the browser bundle.
- **Pass explicit status codes** to `c.json` so responses are distinguishable by status.
- **Inject `fetch`.** `hc(baseUrl, { fetch })` accepts a custom fetch, used for auth headers, retries, or tests that call the app in memory: `{ fetch: (input, init) => app.request(input, init) }`. Hono also ships `testClient(app)` in `hono/testing` for the same purpose.
- `InferRequestType` and `InferResponseType` extract types for hooks such as TanStack Query's `queryFn`.

## What types do not do

Types disappear at runtime. The server must still validate every request, because not every caller is your typed client: `curl`, old app versions in users' browsers and attackers send whatever they want. Equally, the client trusts the server's types; when the API is deployed separately from the frontend, an old frontend can talk to a new backend, so evolve APIs compatibly (add fields, do not rename) even with perfect types.

Large route trees slow down the TypeScript server, because the editor recomputes the client type. Splitting apps per resource and precompiling the client type (`hc` with a pre-calculated type, as the Hono docs describe) keeps the editor responsive.

## When to choose it

Use **Hono RPC or tRPC** when one team owns a TypeScript frontend and backend in one repository: the fastest feedback loop with the least ceremony. Prefer **OpenAPI** when clients are in other languages, repositories or companies, or when you need published documentation and versioning; Hono can generate it from Zod schemas with `@hono/zod-openapi`. **Shared Zod schemas** are worth it in every TypeScript monorepo, whatever the transport. tRPC gives a richer RPC experience (procedures, subscriptions, React Query integration) but is not a REST API; Hono RPC keeps real REST routes that other clients can still call.

## Working with AI

Ask for "a chained Hono app exporting `AppType`, shared Zod schemas in a separate module, and a client built with `hc<AppType>` and an injectable `fetch`, narrowing on `response.status`". Review checklist:

- Routes are chained; `AppType` is `typeof` the chained app, not of a fresh `new Hono()`.
- The client uses `import type`; no server module is imported at runtime.
- Shared schemas have no server-only dependencies.
- The server still validates every input; the client validates forms with the same schema.
- `c.json` calls pass explicit status codes, and the client checks `status` before reading the body.
- No hand-written duplicate interfaces for API responses remain in the frontend.
