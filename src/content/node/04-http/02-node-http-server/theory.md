# The node:http Server

Every Node.js web framework (Express, Fastify, Koa, NestJS, Hono on Node) sits on top of one built-in module: `node:http`. Writing one server by hand once removes the magic: a framework is a nicer way to do what you will do here.

## The smallest server

```ts
import { createServer } from 'node:http';

const server = createServer((req, res) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain');
  res.end('Hello from Node');
});

server.listen(3000, () => console.log('Listening on http://localhost:3000'));
```

`createServer` receives a **request listener** that runs once per request with two objects:

| Object | Type | What you use |
| --- | --- | --- |
| `req` | `IncomingMessage` (a readable stream) | `req.method`, `req.url` (path + query string), `req.headers` (always lowercase keys), the body as a stream |
| `res` | `ServerResponse` (a writable stream) | `res.statusCode`, `res.setHeader()`, `res.writeHead()`, `res.write()`, `res.end()` |

The response is not sent when the function returns. It is sent when you call `res.end()`. Forget it and the client waits until it times out: the most common bug in hand-written servers.

## Status, headers, body: in that order

HTTP sends the status line and the headers before the body. Node enforces it: once the first byte of the body is written, `setHeader` throws `ERR_HTTP_HEADERS_SENT`. Two equivalent styles:

```ts
res.statusCode = 404;
res.setHeader('Content-Type', 'application/json');
res.end(JSON.stringify({ error: 'Not found' }));

res.writeHead(404, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: 'Not found' }));
```

There is no `res.json()`: that is an Express/Hono convenience. You serialize with `JSON.stringify` and declare the type with `Content-Type: application/json` so clients (`fetch(...).json()`) know how to parse it. A tiny helper keeps handlers short:

```ts
function sendJson(res: ServerResponse, status: number, data: unknown) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}
```

## Reading the URL

`req.url` is only the path and query string (`/todos/2?fields=title`). Parse it with the WHATWG `URL` class, which needs a base because the URL is relative:

```ts
const { pathname, searchParams } = new URL(req.url ?? '/', 'http://localhost');
```

Routing is then plain code: compare `req.method` and `pathname`, and use a regular expression or `split('/')` for parameters. Frameworks replace this `if` chain with a route table (next lessons build one).

```ts
const match = /^\/todos\/(\d+)$/.exec(pathname);
if (req.method === 'GET' && match) {
  const id = Number(match[1]);
}
```

## One process, many requests

The listener runs on the single JavaScript thread. While one request waits for I/O (a database, a file, another API) Node serves others, which is why Node handles thousands of concurrent connections. A CPU-heavy loop inside the listener blocks **every** request: keep handlers short and push heavy work elsewhere (covered in the scaling module).

State in module variables (an array of todos) is shared by every request and lost on restart. That is fine for learning and caches, never for real data: it also breaks as soon as you run two instances.

## How this runs in Dev Dojo

The browser cannot open real ports, so the lesson runtime provides an in-memory `node:http`. `server.listen(port)` registers the port, `fetch('http://localhost:<port>/...')` reaches it, and the tests call `request(server, '/todos')`, the same idea as Supertest in a real project. The code you write is the same code you would run with `node main.ts`.

## When to choose it

Use raw `node:http` to understand the platform, for a tiny internal endpoint (health check, webhook receiver, metrics) with zero dependencies, or when writing a library that must not depend on a framework. For an application API choose a framework: routing, body parsing, validation, error handling and middleware are solved problems, and the framework's conventions make AI-generated code consistent.

## Working with AI

Assistants often generate Express code by default. When you ask for raw `node:http` (or review code that uses it), check: every branch ends with `res.end()`, `Content-Type` is set for JSON, unknown routes return `404` instead of hanging, the URL is parsed with `new URL()` rather than string slicing, and there is no `await` on CPU-heavy work inside the listener.
