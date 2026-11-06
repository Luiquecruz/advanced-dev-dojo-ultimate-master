Implement two rate limiters. Neither one uses timers: time comes from the injected `now()` (milliseconds), read on every call, so the tests can move the clock.

```ts
export function createTokenBucket(options: { capacity: number; refillPerSecond: number; now: () => number }): {
  tryRemove(tokens?: number): boolean;
  available(): number;
}
export function createSlidingWindowCounter(options: { limit: number; windowMs: number; now: () => number }): {
  allow(): boolean;
}
```

**Token bucket.** The bucket starts full (`capacity` tokens) and remembers the time of its last update, initially `now()` at creation. Both methods first refill lazily: add `(now() - last) * refillPerSecond / 1000` tokens, cap the result at `capacity` and set `last = now()`.

- `tryRemove(tokens = 1)` takes `tokens` and returns `true` when at least that many are available; otherwise it takes nothing and returns `false`.
- `available()` returns the current number of tokens (it may be fractional).

**Sliding window counter.** Windows are aligned to multiples of `windowMs`: the current window starts at `Math.floor(now() / windowMs) * windowMs`. The limiter keeps the count of accepted requests in the current window and in the previous one; it starts in the window of `now()` at creation with both counts at `0`. On each `allow()`:

1. If a new window has started, the old current count becomes the previous count when the old window is the one right before the new one; if at least one whole window passed with no calls, the previous count is `0`. The current count starts again at `0`.
2. Compute `estimate = previous * (windowMs - elapsed) / windowMs + current`, where `elapsed = now() - currentWindowStart`.
3. If `estimate < limit`, count the request in the current window and return `true`. Otherwise return `false`; rejected requests are not counted.
