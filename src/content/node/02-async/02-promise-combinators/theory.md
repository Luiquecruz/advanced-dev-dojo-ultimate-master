# Promise Combinators

A backend handler rarely does one thing. It loads a user **and** their orders, notifies several channels, asks two mirrors for the same file. Awaiting each call in turn wastes time when they do not depend on each other; four built-in combinators run promises concurrently and differ in **when they settle** and **what they do with failures**.

## Sequential vs concurrent

```ts
const user = await getUser(id);
const orders = await getOrders(id);
```

Each `await` waits before the next call **starts**: 100 ms + 120 ms = 220 ms. The calls are independent, so start both first and wait once:

```ts
const [user, orders] = await Promise.all([getUser(id), getOrders(id)]);
```

Now the total is about 120 ms. Calling the functions is what starts the work; the combinator only decides how to wait.

## The four combinators

| Combinator | Fulfills when | Rejects when | Result |
| --- | --- | --- | --- |
| `Promise.all` | **all** fulfill | the **first** rejection | values in input order |
| `Promise.allSettled` | all settle (never rejects) | never | `{ status: 'fulfilled', value }` or `{ status: 'rejected', reason }` per input |
| `Promise.race` | the **first** to settle fulfills | the first to settle rejects | that single value or reason |
| `Promise.any` | the **first** to fulfill | **all** reject | first value, or an `AggregateError` with `errors` |

### Promise.all: everything is required

Use it when the result is useless without every part. Results keep **input order**, not completion order. On the first rejection it rejects immediately, but the other operations keep running; nothing is cancelled (cancellation is the topic of a later lesson).

An optional part can be made non-fatal inside `all` by catching it individually:

```ts
const [user, recommendations] = await Promise.all([
  getUser(id),
  getRecommendations(id).catch(() => []),
]);
```

### Promise.allSettled: independent outcomes

Use it when each operation succeeds or fails on its own and you want a report: sending notifications, warming caches, a batch import.

```ts
const results = await Promise.allSettled(channels.map((channel) => channel.send(message)));
const failed = results.filter((result) => result.status === 'rejected');
```

### Promise.race: whoever settles first

The classic use is a deadline: race the work against a timer that rejects.

```ts
function withTimeout<T>(work: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Timed out after ${ms} ms`)), ms);
  });
  return Promise.race([work, timeout]).finally(() => clearTimeout(timer));
}
```

Clear the timer in `finally`, or every fast call leaves a pending timer that keeps the process alive. Remember that the losing promise is **not** stopped: the slow request still runs and consumes resources. `AbortSignal` fixes that.

### Promise.any: first success wins

Use it for redundancy: several mirrors, replicas or providers where any answer will do. Failures are ignored as long as one succeeds; if all fail you get an `AggregateError` whose `errors` array holds every reason. Map it to a meaningful domain error.

## Pitfalls

- **Accidental sequencing**: `await` inside a `for` loop over independent calls. Fine when order matters or to limit load, slow otherwise.
- **Unbounded fan-out**: `Promise.all(tenThousandIds.map(fetchUser))` opens 10 000 requests at once and can overload your database or hit rate limits. The next lesson limits concurrency.
- **Created but never awaited**: a promise created before an early `return` or a `throw` can reject later as an unhandled rejection.
- **Mixing up `race` and `any`**: `race` settles with the first result even if it is a failure; `any` waits for the first success.

## When to choose it

Await sequentially when each step needs the previous result or when order and load matter. Choose `all` when every part is required (fail fast), `allSettled` for independent operations you report on, `any` for redundant sources, and `race` for deadlines, preferably together with `AbortSignal` so the loser is cancelled. For large lists, pair any of them with a concurrency limit.

## Working with AI

Assistants often write independent awaits in sequence, or wrap everything in `Promise.all` without considering partial failure. Ask explicitly: "run these in parallel; the user and orders are required, recommendations are optional". When reviewing generated code, check:

- Independent calls are started together; dependent ones are awaited in order.
- The combinator matches the failure policy (required vs optional vs best effort).
- `Promise.all` over user-sized or database-sized lists has a concurrency limit.
- Timeout helpers clear their timer and the timed-out work is cancelled or harmless.
- `AggregateError` and `allSettled` results are turned into useful errors or reports, not ignored.
