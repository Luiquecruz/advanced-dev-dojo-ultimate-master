# async and await

After this lesson you can write correct `async` methods, explain what a `Task` is and when `ValueTask` is worth it, start independent operations concurrently with `Task.WhenAll`, and explain why `.Result` starves the thread pool in ASP.NET Core and deadlocks only where a synchronization context exists.

## Coming from PHP/Magento

In PHP-FPM, blocking is free in a sense: each worker process handles one request, so while `$connection->fetchAll()` waits for MySQL, the worker simply sleeps and other requests go to other workers. Scaling means more workers, each with its own memory. Fibers (PHP 8.1) and libraries such as ReactPHP or Swoole exist, but ordinary Magento code is synchronous top to bottom.

ASP.NET Core inverts this. One process serves all requests with a small, shared **thread pool**. Microsoft's best-practices page puts it plainly: asynchronous APIs let a small pool of threads handle thousands of concurrent requests by not waiting on blocking calls. If a request thread sits waiting for SQL Server, that thread is unavailable to everyone else. The trap is writing .NET the PHP way, synchronously, and finding that the API collapses at a few dozen concurrent requests while CPU usage stays low.

## What `await` really does

An `async` method is rewritten by the compiler into a state machine. When execution reaches `await` on an operation that has not finished, the method returns to its caller, the thread goes back to the pool, and the rest of the method is scheduled as a continuation that runs when the operation completes, usually on another pool thread.

```csharp
app.MapGet("/products/{sku}", async (string sku, CatalogDbContext db, CancellationToken cancellationToken) =>
{
    Product? product = await db.Products
        .AsNoTracking()
        .FirstOrDefaultAsync(p => p.Sku == sku, cancellationToken);

    return product is null ? Results.NotFound() : Results.Ok(product);
});
```

While SQL Server runs the query, no thread is blocked by this request. A `Task<T>` is the object that represents the pending operation and its eventual result or exception. Conventions: return `Task` or `Task<T>`, suffix the method name with `Async`, and accept a `CancellationToken` (lesson 04).

"Async all the way" follows from this. Microsoft's rule is that the entire call stack is asynchronous so the request can benefit; one synchronous blocking call in the chain cancels the benefit for that request.

## Concurrency without threads

`await` does not make code parallel. Two awaits in a row run one after the other. To run independent I/O concurrently, start the tasks first and await them together:

```csharp
public async Task<ProductPage> GetProductPageAsync(string sku, CancellationToken cancellationToken)
{
    Task<Product> productTask = catalog.GetAsync(sku, cancellationToken);
    Task<StockLevel> stockTask = inventory.GetStockAsync(sku, cancellationToken);
    Task<IReadOnlyList<Review>> reviewsTask = reviews.GetLatestAsync(sku, cancellationToken);

    await Task.WhenAll(productTask, stockTask, reviewsTask);

    return new ProductPage(productTask.Result, stockTask.Result, reviewsTask.Result);
}
```

Reading `.Result` after `WhenAll` is safe because every task has completed; that is the only place it is safe. `Task.WhenAny` returns the first task to finish; await that task again to get its result or exception.

Do not run two queries concurrently on the same `DbContext`; EF Core does not support parallel operations on one context instance. The three services above must each use their own context or call other systems.

## Exceptions in async code

An exception thrown inside an `async` method is stored in the returned task and rethrown when the task is awaited, so `try`/`catch` around `await` works as you would expect. `Task.Exception` holds an `AggregateException`, and `await` rethrows its first inner exception to keep the code looking synchronous. With `WhenAll`, inspect each task if you need every failure.

Never write `async void` except for UI event handlers. The caller cannot await it or catch its exceptions, and Microsoft's ASP.NET Core guidance calls it always a bad practice there: the request can complete at the first `await`, and later access to the response crashes the process.

## Why `.Result` is dangerous

`.Result`, `.Wait()` and `.GetAwaiter().GetResult()` block the current thread until the task finishes: "sync over async". Two different failures follow, depending on the environment.

