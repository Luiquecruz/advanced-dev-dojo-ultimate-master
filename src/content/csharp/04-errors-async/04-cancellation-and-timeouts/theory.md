# Cancellation and Timeouts

After this lesson you can pass a `CancellationToken` from an endpoint down to the database and HTTP calls, create your own tokens with a deadline, combine tokens, and choose the right timeout layer: per call, per outgoing HTTP client, or per incoming request.

You need: 04/01 (exception filters with `when`), 04/02 (`async` and `await`), 04/03 (`using` and `IDisposable`) and 02/04 (`Func<T, TResult>` and lambdas).

## Why cancellation is explicit

Work often stops being useful before it finishes: the user closes the browser tab, a deadline passes, the application shuts down. .NET never kills running code for you. Cancellation is a cooperative contract: the code that wants the work stopped sends a signal, and the code doing the work checks that signal and stops itself.

Nothing forces you to take part. A method that ignores its token compiles and works in development, but when a client disconnects, the work keeps running: queries finish for nobody, outgoing calls pile up, and a long-running server carries the load. Passing the token through every layer is what makes "the user gave up" actually stop the work.

## The model: source, token, listener

Cancellation has two halves. A `CancellationTokenSource` is the object that can request cancellation. Its `Token` property is a lightweight `CancellationToken` struct you pass to anything that should stop when asked. Only the source can cancel; listeners can only observe. A token cannot be reset, so one token represents one operation.

