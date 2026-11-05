# async and await

After this lesson you can write correct `async` methods, explain what a `Task` is and when `ValueTask` is worth it, start independent operations concurrently with `Task.WhenAll`, and explain why `.Result` starves the thread pool in ASP.NET Core and deadlocks only where a synchronization context exists.

You need: 04/01 (exceptions, `try`/`catch`), 02/03 (interfaces), 02/04 (generics and lambdas) and 00/05 (lists and dictionaries).

## Why async exists

Most backend work is waiting: for a database, a file or another service. Code runs on **threads**, and a thread that waits can do nothing else meanwhile.

A web server (module 05) serves many requests at once from a small, shared **thread pool**. Microsoft's best-practices page puts it plainly: asynchronous APIs let a small pool of threads handle thousands of concurrent requests by not waiting on blocking calls. If a request's thread sits waiting for the database, that thread is unavailable to everyone else. Code written synchronously still works, but under load the API stalls at a few dozen concurrent requests while CPU usage stays low.

## What `await` really does

An `async` method is rewritten by the compiler into a state machine. When execution reaches `await` on an operation that has not finished, the method returns to its caller, the thread goes back to the pool, and the rest of the method is scheduled as a continuation that runs when the operation completes, usually on another pool thread.

```csharp
public interface IProductStore
{
    Task<Product?> FindAsync(string sku, CancellationToken cancellationToken);
}

public async Task<string> DescribeAsync(string sku, CancellationToken cancellationToken)
{
    Product? product = await store.FindAsync(sku, cancellationToken);
    return product is null ? "Unknown product" : $"{product.Name}: {product.Price:0.00}";
}
```

While the store runs its query, no thread is blocked by this call. A `Task<T>` is the object that represents the pending operation and its eventual result or exception. Conventions: return `Task` or `Task<T>`, suffix the method name with `Async`, and accept a `CancellationToken`, the "stop, nobody needs this any more" signal of lesson 04.

"Async all the way" follows: one synchronous blocking call anywhere in the call chain cancels the benefit for that request.

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

Reading `.Result` after `WhenAll` is safe because every task has completed; that is the only place it is safe. When every task has the same type, `await Task.WhenAll(tasks)` returns their results as an array, in the order of the tasks.

Do not run two queries concurrently on the same `DbContext`, EF Core's database session (07/02): it does not support parallel operations on one instance. The three services above must each use their own context or call other systems.

## Exceptions in async code

An exception thrown inside an `async` method is stored in the returned task and rethrown when the task is awaited, so `try`/`catch` around `await` works as you would expect. `Task.Exception` holds an `AggregateException`, and `await` rethrows its first inner exception to keep the code looking synchronous. With `WhenAll`, inspect each task if you need every failure.

Never write `async void` except for UI event handlers. The caller cannot await it or catch its exceptions, and Microsoft's ASP.NET Core guidance calls it always a bad practice there: the request can complete at the first `await`, and later access to the response crashes the process.

## Why `.Result` is dangerous

`.Result`, `.Wait()` and `.GetAwaiter().GetResult()` block the current thread until the task finishes: "sync over async". Two different failures follow, depending on the environment.

**Thread-pool starvation (ASP.NET Core).** The blocked thread is a pool thread that could serve other requests. Under load, many requests block at once and new work queues while the runtime adds threads. Since .NET 6 the pool adds threads much faster when threads block on tasks, so the starvation is briefer, but it returns on every load spike, and the pool settles at a high thread count that costs memory. Lesson 05 shows how to diagnose it.

**Deadlock (only with a synchronization context).** UI frameworks (WinForms, WPF) install a `SynchronizationContext` that runs continuations on the UI thread; classic ASP.NET on .NET Framework installs one that lets only one thread at a time into the request context. If the thread holding that context blocks on `.Result`, the continuation that would complete the task can never enter it: deadlock. ASP.NET Core has no synchronization context, so the same code usually starves there instead. "It didn't deadlock" is not proof the code is fine.

```csharp
// Wrong: blocks a pool thread for the whole query
public Product? Find(string sku) => _store.FindAsync(sku, default).Result;

// Right: the thread returns to the pool while the query runs
public async Task<Product?> FindAsync(string sku, CancellationToken cancellationToken)
    => await _store.FindAsync(sku, cancellationToken);
```

`ConfigureAwait(false)` tells an `await` not to resume on the captured context. Stephen Toub's ConfigureAwait FAQ advises it in general-purpose library code and not in application code; in an ASP.NET Core app it changes little, because there is no context to capture.

## `Task` versus `ValueTask`

`ValueTask<T>` is a struct that can hold a result without allocating a `Task` when the operation often completes synchronously, for example a cache hit: return `new ValueTask<T>(value)` on that path and `new ValueTask<T>(task)` otherwise. Microsoft's API docs are explicit: the default return type for any asynchronous method is `Task` or `Task<T>`, and `ValueTask<T>` is for when performance analysis proves it worthwhile. Await a `ValueTask` only once; never await it twice, call `AsTask()` twice, or read `.Result` before it completes.

You will meet `ValueTask` mostly as a consumer: `IAsyncDisposable.DisposeAsync` (the async cleanup method, lesson 03) and some stream APIs return it. Just await it once.

## Common mistakes

- **Awaiting inside a loop when the calls are independent.** `foreach` with `await` on each price request takes the sum of all the waits. Start every task, then `await Task.WhenAll(tasks)`.
- **Blocking with `.Result` or `.Wait()`.** In ASP.NET Core it holds a pool thread and starves the pool under load; in a UI app it can deadlock. Make the caller `async` and `await`.
- **Forgetting `await`.** The call returns a task nobody observes: its exception vanishes and the work may still run after the request ended. Await every task you start.
- **`async void` methods.** Nobody can await them or catch their exceptions. Return `Task`.

## In practice

- **Make the hot path async end to end**, and prefer the `Async` overload whenever one exists.
- **Do not wrap calls in `Task.Run` and await them** in ASP.NET Core; Microsoft notes it only adds thread-pool scheduling.
- **Start independent calls before awaiting** them when latency matters, but cap fan-out (lesson 05).

## Status as of 2026-11-05

- The ASP.NET Core best-practices page (`aspnetcore-10.0` view, updated 2026-11-03) still lists "Do not block asynchronous execution by calling `Task.Wait` or `Task<TResult>.Result`" as its first performance rule.
- The ConfigureAwait FAQ is a 2019-12-11 blog post; its library-versus-application advice still applies.

## Check yourself

1. During `await store.FindAsync(sku, cancellationToken)`, what is the calling thread doing?
2. Why does the same `.Result` call deadlock in a WinForms app but only slow down an ASP.NET Core API?
3. Two awaits in a row take 300 ms and 200 ms. How long does the method take, and how do you make it about 300 ms?
4. When would you return `ValueTask<T>` from your own method, and what must callers never do with it?
