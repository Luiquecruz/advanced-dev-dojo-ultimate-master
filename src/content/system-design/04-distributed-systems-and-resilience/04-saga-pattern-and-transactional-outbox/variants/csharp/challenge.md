Build the two pieces that keep a multi-service order consistent without a distributed transaction: an orchestrated saga that undoes completed steps when a later one fails, and a handler that makes retried requests safe with an idempotency key.

```csharp
public record SagaStep<TContext>(string Name, Func<TContext, Task> Action, Func<TContext, Task> Compensate);

public record SagaResult(
    string Status,                              // "completed" or "compensated"
    IReadOnlyList<string> Completed,
    IReadOnlyList<string> Compensated,
    IReadOnlyList<string> FailedCompensations,
    string? FailedStep = null);

public static class Saga
{
    public static Task<SagaResult> RunSagaAsync<TContext>(IEnumerable<SagaStep<TContext>> steps, TContext context);
}

public class IdempotentHandler<TRequest, TResponse>
{
    public IdempotentHandler(Func<TRequest, Task<TResponse>> handler);
    public Task<TResponse> HandleAsync(string key, TRequest request);
}
```

A step's `Action` fails when it throws or when the task it returns fails; `Compensate` undoes a completed action and fails the same two ways.

**`Saga.RunSagaAsync(steps, context)`** awaits each step's `Action(context)` in order, passing the same `context` to every call.

- When every action succeeds: `Status` is `"completed"`, `Completed` lists every step name in order, `Compensated` and `FailedCompensations` are empty and `FailedStep` is `null`.
- When an action fails, the saga stops: later actions never run and the failed step is **not** compensated (its local transaction rolled back on its own). Then it awaits `Compensate(context)` of every completed step **in reverse order**. The result has `Status` `"compensated"`, `FailedStep` (the name of the step that failed), `Completed` (the steps whose action succeeded, in order) and `Compensated` (the steps whose compensation succeeded, in the order they ran).
- A compensation that fails does not stop the others: its step name goes to `FailedCompensations` and the remaining compensations still run.

**`new IdempotentHandler<TRequest, TResponse>(handler)`** wraps `handler`, and `HandleAsync(key, request)` returns a task:

- The first call with a key runs `handler(request)` and stores its result under the key. Any later call with the same key returns the stored result without calling `handler` again.
- A call with the same key while the first one is still running shares that execution: `handler` runs once and both calls complete with the same result.
- When `handler` fails, the call fails with that exception and nothing is stored, so the next call with that key runs `handler` again.

A production server would also reject a key reused with a different request and expire old keys; this model leaves both out.
