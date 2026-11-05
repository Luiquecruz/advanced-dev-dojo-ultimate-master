Keep the duplicate check at the top, and move `processed.Add(...)` so it runs only after `await handle(...)` returns. The first test passes either way; the resubmission test is the one that notices the order.
---
Wrap the handler call in a loop: `for (int attempt = 1; ; attempt++) { try { ...; return Outcome.Processed; } catch ... }`. Catch `PoisonMessageException` first and dead-letter at once. Then `catch (Exception exception) when (exception is not OperationCanceledException)`: the filter lets cancellation pass through untouched.
---
In the general `catch`, dead-letter when `attempt >= maxAttempts`; otherwise fall out of the `catch`, `await delay(wait, cancellationToken);` and double `wait` for the next round. Starting `wait` at `firstDelay` gives 1 s, 2 s, 4 s, and the last attempt has no wait after it.
