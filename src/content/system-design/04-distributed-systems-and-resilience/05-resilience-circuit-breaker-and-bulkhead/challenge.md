Build a circuit breaker that stops calling a broken dependency and checks its recovery with a single trial, plus the full-jitter backoff that spaces out retries. Time and randomness are injected, so the tests control the clock and the random numbers.

```ts
type CircuitState = 'closed' | 'open' | 'half-open';

export function createCircuitBreaker(options: { failureThreshold: number; openMs: number; now: () => number }): {
  call<T>(fn: () => Promise<T>): Promise<T>;
  state(): CircuitState;
}

export function backoffDelay(attempt: number, options: { baseMs: number; capMs: number; random: () => number }): number
```

**`createCircuitBreaker`** starts **closed**.

- **closed**: `call(fn)` runs `fn` and resolves with its result, or rejects with the error `fn` rejected with. It counts **consecutive** failures: a success resets the count to zero. When the count reaches `failureThreshold`, the circuit opens at `now()`.
- **open**: `call(fn)` rejects with `new Error('circuit open')` (message exactly `circuit open`) **without calling `fn`**. Once `openMs` milliseconds have passed since the circuit opened (`now() - openedAt >= openMs`), the circuit is half-open.
- **half-open**: the next `call(fn)` is the **one trial** and runs `fn`. While that trial is still running, any other call rejects with `circuit open` without calling its `fn`. A successful trial closes the circuit (failure count back to zero) and resolves with its result; a failed trial rejects with its error and opens the circuit again at `now()`, for another `openMs`.
- `state()` returns `'closed'`, `'open'` or `'half-open'` and follows the clock: it reports `'half-open'` as soon as `openMs` has passed, even before the next call.

**`backoffDelay(attempt, { baseMs, capMs, random })`** returns the full-jitter delay for a retry, with `attempt` starting at `0`:

```ts
Math.floor(random() * Math.min(capMs, baseMs * 2 ** attempt))
```

With `baseMs: 100`, `capMs: 2_000` and `random()` close to `1`, attempts `0` to `5` give `99, 199, 399, 799, 1_599, 1_999`.
