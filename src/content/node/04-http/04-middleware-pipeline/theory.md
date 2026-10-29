# The Middleware Pipeline

Every request to an API needs the same cross-cutting work: logging, timing, authentication, CORS, error handling, body parsing. Copying it into every handler does not scale, so every framework offers **middleware**: functions that run around the handler, in order, sharing one request context. You have seen the idea in the frontend: Angular HTTP interceptors, axios interceptors and Redux middleware are the same pattern.

## The onion model

Koa popularized the cleanest version, and Hono uses it too. A middleware receives the context and a `next` function. Code before `await next()` runs on the way in; code after it runs on the way out, when everything downstream has finished:

```ts
const timing: Middleware = async (ctx, next) => {
  const start = Date.now();
  await next();
  ctx.responseHeaders['X-Response-Time'] = `${Date.now() - start}ms`;
};
```

With `[logger, timing, auth, handler]`, the request travels `logger → timing → auth → handler` and the response travels back `handler → auth → timing → logger`, like layers of an onion. Each layer can:

- **pass through**: `await next()` and do nothing else;
- **short-circuit**: set a response and not call `next` (auth failing with `401`, a cache hit);
- **decorate**: change the response after `next` (headers, compression);
- **guard**: wrap `next` in `try/catch` and turn errors into responses.

## compose()

The whole mechanism fits in a few lines. `compose` turns an array of middleware into one function; `dispatch(i)` calls middleware `i` with a `next` that dispatches `i + 1`:

```ts
function compose(middleware: Middleware[]) {
  return (ctx: Context) => {
    const dispatch = async (i: number): Promise<void> => {
      const fn = middleware[i];
      if (fn) await fn(ctx, () => dispatch(i + 1));
    };
    return dispatch(0);
  };
}
```

Production versions add two safeguards. Because `dispatch` is `async`, a middleware that throws synchronously still produces a rejected promise the error handler can catch. And calling `next()` twice in one middleware (a classic bug in `if/else` branches) would run the rest of the chain twice, so `compose` tracks the last index and rejects with `next() called multiple times`.

## Order is the configuration

The array order *is* the behavior:

| Position | Middleware | Why there |
| --- | --- | --- |
| first | error handler | must wrap everything to catch any error |
| early | request id, logger, timing | must observe the full request |
| before routes | CORS | preflight `OPTIONS` must be answered before auth rejects it |
| before protected routes | auth | short-circuits unauthenticated requests |
| last | the route handler | produces the response |

Put auth after the route and nothing is protected; put the error handler last and it catches nothing. Reviewing middleware is mostly reviewing order.

## How the frameworks do it

| | Signature | Errors |
| --- | --- | --- |
| Koa | `async (ctx, next) => { await next() }` | `try/catch` around `await next()` |
| Hono | `async (c, next) => { await next() }`, response in `c.res` | `app.onError`, `HTTPException` |
| Express 4 | `(req, res, next) => { next() }` callback, no onion | `next(err)` + a 4-argument `(err, req, res, next)` middleware; async errors are lost unless forwarded |
| Express 5 | same, but rejected promises are forwarded to the error middleware | same |
| Fastify | lifecycle hooks (`onRequest`, `preHandler`, `onSend`) instead of one chain | `setErrorHandler` |

Express's `next()` does not return a promise you can await, so "after" logic uses `res.on('finish')`. That is why timing and logging middleware look so different across frameworks, and why mixing Express middleware into Koa or Hono needs adapters.

## Context design

Middleware communicates through the context: auth sets `ctx.user`, the request id middleware sets `ctx.requestId`, handlers read them. Keep the context typed (Hono's `Variables` generic, Express `res.locals` typing) so a handler cannot read `ctx.user` that no middleware sets. A response object built up on the context and written once at the end (as Koa and Hono do) also makes "set a header after the body was sent" impossible.

## When to choose it

Use middleware for concerns that apply to many routes and do not depend on business rules: errors, logging, ids, timing, CORS, security headers, authentication, rate limiting, body limits. Keep business logic (who may edit *this* order, validation of *this* payload) in handlers or services, where it is explicit and testable; apply middleware per route group when only some routes need it. Prefer the framework's built-in middleware over your own for security-sensitive pieces such as CORS and auth parsing.

## Working with AI

Give the assistant the full chain in order ("error handler, request id, logger, CORS, auth on `/api/*`, routes") and which routes are public. Review the result for:

- the error handler registered late or missing;
- auth placed after routes, or applied globally to public routes like `/health`;
- middleware that neither calls `next` nor sets a response (the request hangs);
- `next()` called twice, or called after a response was sent;
- in Express 4, `async` middleware without error forwarding;
- business rules hidden in global middleware;
- API keys compared with `===` instead of a constant-time comparison.
