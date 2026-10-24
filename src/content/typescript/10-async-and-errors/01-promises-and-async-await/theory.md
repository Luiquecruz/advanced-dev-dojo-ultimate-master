## Promises carry their result type

A `Promise<T>` is a placeholder for a value of type `T` that arrives later. TypeScript tracks `T` through every `then`, `await` and combinator, so asynchronous code is checked as strictly as synchronous code.

```ts
const answer: Promise<number> = Promise.resolve(42);

answer.then((value) => value.toFixed(2)); // value: number
```

## async functions always return a Promise

Marking a function `async` wraps whatever it returns in a promise. The annotation must therefore be `Promise<T>`, never `T`:

```ts
async function loadName(id: number): Promise<string> {
  const response = await fakeRequest(id); // await unwraps Promise<Response>
  return response.name;                   // string becomes Promise<string>
}

// async function broken(): string {}  // Error: the return type must be Promise<string>
```

`await` works on any value. Awaiting a non-promise simply yields the value itself, which is why the built-in `Awaited<T>` type recursively unwraps nested promises: `Awaited<Promise<Promise<number>>>` is `number`.

## Running work in parallel

Every `await` pauses the function. Two independent requests written one after another take the **sum** of their durations:

```ts
// Sequential: ~200 ms when each call takes ~100 ms
const user = await api.getUser(1);
const posts = await api.getPosts(1);
```

Start both promises first and await them together with `Promise.all`. TypeScript types the result as a **tuple**, keeping each position's type:

```ts
// Parallel: ~100 ms
const [user, posts] = await Promise.all([api.getUser(1), api.getPosts(1)]);
//     ^? User   ^? Post[]
```

| Combinator | Resolves when | Rejects when | Result type |
| --- | --- | --- | --- |
| `Promise.all` | all fulfil | the first one rejects | tuple of values |
| `Promise.allSettled` | all settle | never | tuple of `PromiseSettledResult<T>` |
| `Promise.race` | the first one settles | the first one settles with an error | union of values |
| `Promise.any` | the first one fulfils | all reject (`AggregateError`) | union of values |

`Promise.race` is the classic building block for timeouts: race the real work against a promise that rejects after a delay.

```ts
function rejectAfter(ms: number): Promise<never> {
  return new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms));
}
```

The return type `Promise<never>` says "this never fulfils", so racing it with a `Promise<User>` still produces `Promise<User>`.

## Creating promises by hand

`new Promise<T>((resolve, reject) => ...)` adapts callback APIs. The type argument types `resolve`. ES2024 added `Promise.withResolvers<T>()`, which returns `{ promise, resolve, reject }` so you can settle a promise from outside the executor:

```ts
const { promise, resolve } = Promise.withResolvers<string>();
setTimeout(() => resolve('done'), 10);
await promise; // string
```

## Legacy vs modern

Before `async`/`await` (ES2017) code chained `.then()` callbacks and, earlier still, used Node-style callbacks `(error, result) => void`. Both still work, but `async` functions read top to bottom and let you use `try`/`catch`, loops and early returns naturally.

## Pitfalls

- **Floating promises**: calling an async function without `await` or `.catch()` loses its errors. Linters such as `@typescript-eslint/no-floating-promises` catch this.
- **`forEach` with async callbacks** does not wait. Use `for...of` with `await` (sequential) or `Promise.all(items.map(...))` (parallel).
- **Timers leak**: a timeout that is never cleared keeps running after the race is decided. Clear it in `finally`.
- **`return promise` inside `try`** skips the `catch` block when the promise rejects. Write `return await promise` when you want local error handling.
