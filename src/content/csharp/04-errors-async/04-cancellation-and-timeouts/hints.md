In `RunAsync`, the loop body is two lines: `cancellationToken.ThrowIfCancellationRequested();` and `await indexOne(id, cancellationToken);`. Checking first means that a cancel requested during product 2 stops the loop before product 3 starts.
---
Start `WithTimeoutAsync` with `using var timeoutSource = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);` and `timeoutSource.CancelAfter(timeout);`, then `return await operation(timeoutSource.Token);` inside a `try`.
---
Tell the two causes apart with an exception filter on the caller's token: `catch (OperationCanceledException ex) when (!cancellationToken.IsCancellationRequested) { throw new TimeoutException($"...", ex); }`. When the caller cancelled, the filter is false and the exception keeps going.
