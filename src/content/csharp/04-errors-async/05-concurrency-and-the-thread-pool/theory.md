# Concurrency and the Thread Pool

After this lesson you can explain how the .NET thread pool serves a web app, recognize and diagnose sync-over-async, protect shared state, and pick the right tool for concurrent work: `SemaphoreSlim` for async critical sections and limits, `Parallel.ForEach` for CPU-bound loops, `Parallel.ForEachAsync` for bounded I/O fan-out, `Channel<T>` for in-process producer/consumer pipelines, and `IAsyncEnumerable<T>` for streaming results.

You need: 04/02 (`await`, `Task.WhenAll`, sync over async), 04/03 (`using`), 04/04 (cancellation tokens), 03/01 (dictionaries) and 03/03 (iterators with `yield return`).

## One process, shared threads

An ASP.NET Core app is one process that serves every request on threads from a shared pool, so a `static` field or a singleton service (module 05) is used by many requests at once, on different threads. Shared mutable state needs thread-safe types, and every blocked thread is taken from the pool everyone uses.

## The thread pool and starvation

The thread pool keeps a set of worker threads and a queue of work items. ASP.NET Core runs your request code and every `await` continuation on these threads. When code blocks a pool thread (`.Result`, `.Wait()`, a synchronous read of the request body, `Thread.Sleep`), the work item cannot finish and the thread cannot pick up the next one.

Microsoft's diagnostics tutorial describes the signature of starvation: the thread count climbs quickly to two or three times the number of cores, then by one or two threads per second, while CPU stays well below 100% and the queue grows:

```bash
dotnet-counters monitor -n Catalog.Api
# watch dotnet.thread_pool.thread.count and dotnet.thread_pool.queue.length under load
```

`dotnet-stack report -n Catalog.Api` then shows the blocked frames. Since .NET 9, `dotnet-trace` can also collect the `WaitHandleWait` event for intermittent cases. The fix: make the blocking call asynchronous.

Hidden sync-over-async to look for:

- `Request.Form` instead of `await Request.ReadFormAsync()`, or `ReadToEnd()` on the request body instead of `ReadToEndAsync()`.
- A synchronous API wrapped in `Task.Run` and awaited: it still blocks a pool thread, just a different one.

## Shared state across threads

Anything a singleton holds must tolerate concurrent access. Use `ConcurrentDictionary<TKey, TValue>` for shared maps, `Interlocked.Increment` for counters, and keep per-request data in scoped services. A `lock` statement lets one thread at a time run a block:

```csharp
lock (_gate) { _total += amount; }
```

A `lock` block cannot contain `await`; the compiler rejects it. When a critical section awaits, use `SemaphoreSlim` with an initial and maximum count of 1, and release it in `finally`:

```csharp
public sealed class TokenCache(IdentityClient identity)
{
    private readonly SemaphoreSlim _refreshLock = new(1, 1);
    private AccessToken? _token;

    public async Task<AccessToken> GetAsync(CancellationToken cancellationToken)
    {
        if (_token is { IsExpired: false } current) return current;

        await _refreshLock.WaitAsync(cancellationToken);
        try
        {
            if (_token is not { IsExpired: false })
            {
                _token = await identity.RequestTokenAsync(cancellationToken);
            }
            return _token;
        }
        finally
        {
            _refreshLock.Release();
        }
    }
}
```

The second check inside the lock matters: callers that waited while the first one refreshed find the new token and do not refresh again. With a count above 1, the same type is a limiter: `new SemaphoreSlim(8, 8)` lets at most eight operations hold a slot at once, and the rest wait in `WaitAsync` until one is released.

