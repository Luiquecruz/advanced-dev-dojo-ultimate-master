# Routing and Request Bodies

The previous lesson routed with an `if` chain and only read the URL. Real APIs need two more pieces every framework provides: a **route table** with path parameters, and a safe **body parser**. Building both once shows you what `app.post('/users/:id', ...)` and `await c.req.json()` do for you, and what can go wrong when a hand-rolled version skips a step.

## A route table

Instead of nested `if`s, describe routes as data and let one function dispatch:

```ts
const routes: Route[] = [
  { method: 'GET', pattern: '/users/:id', handler: getUser },
  { method: 'POST', pattern: '/users', handler: createUser },
];
```

Matching splits the pattern and the pathname into segments: literal segments must be equal, `:name` segments capture the value (URL-decoded) into `params`:

```ts
matchRoute('/users/:id/posts/:postId', '/users/7/posts/42');
// { id: '7', postId: '42' }
matchRoute('/users/:id', '/users/7/posts');  // null
```

Parameters are always **strings**: `Number(params.id)` and validation are your job (a later lesson uses Zod). Frameworks compile patterns into a regular expression or a radix tree for speed, and add wildcards, optional segments and constraints, but the contract is the same.

## 404 vs 405

When no route matches the path, answer `404 Not Found`. When the path exists but not for this method (`DELETE /users/7` on a read-only resource), the correct answer is `405 Method Not Allowed` with an `Allow` header listing the valid methods. Clients and API tools use it, and it tells a developer immediately that the URL is right and the method is wrong.

## Reading the body

`req` is a readable stream; the body arrives in chunks. The safe recipe checks four things before handing data to your handler:

```ts
async function readJsonBody(req: IncomingMessage, limit: number) {
  if (!req.headers['content-type']?.startsWith('application/json')) {
    throw new HttpError(415, 'Content-Type must be application/json');
  }
  req.setEncoding('utf8');
  let text = '';
  let size = 0;
  for await (const chunk of req) {
    size += Buffer.byteLength(chunk);
    if (size > limit) throw new HttpError(413, 'Payload too large');
    text += chunk;
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new HttpError(400, 'Invalid JSON');
  }
}
```

| Check | Status | Why |
| --- | --- | --- |
| `Content-Type` is JSON | `415 Unsupported Media Type` | forms or text sent to a JSON endpoint; also blocks some CSRF tricks that rely on "simple" content types |
| size within limit | `413 Payload Too Large` | without a limit, one client can exhaust memory |
| valid JSON | `400 Bad Request` | malformed input is the client's fault, not a `500` |
| valid shape | `400` or `422` | `JSON.parse` only proves syntax; validate fields next |

`setEncoding('utf8')` makes the stream decode safely, keeping a multi-byte character split across chunks until its last byte arrives (the buffers lesson); collecting `Buffer` chunks and calling `Buffer.concat` once at the end is the equivalent byte-level approach. Either way, count **bytes** (`Buffer.byteLength`), not string length. A `Content-Length` header lets you reject oversized bodies before reading anything, but it can be absent (chunked uploads) or lie, so keep counting while reading. In production also stop the upload (`req.destroy()` or close the connection) instead of continuing to receive data you will reject.

## Errors as HTTP responses

Handlers throw; the dispatcher translates. A small `HttpError` class carries the status for expected failures, and everything else becomes a generic `500`:

```ts
try {
  const result = await route.handler(req, params);
  sendJson(res, result.status, result.body);
} catch (error) {
  if (error instanceof HttpError) return sendJson(res, error.status, { error: error.message });
  console.error(error);
  sendJson(res, 500, { error: 'Internal server error' });
}
```

The `500` body never includes `error.message` or a stack: internal messages leak table names, file paths and library versions. Log them server-side instead. Without this `try/catch`, a rejected promise in a `node:http` listener leaves the request hanging and, depending on configuration, crashes the process.

## When to choose it

Write your own router and body parser to learn, or in a zero-dependency microservice with a handful of routes. For an application, choose a framework: Hono, Fastify and Express give you fast routing, body limits, content negotiation, `405` handling and error hooks, tested against edge cases you have not thought of. What you should keep from this lesson is the checklist, because frameworks differ in defaults: Express's `express.json()` has a 100 KB limit, Fastify's 1 MB, and Hono reads whatever arrives unless you add `bodyLimit`.

## Working with AI

When you ask for an endpoint, state the body limit, the accepted content types and the error format (`{ error: string }`). Review generated code for:

- bodies read with no size limit, or with `str.length` instead of bytes;
- `JSON.parse` without `try/catch` (malformed JSON becomes a `500`);
- missing `Content-Type` checks on JSON endpoints;
- route params used as numbers or SQL fragments without conversion and validation;
- error handlers that send `error.message` or stacks to clients;
- `404` returned where `405` with `Allow` is the honest answer.
