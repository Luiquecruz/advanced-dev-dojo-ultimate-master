Implement two rate limiters. Neither one uses timers: time comes from the injected `now()` (milliseconds), read on every call, so the tests can move the clock.

```csharp
public class TokenBucket
{
    public TokenBucket(double capacity, double refillPerSecond, Func<long> now);
    public bool TryRemove(double tokens = 1);
    public double Available();
}

public class SlidingWindowCounter
{
    public SlidingWindowCounter(int limit, long windowMs, Func<long> now);
    public bool Allow();
}
```

The tests pass the constructor arguments by name: `new TokenBucket(capacity: 5, refillPerSecond: 1, now: () => clock)`.

**Token bucket.** The bucket starts full (`capacity` tokens) and remembers the time of its last update, initially `now()` at creation. Both methods first refill lazily: add `(now() - last) * refillPerSecond / 1000` tokens, cap the result at `capacity` and set `last = now()`.

- `TryRemove(tokens = 1)` takes `tokens` and returns `true` when at least that many are available; otherwise it takes nothing and returns `false`.
- `Available()` returns the current number of tokens (it may be fractional).

**Sliding window counter.** Windows are aligned to multiples of `windowMs`: the current window starts at `(long)Math.Floor((double)now() / windowMs) * windowMs`. The limiter keeps the count of accepted requests in the current window and in the previous one; it starts in the window of `now()` at creation with both counts at `0`. On each `Allow()`:

1. If a new window has started, the old current count becomes the previous count when the old window is the one right before the new one; if at least one whole window passed with no calls, the previous count is `0`. The current count starts again at `0`.
2. Compute `estimate = (double)previous * (windowMs - elapsed) / windowMs + current`, where `elapsed = now() - currentWindowStart`.
3. If `estimate < limit`, count the request in the current window and return `true`. Otherwise return `false`; rejected requests are not counted.
