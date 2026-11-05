# Exceptions and Results

After this lesson you can throw the right exception type, catch only what you can handle, filter with `when`, rethrow without losing the stack trace, and decide when an expected failure should be a return value (a result type or a `Try*` method) instead of an exception.

## Coming from PHP/Magento

A lot transfers. PHP has `try`/`catch`/`finally`, exception hierarchies and, since PHP 8, `throw` as an expression. Magento code throws `LocalizedException` or `NoSuchEntityException` from a repository and lets the controller turn it into a message. C# works the same way: every exception derives from `System.Exception`, and `catch` clauses match by type.

The trap is the lifetime of the process. In PHP-FPM an uncaught exception ends one request and the worker starts the next request fresh. An ASP.NET Core app is one long-running process that serves every request. The framework still turns an unhandled exception in a request into a 500 response, but a `catch` that swallows an error and leaves a singleton or a static cache half-updated corrupts state for every request after it, until the process restarts. "Catch, log and continue" is far more dangerous here than in PHP.

The second trap is cost. Microsoft's ASP.NET Core best practices say throwing and catching is slow relative to other control flow and must not be used for normal program flow, especially in hot code paths. A Magento habit such as "throw `NoSuchEntityException` and catch it to mean 'not found'" in a loop is a performance bug in .NET.

## Throwing: pick an existing type first

Use a predefined exception when one fits: `ArgumentException` (and its subclasses) for bad arguments, `InvalidOperationException` when the object's state does not allow the call. Prefer the static throw helpers, which Microsoft recommends over constructing the exception yourself:

```csharp
public Order AddLine(string sku, int quantity)
{
    ArgumentException.ThrowIfNullOrWhiteSpace(sku);
    ArgumentOutOfRangeException.ThrowIfNegativeOrZero(quantity);

    if (Status != OrderStatus.Draft)
    {
        throw new InvalidOperationException($"Order {Id} is {Status}; only draft orders accept lines.");
    }
    // ...
    return this;
}
```

Never throw `Exception`, `SystemException`, `NullReferenceException` or `IndexOutOfRangeException` yourself. Create a custom type only when callers need to catch it specifically or read extra data. Name it with an `Exception` suffix, give it the three usual constructors, and add properties only when code will read them:

```csharp
public class OutOfStockException : Exception
{
    public OutOfStockException() { }
    public OutOfStockException(string message) : base(message) { }
    public OutOfStockException(string message, Exception inner) : base(message, inner) { }

    public string? Sku { get; init; }
}

// throw new OutOfStockException($"SKU {sku} is out of stock.") { Sku = sku };
```

`Message` is for developers and logs. Keep secrets and personal data out of it.

## Catching: narrow, filtered, rethrown correctly

The runtime checks `catch` clauses top to bottom, so order them from the most derived type to the least derived. Catch only what you can recover from; let the rest travel up to the framework's error handling.

An exception filter (`when`) decides whether a clause handles the exception. The filter runs before the stack is unwound, so when it returns `false` the exception continues with its original stack trace intact:

```csharp
// ... inside an async method; StockUnavailableException is a custom type
try
{
    await stockClient.ReserveAsync(sku, quantity, cancellationToken);
}
catch (HttpRequestException ex) when (ex.StatusCode == HttpStatusCode.ServiceUnavailable)
{
    logger.LogWarning(ex, "Stock service unavailable while reserving {Sku}", sku);
    throw new StockUnavailableException("The stock service is unavailable.", ex);
}
catch (Exception ex) when (ex is not OperationCanceledException)
{
    logger.LogError(ex, "Reservation failed for {Sku}", sku);
    throw;
}
```

Two rules hide in that snippet. `throw;` rethrows the caught exception and keeps its stack trace; `throw ex;` restarts the trace at the current method (code analysis rule CA2200 flags it). Wrapping in a new exception is fine when you pass the original as `innerException`. And cancellation is not a failure: excluding `OperationCanceledException` keeps a client disconnect from being logged as an error. Catch `OperationCanceledException` rather than its subclass `TaskCanceledException`.

`finally` runs whether the block completes, returns or throws. For anything that implements `IDisposable`, prefer `using` (lesson 03); the compiler turns it into `try`/`finally` for you.

## Results: when failure is expected

Exceptions are for the unexpected: a database that went away, a bug, a broken invariant. When failure is a normal outcome the caller must handle, such as "SKU not found" or "not enough stock", make it part of the return type.

The .NET libraries already do this with the `Try*` pattern: `int.TryParse(text, out var quantity)` and `Dictionary.TryGetValue` return `bool` instead of throwing. Returning `null` (with nullable reference types enabled) is the simplest form for "not found".

When there are several outcomes, a small result hierarchy makes every case visible to the caller. The base class library has no general `Result<T>` type, so teams write their own or use a package:

```csharp
public abstract record ReserveResult
{
    public sealed record Reserved(Guid ReservationId) : ReserveResult;
    public sealed record OutOfStock(string Sku, int Available) : ReserveResult;
}

// In a minimal API endpoint:
ReserveResult result = await reservations.TryReserveAsync(sku, quantity, cancellationToken);

return result switch
{
    ReserveResult.Reserved reserved => Results.Ok(reserved),
    ReserveResult.OutOfStock outOfStock => Results.Conflict(outOfStock),
    _ => throw new UnreachableException()
};
```

The `switch` expression forces the endpoint to decide what each outcome means in HTTP. The compiler cannot yet prove the hierarchy is closed, hence the discard arm with `UnreachableException`.

## In practice

- **Decide by frequency.** If the condition happens routinely (validation, lookups, business rules), return it. If it signals something broken, throw it. Microsoft's guidance uses the same test: exceptions for events that do not occur often.
- **Validate arguments with the throw helpers** at public entry points, and let a single global handler turn unhandled exceptions into Problem Details responses (module 06, lesson 03). Do not wrap every controller action in `try`/`catch`.
- **Do not catch `Exception` to log and continue** in shared code. Log once, at the boundary that handles the error, or you get the same failure five times in the logs.
- **Callers expect no side effects** when a method throws. If you have done half the work, undo it before rethrowing, or use a transaction.
- **Usual mistakes:** `throw ex;`, empty `catch { }` blocks, using exceptions for "not found" in a loop, treating `OperationCanceledException` as an error, and exception messages that leak connection strings or customer data.

## Status as of 2026-11-05

- C# 14 on .NET 10 (LTS) is the baseline. C# 15 (.NET 11, SDK still prerelease) adds union types and closed hierarchies, which make an exhaustive `switch` over a result type possible without the discard arm. Treat them as "coming", not as the default.
- The throw helpers on `ArgumentOutOfRangeException` (`ThrowIfNegativeOrZero` and others) are listed on Microsoft's exception best-practices page, updated 2026-03-30.

## Check yourself

1. A repository method is called 10,000 times in an import job and often finds no row. Should "not found" be an exception or a return value, and why?
2. What is the observable difference in the logs between `throw;` and `throw ex;`?
3. Why does `catch (Exception ex) when (ex is not OperationCanceledException)` matter in a web API?
4. In PHP-FPM a swallowed exception affects one request. What can it affect in ASP.NET Core?
