# Hono Fundamentals

Hono is a small web framework built on the **Web Standards** `Request` and `Response`, the same objects you use with `fetch` in the browser. An app is a router plus a `fetch(request) => Response` function, so the same code runs on Node.js, Bun, Deno, Cloudflare Workers and serverless platforms. Everything you wrote by hand with `node:http` (URL parsing, routing, serialization, headers) becomes one line each.

## An app is a route table

```ts
import { Hono } from 'hono';

export const app = new Hono();

app.get('/health', (c) => c.text('ok'));

app.get('/books/:id', (c) => {
  const id = Number(c.req.param('id'));
  return c.json({ id });
});
```

Each method (`get`, `post`, `put`, `patch`, `delete`, `all`) registers a path and a handler. The handler receives the **context** `c` and must **return** a `Response`. Forgetting `return` is the classic Hono bug: the handler builds a response and throws it away, and the client gets a 404.

On Node you serve it with the adapter `@hono/node-server`:

```ts
import { serve } from '@hono/node-server';

serve({ fetch: app.fetch, port: 3000 });
```

In tests you skip the network entirely: `await app.request('/books/1')` returns the `Response` directly. The lesson tests use the same idea through `request(app, path)`.

## Reading the request: `c.req`

| Need | API | Note |
| --- | --- | --- |
| Path parameter | `c.req.param('id')` | Always a `string`: convert it |
| Query value | `c.req.query('author')` | `string \| undefined` |
| Repeated query (`?tag=a&tag=b`) | `c.req.queries('tag')` | `string[] \| undefined` |
| Header | `c.req.header('authorization')` | Case-insensitive |
| JSON body | `await c.req.json()` | Throws on malformed JSON |
| Form body | `await c.req.parseBody()` | `multipart` and `urlencoded` |

Everything that comes from the URL is text. `?limit=abc` gives you `'abc'` and `Number('abc')` is `NaN`, which then quietly produces an empty `slice`. Validate and convert at the edge (the validation lesson does this with Zod).

## Writing the response: `c.json`, `c.text`, `c.body`

```ts
app.post('/books', async (c) => {
  const input = await c.req.json<{ title: string; author: string }>();
  const book = { id: nextId++, ...input };
  c.header('X-Total-Count', String(books.length));
  return c.json(book, 201);
});
```

- `c.json(data, status?)` serializes and sets `Content-Type: application/json`.
- `c.text(string, status?)` sends `text/plain`.
- `c.body(null, 204)` sends a response without a body.
- `c.header(name, value)` adds a header to the response being built; `c.status(code)` sets the status for the next helper.

The default status is `200`. Use the right one, because clients and caches act on it: `201 Created` after a `POST` that creates, `204 No Content` when there is nothing to return, `400` for bad input, `404` for a missing resource.

## Routing rules worth knowing

- **Parameter patterns**: `/books/:id{[0-9]+}` only matches digits, so `/books/abc` falls through to the 404 handler instead of reaching your code with `NaN`.
- **Optional parameters**: `/books/:format?`.
- **Order**: when two routes match, the one registered first wins. Register `/books/featured` before `/books/:id`.
- **Grouping**: build a `new Hono()` per resource and mount it with `app.route('/books', booksApp)`, the equivalent of an Express `Router`.
- **Unmatched requests** answer `404 Not Found` as plain text by default; the error handling lesson customizes it.

## From frontend to backend

If you know Next.js route handlers or Remix loaders, Hono feels familiar: a function receives a `Request` and returns a `Response`. The context object is the convenience layer, like `NextResponse.json()`. Unlike Express, there is no mutable `res` to end: the returned value **is** the response, so a branch that forgets to answer is visible in the code.

## When to choose it

Choose Hono for new TypeScript APIs, especially when the code may run on edge or serverless platforms, when you want typed routes for a typed client (covered in the TypeScript module) or when a small dependency footprint matters. Choose **Express** when you join an existing Express codebase or need a specific Express-only middleware, **Fastify** for high-throughput Node-only services with schema-based serialization, and **NestJS** for large teams that want an opinionated structure with modules and dependency injection. Framework route handlers (Next.js, Nuxt, SvelteKit) are enough when the API only serves that one frontend.

## Working with AI

Ask for "a Hono app with typed routes, returning `c.json` with explicit status codes, testable with `app.request`". Name the runtime adapter (`@hono/node-server`, Bun, Workers) because assistants mix them up. Review checklist:

- Every handler **returns** a response, in every branch.
- Path parameters and query values are converted and validated, never used as raw strings in comparisons with numbers.
- Status codes match the operation (`201` on create, `404` for missing resources, not `200` with `{ error }`).
- Specific routes are registered before parameterized ones.
- No Express idioms leaked in (`req`, `res.send`, `next()` without `await`).
- Tests call `app.request()` instead of starting a real server.
