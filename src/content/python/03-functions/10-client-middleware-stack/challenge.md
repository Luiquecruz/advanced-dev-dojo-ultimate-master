An internal HTTP SDK wraps every call with caching, metrics, retries and token refresh. Build the four layers as decorator factories in `main.py` and compose them in `build_client`. Every layer preserves metadata with `functools.wraps`. No layer keeps state at module level: everything a layer remembers lives in what was injected or in its closure.

The raw call has the shape `call(*args, token, **kwargs)`: it takes the request arguments plus a keyword `token`, and raises `AuthExpired` (defined in `main.py`) when the token has expired, or `ConnectionError` on a transient failure.

## `cached(store)`

`store` is a dict. The key is `cache_key(args, kwargs)` (given). On a hit, return the stored value **without** calling the wrapped function. On a miss, call it, store the result and return it.

## `measured(metrics, clock)`

`metrics` is a list and `clock()` returns seconds. Per call, append **one** sample `{"name": function.__name__, "elapsed": clock() - start, "ok": bool}`, where `ok` is `False` when the call raised (re-raise it).

## `retried(times, exceptions)`

Given: up to `times` attempts in total, retrying only `exceptions`, re-raising the last error.

## `authenticated(tokens)`

`tokens` has `current()` and `refresh()`, both returning a token string. Call the wrapped function with `token=tokens.current()`. On `AuthExpired`, call `tokens.refresh()` **once** and call again with the new token; a second `AuthExpired` propagates.

## `build_client(call, *, store, metrics, tokens, clock)`

Return `call` wrapped in this order, **outermost first**: `cached(store)` → `measured(metrics, clock)` → `retried(3, (ConnectionError,))` → `authenticated(tokens)`. So a cache hit skips everything, and a call that needed three attempts produces three inner calls but one metrics sample whose `elapsed` covers all attempts. The client is called without `token`: `client("/orders")`.
