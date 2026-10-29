# Errors as Values

JavaScript has one built-in error mechanism: `throw`. It is invisible in signatures. `function transfer(...): Account` says nothing about the four ways a transfer can fail, so callers forget to handle them, and a forgotten case surfaces as a 500 in production.

Two kinds of failure deserve different tools:

| Failure | Examples | Tool |
| --- | --- | --- |
| **Expected** (part of the domain) | insufficient funds, unknown account, invalid input, slot already booked | Return it as a **value** in the type |
| **Unexpected** (bugs, infrastructure) | database down, `undefined` is not a function, out of memory | `throw` and let a global handler log it and answer 500 |

## The Result type

A `Result` is a discriminated union: either a success with a value or a failure with an error.

```ts
type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };

const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });
const err = <E>(error: E): Result<never, E> => ({ ok: false, error });

function parseAmount(input: unknown): Result<number, { type: 'invalid_amount' }> {
  return Number.isInteger(input) && (input as number) > 0 ? ok(input as number) : err({ type: 'invalid_amount' });
}

const amount = parseAmount(body.amount);
if (!amount.ok) {
  return c.json({ error: amount.error.type }, 400);
}
amount.value;
```

TypeScript narrows on `ok`: you cannot read `value` before checking, and the error type is part of the signature. If you used Rust's `Result` or Go's `value, err` returns, this is the same idea. Frontend developers know it from `useQuery` (`{ data } | { error }`) and from Zod's `safeParse` (`{ success: true, data } | { success: false, error }`).

## Domain errors as a union

Model each failure as data, with exactly the fields a caller needs:

```ts
type TransferError =
  | { type: 'invalid_amount' }
  | { type: 'same_account' }
  | { type: 'account_not_found'; accountId: string }
  | { type: 'insufficient_funds'; balance: number; amount: number };
```

Then translate to HTTP with an **exhaustive** switch. The `never` assignment makes the compiler fail when someone adds a fifth error type and forgets to map it:

```ts
function toHttpError(error: TransferError) {
  switch (error.type) {
    case 'invalid_amount':
      return { status: 400, body: { error: error.type, message: 'Amount must be a positive integer of cents' } } as const;
    case 'account_not_found':
      return { status: 404, body: { error: error.type, message: `Account ${error.accountId} not found` } } as const;
    default: {
      const unreachable: never = error;
      return unreachable;
    }
  }
}
```

## Chaining without pyramids

Checking `if (!result.ok) return result` after every step works, but helpers keep pipelines flat:

```ts
function map<T, U, E>(result: Result<T, E>, fn: (value: T) => U): Result<U, E> {
  return result.ok ? ok(fn(result.value)) : result;
}

function andThen<T, U, E, F>(result: Result<T, E>, fn: (value: T) => Result<U, F>): Result<U, E | F> {
  return result.ok ? fn(result.value) : result;
}

const result = andThen(parseAmount(body.amount), (amount) => findAccount(accounts, body.from));
```

`map` transforms a success; `andThen` (also called `flatMap` or `chain`) runs the next step only on success and **short-circuits** on the first error, like a chain of `await`s that stops at the first throw, but visible in types.

## Libraries

- **neverthrow**: `ok`, `err`, `.map`, `.andThen`, `ResultAsync` for promises. Popular, small.
- **Effect**: a full effect system (errors, dependencies, concurrency) with a steep learning curve.
- **Zod `safeParse`**, `Promise.allSettled`: built-in result-shaped APIs you already use.

A hand-written 15-line `Result` is fine for a service; adopt a library when you need async chaining everywhere.

## Pitfalls

- **Returning results for bugs**: wrapping every `JSON.parse` and database call in `Result` turns code into noise. Infrastructure failures stay exceptions.
- **Stringly errors**: `err('not found')` loses the fields (`accountId`) the caller needs; use objects with a `type`.
- **Forgetting to check**: a `Result` ignored by `void doTransfer()` is as silent as an unawaited promise. Lint rules (`neverthrow/must-use-result`) help.
- **Mixing styles inside one layer**: pick one convention per layer (service returns results, infrastructure throws) and document it.
- **Mutating before validating**: compute the whole result first, then commit state; a half-applied transfer is worse than an error.

## When to choose it

Use results for expected business failures in services that callers must handle differently (validation, conflicts, insufficient funds, permissions), especially in TypeScript codebases where exhaustiveness checks pay off. Keep exceptions for unexpected failures and when a framework expects them (Hono `HTTPException`, NestJS filters). Domain error classes plus one `onError` handler (previous lessons) are a valid, simpler alternative for small APIs; the trade-off is that the possible failures are not in the signature.

## Working with AI

Ask for "a `Result<T, E>` return type with a discriminated union of domain errors and an exhaustive mapping to HTTP status codes". When reviewing:

- Expected failures are in the return type; nothing in the service throws for them.
- Every error variant carries the data the response needs and maps to exactly one status code.
- The mapping switch has a `never` check, so new variants fail compilation.
- Unexpected errors still throw and reach a 500 handler; results do not swallow them.
- State changes happen only after the whole result is `ok`.
