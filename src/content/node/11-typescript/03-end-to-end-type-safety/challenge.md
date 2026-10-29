Connect a Hono API and its client with shared schemas and inferred types. The project has four files:

| File | Role |
| --- | --- |
| `schemas.ts` | Zod schemas and types shared by server and client |
| `server.ts` | The Hono app and `AppType` |
| `client.ts` | `createTodoClient`, built on `hc<AppType>` |
| `main.ts` | Wires the client to the app in memory (**Run** prints the results) |

**schemas.ts**

1. `createTodoSchema`: `title` is trimmed and must have 1 to 100 characters.

**server.ts**

2. Build `app` as **one chain** (`new Hono().get(...).post(...).patch(...)`) so `export type AppType = typeof app` contains every route.
3. `POST /todos`: `zValidator('json', createTodoSchema, hook)`; invalid bodies answer `400 { "error": "Invalid todo" }`. Valid ones create `{ id, title, done: false }` (`id` one above the highest) and answer `201` with it.
4. `PATCH /todos/:id/toggle`: `zValidator('param', todoParamsSchema, hook)`; an invalid id answers `400 { "error": "Invalid id" }`, an unknown id `404 { "error": "Todo not found" }`, otherwise flip `done` and answer `200` with the todo.

**client.ts**

5. `createTodoClient(fetchImpl, baseUrl = 'http://localhost')` creates `hc<AppType>(baseUrl, { fetch: fetchImpl })` and returns:
   - `list()`: `GET /todos`, resolves with the todos.
   - `create(input)`: parses `input` with `createTodoSchema` **before** sending (invalid input rejects without any request), then `POST /todos`; resolves with the created todo when the status is `201`.
   - `toggle(id)`: `PATCH /todos/:id/toggle`; resolves with the todo when the status is `200`.
   - Any other status rejects with `new ApiError(status, message)`, where `message` is the `error` string of the JSON body.
6. Import `AppType` with `import type` so the client never loads server code.
