# Exceptions and Results

After this lesson you can throw the right exception type, catch only what you can handle, filter with `when`, rethrow without losing the stack trace, and decide when an expected failure should be a return value (a result type or a `Try*` method) instead of an exception.

You need: 00/07 (`throw`, `try`/`catch`/`finally`, reading a stack trace), 00/04 (`int.TryParse`), 02/03 (records and inheritance) and 02/05 (`switch` expressions and type patterns).

## Why the choice matters on a server

An exception travels up the call stack until a `catch` clause handles it. If nothing does, a console program ends, and a web framework turns the failure into an error response (a 500, module 06). Two facts make the choice between throwing and returning more important in a backend than in a short script.

First, a web API is one long-running process that serves every request (module 05). Objects shared between requests, such as a cache, live as long as the process. A `catch` that swallows an error and leaves that cache half-updated corrupts every later request until the process restarts.

Second, exceptions are expensive. Microsoft's ASP.NET Core best practices say throwing and catching is slow relative to other code flow and must not be used for normal program flow, especially in hot code paths. Using an exception to mean "not found" inside a loop is a performance bug.

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

`ThrowIfNullOrWhiteSpace` throws `ArgumentNullException` for `null` and `ArgumentException` for a blank string; both `ArgumentNullException` and `ArgumentOutOfRangeException` derive from `ArgumentException`.

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

`: base(message)` passes the arguments on to the constructor of `Exception`, which stores them in `Message` and `InnerException`. `Message` is for developers and logs. Keep secrets and personal data out of it.

## Catching: narrow, filtered, rethrown correctly

The runtime checks `catch` clauses top to bottom, so order them from the most derived type to the least derived. Catch only what you can recover from; let the rest travel up to the code that handles errors for the whole program.

An exception filter (`when`) decides whether a clause handles the exception. The filter runs before the stack is unwound, so when it returns `false` the exception continues with its original stack trace intact:

```csharp
// IsTransient is your own check, for example "the file is locked by another process"
try
{
    File.WriteAllText(path, report);
}
catch (IOException ex) when (IsTransient(ex))
{
    retryLater = true;
}
catch (Exception ex)
{
    Console.Error.WriteLine($"Saving {path} failed: {ex.Message}");
    throw;
}
```

`throw;` rethrows the caught exception and keeps its stack trace; `throw ex;` restarts the trace at the current method (code analysis rule CA2200 flags it). Wrapping is fine when you pass the original as `inner`: `throw new ReportException("Saving failed.", ex);` keeps the cause in `InnerException`.

Later in this module you meet `OperationCanceledException`, which means a caller cancelled the work (lesson 04). It is an expected outcome, so a catch-all that logs errors usually excludes it with `when (ex is not OperationCanceledException)`.

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

ReserveResult result = reservations.TryReserve(sku, quantity);

string message = result switch
{
    ReserveResult.Reserved reserved => $"Reservation {reserved.ReservationId} confirmed.",
    ReserveResult.OutOfStock outOfStock => $"Only {outOfStock.Available} of {outOfStock.Sku} left.",
    _ => throw new UnreachableException() // System.Diagnostics
};
```

The `switch` expression forces the caller to decide what each outcome means; in a web API (module 06) each arm becomes a response such as 200 OK or 409 Conflict. The compiler cannot yet prove the hierarchy is closed, hence the discard arm with `UnreachableException`.

## Common mistakes

- **Throwing for a routine outcome.** A lookup that throws `KeyNotFoundException` for every missing SKU, caught in a 10,000-row import, makes the import slow and the logs noisy. Return `null`, a `Try*` result or a result type.
- **`throw ex;` instead of `throw;`.** The stack trace now starts in the rethrowing method, so the line that actually failed is gone from the log. Write `throw;`, or wrap the exception and pass it as `inner`.
- **A catch-all that swallows.** `catch (Exception) { }`, or catch, log and continue, also hides bugs such as `NullReferenceException` and can leave shared state half-updated for every later request. Catch only the types you can handle.

## In practice

- **Decide by frequency.** If the condition happens routinely (validation, lookups, business rules), return it. If it signals something broken, throw it. Microsoft's guidance uses the same test: exceptions for events that do not occur often.
- **Validate arguments with the throw helpers** at public entry points, and let a single global handler turn unhandled exceptions into error responses (module 06, lesson 03). Do not wrap every endpoint in `try`/`catch`.
- **Log once, at the boundary that handles the error**, or you get the same failure five times in the logs.
- **Callers expect no side effects** when a method throws. If you have done half the work, undo it before rethrowing, or use a transaction (module 07).

## Check yourself

1. A lookup method is called 10,000 times in an import job and often finds no row. Should "not found" be an exception or a return value, and why?
2. What is the observable difference in the logs between `throw;` and `throw ex;`?
3. Why can a swallowed exception in a shared cache affect requests that come long after the one that failed?
4. When is wrapping an exception in your own type better than letting the original travel up?