**Thread-pool starvation (ASP.NET Core).** The blocked thread is a pool thread that could serve other requests. Under load, many requests block at once, the pool has no free threads for new work items, and requests queue while the runtime adds threads. Since .NET 6 the pool adds threads much faster when threads block on tasks (`.Result`, `Task.Wait`), so the starvation is briefer, but it still returns on every load spike or restart, and the pool settles at a high thread count that costs memory. Other blocking calls (`Thread.Sleep`, synchronous I/O) still get the slow injection of one or two threads per second. Either way, latency climbs while CPU stays low. Lesson 05 shows how to diagnose it.

**Deadlock (only with a synchronization context).** UI frameworks (WinForms, WPF) install a `SynchronizationContext` that runs continuations on the UI thread; classic ASP.NET on .NET Framework installs one that lets only one thread at a time into the request context. If the thread holding that context blocks on `.Result`, the continuation that would complete the task can never enter it: deadlock. ASP.NET Core has no synchronization context, so the same code usually does not deadlock there; it starves instead. "It didn't deadlock" is not proof the code is fine.

```csharp
// Wrong in ASP.NET Core: blocks a pool thread for the whole query
public ActionResult<Product> Get(string sku) => _catalog.GetAsync(sku, default).Result;

// Right: the thread returns to the pool while the query runs
public async Task<ActionResult<Product>> Get(string sku, CancellationToken cancellationToken)
    => await _catalog.GetAsync(sku, cancellationToken);
```

`ConfigureAwait(false)` tells an `await` not to resume on the captured context. Stephen Toub's ConfigureAwait FAQ advises using it in general-purpose library code and not in application code. In an ASP.NET Core app it changes little, because there is no context to capture.

## `Task` versus `ValueTask`

`ValueTask<T>` is a struct that can hold a result without allocating a `Task` when the operation often completes synchronously, for example a cache hit. Microsoft's API docs are explicit: the default return type for any asynchronous method should be `Task` or `Task<T>`, and `ValueTask<T>` is for when performance analysis proves it worthwhile. A `ValueTask` must be awaited only once; never await it twice, call `AsTask()` twice, or read `.Result` before it completes.

You will meet `ValueTask` mostly as a consumer: `IAsyncDisposable.DisposeAsync` (the async cleanup method, lesson 03), channel readers and some stream APIs return it. Just await it once.

## In practice

- **Make the hot path async end to end:** endpoints, services, repositories, `SaveChangesAsync`, `ToListAsync`, `ReadFormAsync`. Prefer the `Async` overload whenever one exists.
- **Do not wrap async calls in `Task.Run` and await them** in ASP.NET Core; Microsoft notes it only adds thread-pool scheduling. And do not use `Task.Run` to make a synchronous API look asynchronous.
- **Start independent calls before awaiting** them when latency matters, but cap fan-out (lesson 05).
- **Usual mistakes:** `.Result` or `.Wait()` in a controller, `async void`, forgetting to `await` a task (exceptions vanish and work runs after the request ends), sharing one `DbContext` across concurrent tasks, and returning `ValueTask` everywhere "for speed".

## Status as of 2026-11-05

- The ASP.NET Core best-practices page (`aspnetcore-10.0` view, updated 2026-11-03) still lists "Do not block asynchronous execution by calling `Task.Wait` or `Task<TResult>.Result`" as its first performance rule.
- The ConfigureAwait FAQ is a 2019-12-11 blog post; its guidance still matches the current `IAsyncDisposable` docs, which use `ConfigureAwait(false)` in library-style samples.

## Check yourself

1. During `await db.Products.ToListAsync()`, what is the request's thread doing?
2. Why does the same `.Result` call deadlock in a WinForms app but only slow down an ASP.NET Core API?
3. Two awaits in a row take 300 ms and 200 ms. How long does the method take, and how do you make it about 300 ms?
4. When would you return `ValueTask<T>` from your own method, and what must callers never do with it?
