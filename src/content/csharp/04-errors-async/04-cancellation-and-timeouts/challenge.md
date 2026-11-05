Finish two helpers in `Program.cs` that take part in cooperative cancellation.

## `Reindexer.RunAsync(productIds, indexOne, cancellationToken)`

Calls `await indexOne(id, token)` for every id, in order, and returns how many products it indexed.

- Every call receives the **caller's token**, `cancellationToken` itself, not `CancellationToken.None` or `default`.
- Before each product, check the token: once the caller has cancelled, stop by throwing `OperationCanceledException` (`ThrowIfCancellationRequested`), without starting the next product.

## `Deadline.WithTimeoutAsync(operation, timeout, cancellationToken)`

Runs `operation(token)` with a time limit of its own and returns its result.

- Create a token source **linked** to `cancellationToken`, call `CancelAfter(timeout)` on it, and pass its token to the operation, so either the caller or the deadline can stop the work. Dispose the source.
- When the **deadline** fires (the operation throws `OperationCanceledException` and the caller has not cancelled), throw `TimeoutException` with the `OperationCanceledException` as its inner exception. The operation's token must really be cancelled, so do not use `Task.WaitAsync`.
- When the **caller** cancels, let the `OperationCanceledException` through unchanged: that is not a timeout.

`System.Threading` is already imported at the top of the file.
