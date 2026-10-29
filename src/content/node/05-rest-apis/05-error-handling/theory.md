# Error Handling

An API fails in three different ways, and each needs a different answer:

| Kind | Example | Answer |
| --- | --- | --- |
| **Client error** | invalid amount, missing token | `4xx` with a message the client can act on |
| **Domain error** | account not found, insufficient funds | `404`, `409`, `422`... decided by the business rule |
| **Bug or outage** | `TypeError`, database down | `500` with a generic message; details go to the logs, never to the client |

Scattering `try/catch` in every handler mixes these up and produces a different error shape per route. The modern approach: **throw** typed errors where the problem is detected and translate them in **one** place.

## HTTPException: errors that already know their status

```ts
import { HTTPException } from 'hono/http-exception';

app.post('/accounts/:id/withdraw', async (c) => {
  const { amount } = await c.req.json<{ amount: number }>();
  if (!(amount > 0)) {
    throw new HTTPException(400, { message: 'Amount must be positive' });
  }
});
```

`HTTPException` is for the HTTP layer: it carries `status` and `message`, and Hono's default handler turns it into a plain-text response. Use it in routes and middleware (auth, rate limits), not in services.

## Domain errors: keep HTTP out of the business code

The service should not know it runs behind HTTP; the same `withdraw` may be called by a queue worker or a CLI. Give it its own error classes:

```ts
export class NotFoundError extends Error {
  name = 'NotFoundError';
}

export class InsufficientFundsError extends Error {
  name = 'InsufficientFundsError';
  constructor() {
    super('Insufficient funds');
  }
}

export function withdraw(id: number, amount: number) {
  const account = findAccount(id);
  if (account.balance < amount) {
    throw new InsufficientFundsError();
  }
  account.balance -= amount;
  return account;
}
```

Use `instanceof`, never message matching, to tell errors apart. Messages change; classes are a contract. (The paradigms module shows the alternative of returning errors as values with a `Result` type.)

## One translator: app.onError

```ts
app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return c.json({ error: err.message }, err.status);
  }
  if (err instanceof NotFoundError) {
    return c.json({ error: err.message }, 404);
  }
  console.error(err);
  return c.json({ error: 'Internal Server Error' }, 500);
});

app.notFound((c) => c.json({ error: 'Route not found' }, 404));
```

`onError` receives everything thrown in handlers and middleware, including rejected promises from `async` handlers. `notFound` handles requests that matched no route. Together they guarantee one error shape for the whole API.

The last branch is the important one: an unknown error might contain a SQL statement, a hostname, a stack trace or a secret. Log it in full (with the request id from the middleware lesson) and answer a generic `500`. Leaking internals helps attackers map your system and is listed in the OWASP API Top 10 under security misconfiguration.

## Pitfalls

- **Swallowing errors**: `catch (e) { return c.json([]) }` hides outages behind empty data. Catch only what you can handle.
- **Throwing strings**: `throw 'not found'` has no stack and fails `instanceof`. Always throw `Error` subclasses.
- **Unawaited promises**: a promise you do not `await` rejects after the response is sent, outside `onError`, and becomes an `unhandledRejection` that crashes Node by default.
- **Status from the message**: `if (err.message.includes('not found'))` breaks on the next copy edit.
- **Express habits**: in Express 4, errors in async handlers needed `next(err)` or a wrapper; Express 5 and Hono catch rejected promises for you.

## Process-level safety nets

`process.on('unhandledRejection')` and `process.on('uncaughtException')` are for logging and a controlled exit, not for recovery: after an uncaught exception the process state is unknown, so log, stop accepting traffic and let the orchestrator restart it (graceful shutdown is covered in the scaling module).

## When to choose it

Use a central `onError` with typed errors in every API: it is the only way to keep one error shape and to guarantee internals never leak. Map domain errors with `instanceof` in the handler when the domain must stay HTTP-agnostic; give domain errors a `status` property when the code base is small and only ever served over HTTP (simpler, but couples layers). Return errors as values (`Result`) when failures are frequent and expected, such as validation-heavy workflows, and exceptions for truly exceptional paths. For public APIs, consider RFC 9457 Problem Details (`application/problem+json`) as the shape.

## Working with AI

Ask for "domain error classes in the service, one `app.onError` that maps them with `instanceof`, `notFound` with the same JSON shape, and a generic 500 that logs the original error". Review checklist:

- No `try/catch` in handlers that only re-formats errors; one translator owns it.
- Unknown errors answer a generic message; no `err.message` or `err.stack` in 500 bodies.
- Every error is logged once, with context, at the edge, not at every layer.
- No errors identified by message text; no thrown strings.
- `HTTPException` stays in the HTTP layer; services throw domain errors.
- Every `async` call is awaited, so failures reach `onError`.
