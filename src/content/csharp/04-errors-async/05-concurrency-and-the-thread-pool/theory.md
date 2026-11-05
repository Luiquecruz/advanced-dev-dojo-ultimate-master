# Concurrency and the Thread Pool

After this lesson you can explain how the .NET thread pool serves a web app, recognize and diagnose sync-over-async, and pick the right tool for concurrent work: `Parallel.ForEach` for CPU-bound loops, `Parallel.ForEachAsync` for bounded I/O fan-out, `Channel<T>` for in-process producer/consumer pipelines, and `IAsyncEnumerable<T>` for streaming results.

## Coming from PHP/Magento

PHP-FPM gives you isolation for free. Each request runs in its own worker process with its own memory; a static property or a singleton from Magento's object manager lives for one request and is never touched by two requests at once. Concurrency is the process manager's problem, and parallel work means more processes: several `queue:consumers:start` runs, or cron jobs.

In ASP.NET Core one process serves every request on shared threads. A `static` field or a singleton service is shared by all requests, at the same time, on different threads. Two traps follow. First, shared mutable state needs thread-safe types, which PHP code never needed. Second, every blocked thread is taken from the same pool everyone uses. A Magento habit such as a synchronous HTTP call in an observer becomes, in .NET, a way to stall unrelated requests.

## The thread pool and starvation

The thread pool keeps a set of worker threads and a queue of work items. ASP.NET Core runs your request code and every `await` continuation on these threads. When code blocks a pool thread (`.Result`, `.Wait()`, a synchronous read of the request body, `Thread.Sleep`), the work item cannot finish and the thread cannot pick up the next one.

Microsoft's diagnostics tutorial describes the signature of starvation: the pool's thread count climbs quickly to two or three times the number of cores, then grows by one or two threads per second, while CPU usage stays well below 100% and the queue length grows. You can watch it live:

```bash
dotnet-counters monitor -n Catalog.Api
# watch dotnet.thread_pool.thread.count and dotnet.thread_pool.queue.length under load
```

`dotnet-stack report -n Catalog.Api` then shows the blocked frames, typically `Task.GetResultCore` called from your controller. Since .NET 9 the runtime also emits a `WaitHandleWait` event for blocking waits, which `dotnet-trace` can collect for intermittent cases. The fix is always the same: make the blocking call asynchronous.

Hidden sync-over-async to look for:

- `Request.Form` instead of `await Request.ReadFormAsync()`, and `StreamReader.ReadToEnd()` on the request body instead of `ReadToEndAsync()`.
- A synchronous API wrapped as `Task.Run(() => client.Send(...))` and awaited: it still blocks a pool thread, just a different one.
- Returning `IEnumerable<T>` from an action over a lazily evaluated query, which the serializer enumerates synchronously.

## Shared state across threads

Anything a singleton holds must tolerate concurrent access. Use `ConcurrentDictionary<TKey, TValue>` for shared maps, `Interlocked.Increment` for counters, and keep per-request data in scoped services. A `lock` block cannot contain `await`; the compiler rejects it. When a critical section awaits, use `SemaphoreSlim`:

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

`HttpContext` and `DbContext` are not thread-safe: copy the values you need from the request before starting parallel work, and give each concurrent unit its own `DbContext`.

## CPU-bound versus I/O-bound

**CPU-bound** work (resizing images, hashing, computing price rules over a large list) needs real threads. `Parallel.ForEach` splits the loop across pool threads:

```csharp
Parallel.ForEach(products, new ParallelOptions { MaxDegreeOfParallelism = Math.Max(1, Environment.ProcessorCount / 2) },
    product => product.FinalPrice = priceRules.Apply(product));
```

Inside a web request this competes with other requests for the same threads, so heavy CPU work belongs in a background worker (module 10), not in an endpoint.

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

A channel lives in memory: items are lost if the process stops. It is not a replacement for RabbitMQ or Magento's message queue; durable messaging comes in module 10.

## Streaming with `IAsyncEnumerable<T>`

An async iterator (`async IAsyncEnumerable<T>` with `yield return`) produces items as they arrive, and `await foreach` consumes them without loading everything into memory. EF Core streams query results with `AsAsyncEnumerable()`, and ASP.NET Core can return an `IAsyncEnumerable<T>` from an endpoint, which the serializer enumerates asynchronously. To accept cancellation in an iterator, mark the token parameter `[EnumeratorCancellation]`; consumers pass a token with `.WithCancellation(token)`.

## In practice

- **Measure before guessing.** Low CPU plus rising latency plus a growing thread count means blocking; `dotnet-counters` confirms it in minutes.
- **Choose by the kind of work:** CPU-bound and large, `Parallel.ForEach` in a worker; I/O fan-out, `Parallel.ForEachAsync` with an explicit limit; stages at different speeds, a bounded `Channel<T>`; large result sets, `IAsyncEnumerable<T>` or pagination.
- **Prefer fixing blocking code to raising the pool minimum** with `ThreadPool.SetMinThreads`. This is a recommendation, not a documented rule: more threads only treat the symptom, and the tutorial notes that each thread also consumes memory.
- **Usual mistakes:** shared `Dictionary` in a singleton, `lock` around I/O, unbounded `Task.WhenAll` against a third-party API, one `DbContext` shared across parallel tasks, and an unbounded channel whose producer outruns the consumer until memory runs out.

## Status as of 2026-11-05

- The thread-pool starvation tutorial targets .NET 9 and later: it uses the .NET 9+ `dotnet.thread_pool.*` counter names, and the `WaitHandleWait` event (introduced in .NET 9) for intermittent cases. Its main tools are `dotnet-counters` and `dotnet-stack`.
- `Parallel.ForEachAsync` exists since .NET 6; its API page for `net-10.0` states the `ProcessorCount` default.

## Check yourself

1. Which three counter readings together point to thread-pool starvation rather than a slow database?
2. Why does `lock` not work around an `await`, and what replaces it?
3. You must call a supplier API for 5,000 SKUs. Why is `Task.WhenAll(skus.Select(...))` risky, and what do you use instead?
4. When is a `Channel<T>` the wrong choice compared with a message broker?
