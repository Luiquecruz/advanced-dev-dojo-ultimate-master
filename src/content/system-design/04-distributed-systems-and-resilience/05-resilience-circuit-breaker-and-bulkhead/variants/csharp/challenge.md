Build a circuit breaker that stops calling a broken dependency and checks its recovery with a single trial, plus the full-jitter backoff that spaces out retries. Time and randomness are injected, so the tests control the clock and the random numbers.

```csharp
public class CircuitBreaker
{
    public CircuitBreaker(int failureThreshold, long openMs, Func<long> now);
    public Task<T> CallAsync<T>(Func<Task<T>> operation);
    public string State();  // "closed", "open" or "half-open"
}

public static class Retry
{
    public static long BackoffDelay(int attempt, long baseMs, long capMs, Func<double> random);
}
```

**`new CircuitBreaker(failureThreshold: …, openMs: …, now: …)`** starts **closed**. `CallAsync` receives a function that starts the work (`() => client.GetProfileAsync()`), not a task that is already running, so it can decide not to call it at all.

- **closed**: `CallAsync(operation)` awaits `operation()` and returns its result, or fails with the exception `operation` failed with. It counts **consecutive** failures: a success resets the count to zero. When the count reaches `failureThreshold`, the circuit opens at `now()`.
- **open**: `CallAsync(operation)` fails with an `InvalidOperationException` whose message is exactly `circuit open`, **without calling `operation`**. Once `openMs` milliseconds have passed since the circuit opened (`now() - openedAt >= openMs`), the circuit is half-open.
- **half-open**: the next `CallAsync(operation)` is the **one trial** and runs `operation`. While that trial is still running, any other call fails with `InvalidOperationException("circuit open")` without calling its `operation`. A successful trial closes the circuit (failure count back to zero) and returns its result; a failed trial fails with its exception and opens the circuit again at `now()`, for another `openMs`.
- `State()` returns `"closed"`, `"open"` or `"half-open"` and follows the clock: it reports `"half-open"` as soon as `openMs` has passed, even before the next call.

**`Retry.BackoffDelay(attempt, baseMs, capMs, random)`** returns the full-jitter delay for a retry, with `attempt` starting at `0`:

```csharp
(long)Math.Floor(random() * Math.Min(capMs, baseMs * Math.Pow(2, attempt)))
```

With `baseMs: 100`, `capMs: 2_000` and `random()` close to `1`, attempts `0` to `5` give `99, 199, 399, 799, 1_599, 1_999`.
