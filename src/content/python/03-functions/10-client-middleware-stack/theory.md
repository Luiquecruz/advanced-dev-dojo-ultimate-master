This lesson combines the module: decorator factories, closures holding state, injected clocks and `functools.wraps`, all wrapped around one function. An SDK call usually needs several **cross-cutting behaviors**: caching, metrics, retries, authentication. Each one is a decorator factory, and the **order** of the stack decides what the program does.

```py
client = cached(store)(
    measured(metrics, clock)(
        retried(3, (ConnectionError,))(
            authenticated(tokens)(fetch))))

# the same stack written with @, read bottom-up for wrapping and top-down for calls:
# @cached(store)
# @measured(metrics, clock)
# @retried(3, (ConnectionError,))
# @authenticated(tokens)
# def fetch(path, *, token): ...
```

A call enters `cached` first. On a hit it returns at once and nothing inside runs. On a miss it calls `measured`, which starts the clock and calls `retried`, which may call `authenticated` several times, which calls `fetch` with a token.

## Coming from TypeScript and JavaScript

Axios interceptors and Express middleware are **registered** on a shared object, and their order is the order of the `use` calls spread across the codebase:

```ts
api.interceptors.request.use(addToken);      // registered in auth.ts
api.interceptors.response.use(retryOnError); // registered in retry.ts
api.interceptors.response.use(recordMetric); // registered in metrics.ts: runs per attempt or per call?
```

Two habits break when they come to Python. First, **global registration**: putting the cache dict or the metrics list at module level (`_CACHE = {}`), the way a shared Axios instance holds its interceptors. Every client built from those decorators then shares one cache, so a test for one client sees results from another. Second, **reading the order like a registration list**: in Python the stack order *is* the nesting, so it must be decided in one place, explicitly:

```py
outermost_first = [cached(store), measured(metrics, clock), retried(3, (ConnectionError,)), authenticated(tokens)]
client = fetch
for layer in reversed(outermost_first):
    client = layer(client)
```

## How it works

Each position has a consequence you can test:

| If... | then... |
| --- | --- |
| `cached` is outermost | a hit skips metrics, retries and auth entirely |
| `measured` is outside `retried` | one sample per client call, with the total time across attempts |
| `measured` is inside `retried` | one sample per attempt; dashboards count failures as calls |
| `authenticated` is innermost | every retry attempt gets the current token, and a refresh is retried locally once |

State lives in **closures** created by the factories: the cache store, the metrics list and the token source are injected, so two clients built side by side never share anything, and tests pass fakes. The clock is injected too, so a test can advance time per attempt instead of sleeping.

Every layer uses `functools.wraps`, so the final client still reports `__name__ == "fetch"` and its docstring, and `__wrapped__` leads layer by layer to the original function (`inspect.unwrap(client)` follows the whole chain). Tracebacks and logs then name the real operation instead of `wrapper`.

Pitfalls:

- Refreshing a token in a loop turns one expired credential into a refresh storm. Refresh **once**, retry once, and let a second `AuthExpired` escape.
- Retrying `AuthExpired` in the generic retry layer hides auth bugs; list only transient errors in `retried`.
- A metrics layer must record failures too: use `try`/`finally` so a raising call still produces a sample.

## When to choose it

- **A stack of decorator factories** when the behaviors are independent and reusable across calls, and the order can be fixed in one builder function.
- **Injected stores, metrics sinks, token sources and clocks** whenever behavior has state or time: it keeps clients independent and tests deterministic.
- **A class** (a client object with methods) when the behaviors need to share state with each other, not just wrap the call.
- **Avoid** module-level caches and registries for per-client behavior.
