Build a circuit breaker that stops calling a broken dependency and checks its recovery with a single trial, plus the full-jitter backoff that spaces out retries. Time and randomness are injected, so the tests control the clock and the random numbers.

```python
class CircuitBreaker:
    def __init__(self, *, failure_threshold: int, open_ms: float, now: Callable[[], float]): ...
    async def call(self, fn: Callable[[], Awaitable]): ...  # fn: an async function without arguments
    def state(self) -> str: ...                              # "closed", "open" or "half-open"

def backoff_delay(attempt: int, *, base_ms: float, cap_ms: float, random: Callable[[], float]) -> int: ...
```

**`CircuitBreaker(failure_threshold=..., open_ms=..., now=...)`** starts **closed**. `call` receives the function, not a coroutine (`await breaker.call(fetch_profile)`), so it can decide not to call it at all.

- **closed**: `call(fn)` runs `await fn()` and returns its result, or raises the exception `fn` raised. It counts **consecutive** failures: a success resets the count to zero. When the count reaches `failure_threshold`, the circuit opens at `now()`.
- **open**: `call(fn)` raises `RuntimeError("circuit open")` (message exactly `circuit open`) **without calling `fn`**. Once `open_ms` milliseconds have passed since the circuit opened (`now() - opened_at >= open_ms`), the circuit is half-open.
- **half-open**: the next `call(fn)` is the **one trial** and runs `fn`. While that trial is still running, any other call raises `RuntimeError("circuit open")` without calling its `fn`. A successful trial closes the circuit (failure count back to zero) and returns its result; a failed trial raises its exception and opens the circuit again at `now()`, for another `open_ms`.
- `state()` returns `"closed"`, `"open"` or `"half-open"` and follows the clock: it reports `"half-open"` as soon as `open_ms` has passed, even before the next call.

**`backoff_delay(attempt, base_ms=..., cap_ms=..., random=...)`** returns the full-jitter delay for a retry, with `attempt` starting at `0`:

```python
math.floor(random() * min(cap_ms, base_ms * 2**attempt))
```

With `base_ms=100`, `cap_ms=2_000` and `random()` close to `1`, attempts `0` to `5` give `99, 199, 399, 799, 1_599, 1_999`.
