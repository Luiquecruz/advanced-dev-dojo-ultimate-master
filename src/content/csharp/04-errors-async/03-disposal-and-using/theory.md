# Disposal and using

After this lesson you can release connections, streams, transactions and other resources deterministically with `using` and `await using`, implement `IDisposable` and `IAsyncDisposable` for a class that owns resources, and tell which objects you must dispose and which ones the dependency injection container disposes for you.

You need: 04/01 (exceptions and `finally`), 04/02 (`async`, `await` and `ValueTask`), 02/03 (interfaces and `sealed` classes) and 00/06 (classes and constructors).

## Why disposal exists

Memory in .NET is reclaimed by the **garbage collector**, which runs when it decides to, not when a variable goes out of scope. That is fine for memory, but some objects also hold a resource the operating system or a pool hands out in limited numbers: an open file, a network socket, a database connection.

A backend is a long-running process, so nothing ends and cleans up after each piece of work. A connection you do not release stays checked out of the pool until the garbage collector happens to notice the object, if it ever does. Under load that is how an API runs out of database connections or sockets while CPU and memory look normal. The rule: **anything that holds an operating-system or pooled resource implements `IDisposable`, and whoever creates it must dispose it.**

## `IDisposable` and the `using` statement

`IDisposable` has one method, `Dispose()`, which releases the resource now. The `using` statement calls it for you when control leaves the block, even when an exception is thrown or a `return` runs inside it; the compiler rewrites it into `try`/`finally`.

```csharp
var lines = new List<string>();
using (StreamReader reader = File.OpenText("products.csv"))
{
    string? line;
    while ((line = reader.ReadLine()) is not null)
    {
        lines.Add(line);
    }
} // reader.Dispose() runs here, exception or not
```

The `using` declaration drops the braces and disposes at the end of the enclosing scope, usually the method:

```csharp
static int CountProducts(string path)
{
    using StreamReader reader = File.OpenText(path);
    int count = 0;
    while (reader.ReadLine() is not null)
    {
        count++;
    }
    return count;
} // disposed here
```

Variables declared by `using` are read-only. When several are declared in one scope, they are disposed in reverse order of declaration, which is what you want when a command depends on a connection.

## `IAsyncDisposable` and `await using`

Some cleanup needs I/O: flushing a buffered stream, rolling back a transaction, closing a network connection politely. Those types implement `IAsyncDisposable`, whose `DisposeAsync()` returns a `ValueTask`. Consume them with `await using` so the thread is not blocked during cleanup. Here `db` is a `DbContext`, EF Core's database session (07/02):

```csharp
public async Task MoveStockAsync(CatalogDbContext db, CancellationToken cancellationToken)
{
    await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);
    // ...
    await transaction.CommitAsync(cancellationToken);
} // DisposeAsync is awaited here
```

The two `await` keywords on the first line do different jobs: one awaits `BeginTransactionAsync`, the other awaits `DisposeAsync` at the end of the scope. Transactions themselves are covered in module 07, lesson 06.

A plain `using` on a type that implements only `IAsyncDisposable` does not compile; the compiler asks for `await using`. The real risk is elsewhere: Microsoft warns that if such a class is handed to a consumer that only calls `Dispose` (code that only knows `IDisposable`), `DisposeAsync` never runs and resources leak. Types that may be disposed both ways implement both interfaces.

## Writing a disposable class

If your class creates or is handed a disposable object and keeps it in a field as its own, your class owns it and must be disposable too. For a `sealed` class that only wraps managed objects, the implementation is short:

```csharp
public sealed class AuditLog : IDisposable, IAsyncDisposable
{
    private readonly StreamWriter _writer;
    private bool _disposed;

    public AuditLog(string path) => _writer = new StreamWriter(path, append: true);

    public void Write(string entry)
    {
        ObjectDisposedException.ThrowIf(_disposed, this);
        _writer.WriteLine(entry);
    }

    public void Dispose()
    {
        if (_disposed) return;
        _disposed = true;
        _writer.Dispose();
    }

    public async ValueTask DisposeAsync()
    {
        if (_disposed) return;
        _disposed = true;
        await _writer.DisposeAsync();
    }
}
```

`Dispose` must be idempotent: calling it twice must not throw or release twice, hence the flag. A method called after disposal throws `ObjectDisposedException`; the `ThrowIf` helper does that in one line. A non-sealed base class follows the full pattern from the docs: a public `Dispose()` that calls `protected virtual Dispose(bool disposing)` and `GC.SuppressFinalize(this)`, plus `protected virtual ValueTask DisposeAsyncCore()` for async cleanup.

You almost never write a finalizer. A finalizer is only needed when your class holds a raw unmanaged handle, and even then Microsoft recommends wrapping the handle in a `SafeHandle`, which already has one.

## Who disposes what

Ownership decides. You dispose what you create with `new` (or get from a factory method such as `File.OpenText`). You do **not** dispose what the dependency injection container gave you (module 05, lesson 02): the container disposes the `IDisposable` and `IAsyncDisposable` services it created at the end of their lifetime, so a `DbContext` used by one request is disposed when that request ends. Disposing an injected service yourself breaks the next consumer in the same request with `ObjectDisposedException`. An instance you create and register yourself (`AddSingleton(new Foo())`) is not disposed by the container.

Two classic exceptions to "dispose everything":

- `HttpClient`, the class that sends HTTP requests, implements `IDisposable` but is designed for reuse. Creating and disposing one per call leaves sockets in `TIME_WAIT` and can exhaust them; get clients from `IHttpClientFactory` instead (module 10, lesson 05).
- `CancellationTokenSource` is disposable and easy to forget; the next lesson creates one per timeout, and each needs a `using`.

## Common mistakes

- **Disposing at the end of the method instead of with `using`.** A `Dispose()` call on the last line never runs when an earlier line throws, so the file or connection stays open. Use a `using` declaration or `await using`.
- **Using an object after disposing it.** `using (reader) { ... }` on an existing variable leaves a disposed object in scope, and a later read throws `ObjectDisposedException`. Declare the variable in the `using` itself.
- **Disposing what you do not own.** Calling `Dispose` on an injected `DbContext` breaks every other service in the same request. Let the container dispose its services.
- **A `Dispose` that is not idempotent.** A second call releases twice or throws. Keep a disposed flag.

## In practice

- **Default to `using` declarations** for local resources, and `await using` whenever the type is `IAsyncDisposable` and you are in an `async` method.
- **Let DI own service lifetimes.** Register the type, inject it, never call `Dispose` on it. Background work that needs a `DbContext` creates its own scope with `IServiceScopeFactory.CreateAsyncScope()` and disposes that scope (module 10).
- **Code analysis helps:** rule CA2000 ("Dispose objects before losing scope") flags local disposables that are never disposed. It is not enabled by default in .NET 10, so turn it on in `.editorconfig` if your team keeps leaking them.
- **Open connections by hand only with `using`:** a `Microsoft.Data.SqlClient.SqlConnection` you open yourself is yours to dispose (the older `System.Data.SqlClient` package is deprecated).

## Check yourself

1. Why does a forgotten `using` around a database connection hurt a long-running API even though the garbage collector exists?
2. A class creates a `StreamWriter` in its constructor and keeps it in a field. What must the class implement, and why?
3. Your service receives `CatalogDbContext` through its constructor. Should it dispose the context? Who does?
4. When does `await using` matter more than `using`?
