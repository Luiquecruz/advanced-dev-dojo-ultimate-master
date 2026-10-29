# Functional Core, Imperative Shell

Backend code does two very different kinds of work. It **decides** (what is the total, may this user cancel, which discount wins) and it **does** (read the database, call the payment API, write a log line). Mixing both in the same function is what makes handlers hard to test and hard to review. The *functional core, imperative shell* pattern separates them:

- **Functional core**: pure functions that take data and return data. No I/O, no clock, no randomness, no mutation.
- **Imperative shell**: a thin layer (route handler, job, CLI) that loads data, calls the core, and persists the result.

If you write React, you already know this split: a reducer is a functional core, and the component that dispatches actions and fetches data is the shell.

## Pure functions

A function is **pure** when the same input always produces the same output and it changes nothing outside itself.

```ts
function lineTotal(item: { unitPrice: number; quantity: number }): number {
  return item.unitPrice * item.quantity;
}

let requests = 0;
function priceWithLog(item: { unitPrice: number; quantity: number }): number {
  requests++;
  console.log('pricing', item);
  return item.unitPrice * item.quantity * (Date.now() % 2 ? 1 : 0.9);
}
```

`lineTotal` can be tested with one line and cached safely. `priceWithLog` depends on the clock, writes to a shared counter and logs: its tests need fake timers and console spies, and two servers running it disagree.

## Immutability

Mutating an input is the backend version of mutating React state: callers that still hold the old reference see it change under them. Return new objects instead.

```ts
interface Cart { items: readonly { sku: string; quantity: number }[] }

function addOne(cart: Cart, sku: string): Cart {
  return {
    ...cart,
    items: cart.items.map((item) => (item.sku === sku ? { ...item, quantity: item.quantity + 1 } : item)),
  };
}
```

`readonly` and `Readonly<T>` make the compiler reject `cart.items.push(...)`. At runtime, `Object.freeze` turns accidental mutation into a `TypeError` in strict mode, which is a useful trick in tests. For deep updates, `structuredClone` or Immer (used by Redux Toolkit) do the copying for you.

Money is a classic pitfall: store **integer cents**, never floats (`0.1 + 0.2 !== 0.3`), and round once, explicitly, where a percentage is applied.

## Composition

Small pure functions combine into bigger ones. `pipe` applies functions left to right, so the code reads in execution order:

```ts
function pipe<T>(...fns: Array<(value: T) => T>): (value: T) => T {
  return (value) => fns.reduce((acc, fn) => fn(acc), value);
}

const normalizeEmail = pipe<string>(
  (value) => value.trim(),
  (value) => value.toLowerCase(),
);
normalizeEmail('  Ada@Example.COM ');
```

A list of rules expressed as `(summary) => summary` functions is open for extension: a new promotion is a new function, not a new `if` inside a 200-line handler.

## The shell stays thin

```ts
app.post('/carts/:id/checkout', async (c) => {
  const cart = await carts.find(c.req.param('id'));
  const summary = priceCart(cart, activeRules(new Date()));
  await orders.save({ cartId: cart.id, ...summary });
  return c.json(summary, 201);
});
```

The handler does I/O and passes values in, including "now". `priceCart` never asks the clock: the shell decides the time and the core stays deterministic. That single habit (inject the current time instead of calling `Date.now()` deep inside) removes most flaky tests.

## Pitfalls

- **Hidden impurity**: `Math.random()`, `new Date()`, `process.env` and module-level caches inside "pure" helpers.
- **Shallow copies**: `{ ...cart }` copies the top level only; `cart.items.push` still mutates the shared array.
- **Over-abstracting**: curried point-free chains that nobody on the team can read. Plain functions with clear names beat clever combinators.
- **Performance myths**: copying a 20-item cart is free; copying a 100 000-row array per request is not. Keep large data in the shell (streams, database queries) and pass the core only what it decides on.

## When to choose it

Use a functional core for business rules: pricing, permissions, state transitions, validation, formatting, anything you want exhaustive unit tests for. Keep I/O, retries and transactions in the shell. Classes and objects (next lesson) still fit well for things with identity and lifecycle (connections, clients, caches); the two styles mix happily in TypeScript. Skip the ceremony for a ten-line CRUD handler with no rules: there is no core to extract.

## Working with AI

Ask for "pure functions for the business rules, with the handler only doing I/O" and "inject the current time as a parameter". When reviewing generated code, check:

- Rule functions never call `Date.now()`, `Math.random()`, `fetch`, the database or `console`.
- Inputs are not mutated (`push`, `splice`, `sort` on an argument, assignment to `arg.x`); look especially for in-place `sort()`.
- Money is integer cents and rounding happens in one place.
- Unit tests call the core directly with plain objects, without mocks; if the tests need mocks, I/O leaked into the core.
