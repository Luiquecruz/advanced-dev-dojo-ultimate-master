# Disposal and using

After this lesson you can release connections, streams, transactions and other resources deterministically with `using` and `await using`, implement `IDisposable` and `IAsyncDisposable` for a class that owns resources, and tell which objects you must dispose and which ones the dependency injection container disposes for you.

## Coming from PHP/Magento

In PHP you rarely think about this. Reference counting runs `__destruct` as soon as the last reference goes away, and at the end of every request PHP-FPM frees everything the request allocated: file handles, sockets, PDO connections. A Magento developer who forgets to close a file is rescued a few milliseconds later by the end of the request.

.NET has neither safety net. Memory is reclaimed by a garbage collector that runs when it decides to, not when a variable goes out of scope, and the process never "ends the request". A connection you do not dispose stays checked out of the pool until the garbage collector happens to notice the object, if it ever does. Under load that is how a .NET API runs out of database connections or sockets while CPU and memory look normal. The rule to internalize: **anything that holds an operating-system or pooled resource implements `IDisposable`, and whoever creates it must dispose it.**

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

Some cleanup needs I/O: flushing a buffered stream, committing or rolling back a transaction, closing a network connection politely. Those types implement `IAsyncDisposable`, whose `DisposeAsync()` returns a `ValueTask`. Consume them with `await using` so the thread is not blocked during cleanup:

```csharp
public async Task MoveStockAsync(CatalogDbContext db, CancellationToken cancellationToken)
{
    await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);
    // ...
    await transaction.CommitAsync(cancellationToken);
} // DisposeAsync is awaited here
```

The two `await` keywords on the first line do different jobs: one awaits `BeginTransactionAsync`, the other awaits `DisposeAsync` at the end of the scope. Transactions themselves (commit, rollback, isolation) are covered in module 07, lesson 06.

A plain `using` on a type that implements only `IAsyncDisposable` does not compile; the compiler asks for `await using`. The real risk is elsewhere: Microsoft warns that if such a class is handed to a consumer that only calls `Dispose` (code that only knows `IDisposable`), `DisposeAsync` never runs and resources leak. Types that may be disposed both ways implement both interfaces.

## Writing a disposable class

If your class creates and stores a disposable object, your class owns it and must be disposable too. For a `sealed` class that only wraps managed objects, the implementation is short:

```csharp
public sealed class CsvExporter : IAsyncDisposable
{
    private readonly StreamWriter _writer;

    public CsvExporter(string path) => _writer = new StreamWriter(path);

    public Task WriteRowAsync(string row) => _writer.WriteLineAsync(row);

    public ValueTask DisposeAsync() => _writer.DisposeAsync();
}

// await using var exporter = new CsvExporter("export.csv");
```

A non-sealed base class follows the full pattern from the docs: a public `Dispose()` that calls `protected virtual Dispose(bool disposing)` and `GC.SuppressFinalize(this)`, plus `protected virtual ValueTask DisposeAsyncCore()` for async cleanup. `Dispose` must be idempotent: calling it twice must not throw.

You almost never write a finalizer. A finalizer is only needed when your class holds a raw unmanaged handle, and even then Microsoft recommends wrapping the handle in a `SafeHandle`, which already has one.

## Who disposes what

Ownership decides. You dispose what you create with `new` (or get from a factory method such as `File.OpenText`). You do **not** dispose what the container injected into you: the DI container disposes the `IDisposable` and `IAsyncDisposable` services it created at the end of their lifetime, so a scoped `DbContext` is disposed when the request scope ends. Disposing an injected service yourself breaks the next consumer in the same scope with `ObjectDisposedException`. An instance you create and register yourself (`AddSingleton(new Foo())`) is not disposed by the container.

Two classic exceptions to "dispose everything":

- `HttpClient` implements `IDisposable` but is designed for reuse. Creating and disposing one per call leaves sockets in `TIME_WAIT` and can exhaust them; get clients from `IHttpClientFactory` instead (module 10, lesson 05).
- `CancellationTokenSource` is disposable and easy to forget; the next lesson creates one per timeout, and each needs a `using`.

## In practice

- **Default to `using` declarations** for local resources, and `await using` whenever the type is `IAsyncDisposable` and you are in an `async` method.
- **Let DI own service lifetimes.** Register the type, inject it, never call `Dispose` on it. Background work that needs a `DbContext` creates its own scope with `IServiceScopeFactory.CreateAsyncScope()` and disposes that scope (module 10).
- **Declare the disposable in the `using` itself.** `using (reader) { ... }` on an existing variable leaves a disposed object in scope, and later use throws `ObjectDisposedException`.
- **Code analysis helps:** rule CA2000 ("Dispose objects before losing scope") flags local disposables that are never disposed. It is not enabled by default in .NET 10, so turn it on in `.editorconfig` if your team keeps leaking them.
- **Usual mistakes:** `new HttpClient()` per request, forgetting `using` on a `Microsoft.Data.SqlClient.SqlConnection` opened by hand (the older `System.Data.SqlClient` package is deprecated), disposing an injected service, and blocking on `Dispose()` of a type that offers `DisposeAsync()`.

## Check yourself

1. Why does a forgotten `using` around a database connection hurt a long-running .NET API more than a forgotten `close()` hurts a PHP-FPM request?
2. A class creates a `StreamWriter` in its constructor and keeps it in a field. What must the class implement, and why?
3. Your controller receives `CatalogDbContext` through its constructor. Should it dispose the context? Who does?
4. When does `await using` matter more than `using`?