`HttpContext` and `DbContext` (EF Core's database session, 07/02) are not thread-safe: copy the values you need from the request before starting parallel work, and give each concurrent unit its own `DbContext`.

## CPU-bound versus I/O-bound

**CPU-bound** work (resizing images, hashing, computing price rules over a large list) needs real threads. `Parallel.ForEach` splits the loop across pool threads:

```csharp
Parallel.ForEach(products, new ParallelOptions { MaxDegreeOfParallelism = Math.Max(1, Environment.ProcessorCount / 2) },
    product => product.FinalPrice = priceRules.Apply(product));
```

Inside a web request this competes with other requests for threads, so heavy CPU work belongs in a background worker (module 10).

**I/O-bound** fan-out (calling a supplier API for 5,000 SKUs) needs concurrency, not threads. `Task.WhenAll` over 5,000 tasks starts all of them at once and can overwhelm the remote service. `Parallel.ForEachAsync` (since .NET 6) bounds it; without options it runs at most `Environment.ProcessorCount` operations at a time, which is rarely the right number for I/O, so set it:

```csharp
await Parallel.ForEachAsync(skus,
    new ParallelOptions { MaxDegreeOfParallelism = 8, CancellationToken = cancellationToken },
    async (sku, token) =>
    {
        SupplierPrice price = await supplier.GetPriceAsync(sku, token);
        await priceStore.SaveAsync(price, token);
    });
```

## Pipelines with `Channel<T>`

`System.Threading.Channels` provides in-process, asynchronous FIFO queues for producer/consumer work, part of the shared framework since .NET Core 3.0. A bounded channel gives back pressure: with the default `BoundedChannelFullMode.Wait`, `WriteAsync` waits until the consumer makes room.

```csharp
Channel<ImportRow> channel = Channel.CreateBounded<ImportRow>(new BoundedChannelOptions(500)
{
    SingleReader = true,
    FullMode = BoundedChannelFullMode.Wait
});

using var failure = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
await Task.WhenAll(ProduceAsync(failure), ConsumeAsync(failure));

async Task ProduceAsync(CancellationTokenSource failure)
{
    Exception? error = null;
    try
    {
        await foreach (ImportRow row in csv.ReadRowsAsync(failure.Token))
        {
            await channel.Writer.WriteAsync(row, failure.Token);
        }
    }
    catch (Exception ex)
    {
        error = ex;
        throw;
    }
    finally
    {
        channel.Writer.TryComplete(error); // the reader ends, and rethrows error if set
    }
}

async Task ConsumeAsync(CancellationTokenSource failure)
{
    try
    {
        await foreach (ImportRow row in channel.Reader.ReadAllAsync(failure.Token))
        {
            await importer.UpsertAsync(row, failure.Token);
        }
    }
    catch
    {
        failure.Cancel(); // unblock a producer waiting on a full channel
        throw;
    }
}
```

Each method starts running when it is called and returns to the caller at its first `await` that has to wait, so reading and writing overlap without `Task.Run`. The `finally` matters: if the producer fails without completing the writer, `ReadAllAsync` waits forever. `TryComplete(error)` ends the reader and passes the fault on, and `Task.WhenAll` observes both tasks so no failure goes unseen.

A channel lives in memory: items are lost if the process stops. It is not a replacement for a message broker; durable messaging comes in module 10.

## Streaming with `IAsyncEnumerable<T>`

An async iterator (`async IAsyncEnumerable<T>` with `yield return`) produces items as they arrive, and `await foreach` consumes them without loading everything into memory. EF Core streams query results with `AsAsyncEnumerable()`, and an endpoint can return an `IAsyncEnumerable<T>`, which the serializer enumerates asynchronously. To accept cancellation in an iterator, mark the token parameter `[EnumeratorCancellation]`; consumers pass a token with `.WithCancellation(token)`.

## Common mistakes

- **A plain `Dictionary` in a singleton.** Concurrent writes corrupt it silently, with no exception. Use `ConcurrentDictionary`.
- **Refreshing shared state without a gate.** Ten requests find the token expired and all ten refresh it. Guard the refresh with `SemaphoreSlim.WaitAsync` and check again inside.
- **`WaitAsync` without `Release` in `finally`.** One exception keeps the slot taken and every later caller waits forever. The semaphore does not track owners, so each successful wait needs exactly one `Release`.
- **Unbounded fan-out.** `Task.WhenAll` over thousands of calls hits the remote service all at once. Cap it with `Parallel.ForEachAsync` or a `SemaphoreSlim` limiter.

## In practice

- **Measure before guessing.** Low CPU plus rising latency plus a growing thread count means blocking; `dotnet-counters` confirms it in minutes.
- **Choose by the kind of work:** CPU-bound and large, `Parallel.ForEach` in a worker; I/O fan-out, `Parallel.ForEachAsync` or a semaphore with an explicit limit; stages at different speeds, a bounded `Channel<T>`; large result sets, `IAsyncEnumerable<T>` or pagination.
- **Prefer fixing blocking code to raising the pool minimum** with `ThreadPool.SetMinThreads`: more threads only treat the symptom, and each thread costs memory.

## Status as of 2026-11-05

- The starvation tutorial targets .NET 9 and later (`dotnet.thread_pool.*` counter names, the `WaitHandleWait` event).
- `Parallel.ForEachAsync` exists since .NET 6; its API page for `net-10.0` states the `ProcessorCount` default.

## Check yourself

1. Which three counter readings together point to thread-pool starvation rather than a slow database?
2. Why does `lock` not work around an `await`, and what replaces it?
3. You must call a supplier API for 5,000 SKUs. Why is `Task.WhenAll(skus.Select(...))` risky, and what do you use instead?
4. When is a `Channel<T>` the wrong choice compared with a message broker?
