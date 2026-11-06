Implement two rate limiters. Neither one uses timers: time comes from the injected `now()` (milliseconds), read on every call, so the tests can move the clock.

```python
class TokenBucket:
    def __init__(self, *, capacity: float, refill_per_second: float, now: Callable[[], float]): ...
    def try_remove(self, tokens: float = 1) -> bool: ...
    def available(self) -> float: ...

class SlidingWindowCounter:
    def __init__(self, *, limit: int, window_ms: float, now: Callable[[], float]): ...
    def allow(self) -> bool: ...
```

Both constructors take keyword arguments only: `TokenBucket(capacity=5, refill_per_second=1, now=clock)`.

**Token bucket.** The bucket starts full (`capacity` tokens) and remembers the time of its last update, initially `now()` at creation. Both methods first refill lazily: add `(now() - last) * refill_per_second / 1000` tokens, cap the result at `capacity` and set `last = now()`.

- `try_remove(tokens=1)` takes `tokens` and returns `True` when at least that many are available; otherwise it takes nothing and returns `False`.
- `available()` returns the current number of tokens (it may be fractional).

**Sliding window counter.** Windows are aligned to multiples of `window_ms`: the current window starts at `math.floor(now() / window_ms) * window_ms`. The limiter keeps the count of accepted requests in the current window and in the previous one; it starts in the window of `now()` at creation with both counts at `0`. On each `allow()`:

1. If a new window has started, the old current count becomes the previous count when the old window is the one right before the new one; if at least one whole window passed with no calls, the previous count is `0`. The current count starts again at `0`.
2. Compute `estimate = previous * (window_ms - elapsed) / window_ms + current`, where `elapsed = now() - current_window_start`.
3. If `estimate < limit`, count the request in the current window and return `True`. Otherwise return `False`; rejected requests are not counted.