Every async .NET API that accepts a token (EF Core's `ToListAsync`, `HttpClient.GetAsync`, `Task.Delay`, `Stream.ReadAsync`) checks it and throws `OperationCanceledException` when it is cancelled. In your own loops, call `ThrowIfCancellationRequested()`:

```csharp
public async Task<int> ReindexAsync(IReadOnlyList<int> productIds, CancellationToken cancellationToken)
{
    int done = 0;
    foreach (int id in productIds)
    {
        cancellationToken.ThrowIfCancellationRequested();
        await indexer.IndexProductAsync(id, cancellationToken);
        done++;
    }
    return done;
}
```

The parameter conventionally comes last, is named `cancellationToken`, and is passed to every awaitable call inside. Library code often gives it a default (`CancellationToken cancellationToken = default`) so callers that cannot cancel pass nothing; `CancellationToken.None` is that "never cancelled" token.

## Where tokens come from in ASP.NET Core

You rarely create the first token. In a web endpoint (module 05 and module 06), a `CancellationToken` parameter is bound automatically to `HttpContext.RequestAborted`, which is cancelled when the client disconnects:

```csharp
app.MapGet("/orders/{customerId:int}", async (int customerId, OrderStore store, CancellationToken cancellationToken) =>
    Results.Ok(await store.ListForCustomerAsync(customerId, cancellationToken)));
```

From there, the job is plumbing: every service method takes the token and hands it on. In a background worker (module 10), the `stoppingToken` passed to `ExecuteAsync` plays the same role for application shutdown.

## Deadlines you create yourself

To put a time limit on an operation, create a source with a delay and dispose it when done; `CancellationTokenSource` is `IDisposable`. When you also have a caller's token, link the two so either one cancels the work:

```csharp
public async Task<Quote> GetShippingQuoteAsync(Cart cart, CancellationToken cancellationToken)
{
    using var timeout = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
    timeout.CancelAfter(TimeSpan.FromSeconds(3));

    try
    {
        return await carrierClient.QuoteAsync(cart, timeout.Token);
    }
    catch (OperationCanceledException) when (timeout.IsCancellationRequested && !cancellationToken.IsCancellationRequested)
    {
        // Our 3-second deadline fired, not the caller: fall back to a flat rate.
        return Quote.FlatRate(cart);
    }
}
```

The exception filter tells the causes apart: if your source is cancelled and the caller's token is not, the deadline fired. A cancellation from anywhere else, such as the client's own shorter timeout, is not yours to rename. If the client disconnected, the exception propagates, which is what the caller expects. Instead of a fallback, a method can also turn its own deadline into `throw new TimeoutException("...", ex)`, so callers can tell "too slow" from "cancelled". `CancelAfter` restarts the countdown if called again before it fires.

`Task.WaitAsync(TimeSpan)` is a different tool: it stops *waiting* after the timeout and throws `TimeoutException`, but the underlying operation is not cancelled and keeps running. Use it only around APIs that take no token.

## Timeout layers

Three layers usually exist in a backend, and they should be set deliberately:

- **Outgoing HTTP.** `HttpClient`, the class that sends HTTP requests (module 10, lesson 05), has a `Timeout` that defaults to 100 seconds for every request on that client. On .NET 5 and later a timeout surfaces as an `OperationCanceledException` whose inner exception is a `TimeoutException`. The `Microsoft.Extensions.Http.Resilience` package's `AddStandardResilienceHandler()` adds a pipeline whose defaults include a rate limiter of 1,000 concurrent requests, a 30-second total timeout, three retries with exponential backoff, a circuit breaker and a 10-second timeout per attempt. When both a client timeout and a token deadline apply, the shorter one wins.
- **Incoming requests.** ASP.NET Core applies no request timeout by default. The request timeouts middleware (`AddRequestTimeouts` + `UseRequestTimeouts`, then `WithRequestTimeout` or `[RequestTimeout]` per endpoint, or a default policy) cancels `HttpContext.RequestAborted` when the limit is hit; if the app does not produce a response, the default is a 504. It does not trigger with a debugger attached, so test timeouts without one.
- **Database.** Pass the token to EF Core or ADO.NET calls so a cancelled request also cancels the query; providers have their own command timeout setting as a backstop.

```csharp
builder.Services.AddRequestTimeouts(options =>
    options.DefaultPolicy = new RequestTimeoutPolicy { Timeout = TimeSpan.FromSeconds(10) });
// ...
app.UseRequestTimeouts();
app.MapGet("/reports/sales", BuildSalesReportAsync).WithRequestTimeout(TimeSpan.FromSeconds(30));
```

## Common mistakes

- **Accepting a token and not forwarding it.** An endpoint that takes a token but calls `ToListAsync()` without it cancels nothing: the query runs to the end after the client is gone. Pass the token to every call that accepts one.
- **Mistaking `WaitAsync` for cancellation.** It throws `TimeoutException`, but the operation keeps running in the background. Give the operation a linked token with `CancelAfter`.
- **Logging cancellation as an error.** A client disconnect becomes an "Unexpected failure" alert. Catch `OperationCanceledException` only where you can act, and log it quietly.
- **Forgetting to dispose a `CancellationTokenSource`.** It holds resources until it is disposed: the timer behind `CancelAfter`, and for a linked source its registration on the caller's token. Created per call, the leftovers pile up. Create it with `using`.

## In practice

- **Accept and forward the token everywhere** on an async path, down to the last call.
- **Treat cancellation as an outcome, not an error.** Catch `OperationCanceledException` (not its subclass `TaskCanceledException`) so every kind of cancellation is handled.
- **Order the deadlines.** A per-attempt timeout shorter than the total timeout, shorter than the incoming request timeout, keeps retries meaningful.
- **Do not cancel half-finished writes blindly.** Before the point of no return (a payment captured, a message published), consider passing `CancellationToken.None` so the operation completes consistently. Do not retry non-idempotent `POST` calls automatically.

## Status as of 2026-11-05

- Request timeouts middleware: documented for ASP.NET Core 8.0 and later (`aspnetcore-10.0` view, updated 2026-11-03).
- Standard resilience handler defaults (1,000-permit rate limiter, 30 s total, 3 retries, 10 s per attempt): Microsoft's HTTP resilience page dated 2026-02-24.

## Check yourself

1. A client closes the browser tab during a slow report. Trace what happens if every layer forwards the token, and what happens if the repository drops it.
2. Why is `using` required on a `CancellationTokenSource` you create per call?
3. How does the exception filter in `GetShippingQuoteAsync` distinguish a deadline from a disconnect?
4. Which timeout fires first: an `HttpClient.Timeout` of 100 seconds or a linked token with `CancelAfter(3 s)`?
