Implement two rate limiting algorithms behind one interface and plug them into Hono. Both limiters receive an injectable clock `now` (milliseconds, default `Date.now`) and keep separate state per `key`. `consume(key)` returns `{ allowed, remaining, retryAfterMs }`.

## `new FixedWindowLimiter({ limit, windowMs, now? })`

Windows are aligned to multiples of `windowMs`: the current window starts at `Math.floor(now() / windowMs) * windowMs`. A key's count resets when a new window starts.

- Below the limit: count the request and return `{ allowed: true, remaining: limit - count, retryAfterMs: 0 }`.
- At the limit: return `{ allowed: false, remaining: 0, retryAfterMs: <ms until the window ends> }` without counting.

## `new TokenBucketLimiter({ capacity, refillPerSecond, now? })`

A new key starts with a full bucket (`capacity` tokens). On every `consume`, first add `elapsedMs * refillPerSecond / 1000` tokens (never more than `capacity`), then:

- With at least 1 token: take one and return `{ allowed: true, remaining: Math.floor(tokens), retryAfterMs: 0 }`.
- Otherwise: return `{ allowed: false, remaining: 0, retryAfterMs: Math.ceil((1 - tokens) * 1000 / refillPerSecond) }`.

## `rateLimit(limiter, keyOf)`

A Hono middleware: call `limiter.consume(keyOf(c))` once per request and set `X-RateLimit-Remaining` to `remaining` on the response. When the request is not allowed, answer `429` with `{ "error": "Too many requests" }` and `Retry-After` set to `Math.ceil(retryAfterMs / 1000)` seconds; otherwise continue with `next()`.

`createApp(limiter)` is given: it limits `/api/*` by the `X-Api-Key` header (`anonymous` when missing) and leaves `/health` unlimited.
