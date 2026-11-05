# Hosted Services and the Worker Service

After this lesson you can write a `BackgroundService` that runs inside a web API or in its own Worker Service process, give each unit of work its own DI scope, stop cleanly when the host shuts down, and decide which background work belongs in a hosted service.

You need: 05/01 (the host and graceful shutdown), 05/02 (lifetimes and scope validation), 04/04 (cancellation tokens), 04/05 (`Channel<T>`) and 07/02 (`DbContext`).

## IHostedService and BackgroundService

A **hosted service** is a class the host starts with the app and stops with it. It lives in the same long-running process as your API, or in a separate Worker Service process with no HTTP server, and runs for hours or days. The host calls two methods on every `IHostedService`: `StartAsync` when the app starts and `StopAsync` on graceful shutdown. Most code derives from `BackgroundService`, which implements both and asks you for one method, `ExecuteAsync`. The `Task` it returns represents the whole lifetime of the service.

```csharp
public sealed class HeartbeatService(ILogger<HeartbeatService> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using PeriodicTimer timer = new(TimeSpan.FromSeconds(30));

        while (await timer.WaitForNextTickAsync(stoppingToken))
        {
            logger.LogInformation("Heartbeat at {Time}", DateTimeOffset.UtcNow);
        }
    }
}
```

Register it with `builder.Services.AddHostedService<HeartbeatService>();`. The same call works in a web app (`WebApplication.CreateBuilder`) and in a Worker Service (`Host.CreateApplicationBuilder`).

Two facts about the lifecycle matter:

- In .NET 10, all of `ExecuteAsync` runs on the thread pool. Before .NET 10, the code before the first `await` ran on the startup thread and blocked the other services from starting, which is why older code starts with `await Task.Yield()`. If something must run before the app starts, put it in an overridden `StartAsync` (before calling `base.StartAsync`).
- `stoppingToken` is cancelled when `StopAsync` is called. Pass it to every async call so the loop ends promptly; the host waits for `ExecuteAsync` to finish, up to the shutdown timeout (30 seconds by default, module 05).

`PeriodicTimer` is the usual loop for interval work. It never runs two iterations at once: if one tick's work takes longer than the period, the next wait returns immediately instead of overlapping. `System.Threading.Timer`, which you may see in older samples, does not wait for the previous callback to finish.

## One scope per unit of work

Because the service is a singleton, it gets scoped services by creating a scope for each unit of work: one tick, one message, one job. The scope owns the `DbContext` and is disposed when the work ends, as the request scope is in ASP.NET Core.

```csharp
// ... ShopDbContext and its Cart entity are an EF Core model as in module 07
public sealed class ExpireCartsService(
    IServiceScopeFactory scopeFactory,
    ILogger<ExpireCartsService> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using PeriodicTimer timer = new(TimeSpan.FromMinutes(5));

        while (await timer.WaitForNextTickAsync(stoppingToken))
        {
            try
            {
                await using AsyncServiceScope scope = scopeFactory.CreateAsyncScope();
                var db = scope.ServiceProvider.GetRequiredService<ShopDbContext>();

                int removed = await db.Carts
                    .Where(c => c.UpdatedAtUtc < DateTime.UtcNow.AddDays(-30))
                    .ExecuteDeleteAsync(stoppingToken);

                logger.LogInformation("Removed {Count} stale carts", removed);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                logger.LogError(ex, "Cart cleanup failed; retrying on the next tick");
            }
        }
    }
}
```

`CreateAsyncScope` returns an `AsyncServiceScope` that disposes asynchronously, which `DbContext` supports. `ExecuteDeleteAsync` is EF Core's set-based delete (module 07).

## When ExecuteAsync throws

Since .NET 6, an unhandled exception in `ExecuteAsync` is logged and **stops the whole host**: `HostOptions.BackgroundServiceExceptionBehavior` defaults to `StopHost`. In a web app, a bug in a cleanup job takes the API down with it. That is deliberate, because a silently dead worker is worse, but it means the loop must decide which failures are per iteration. The `try`/`catch` above catches inside the loop, so one failed tick is logged and the next tick runs. Setting the option to `Ignore` keeps the host running after the service dies: the exception is still logged, but nothing restarts the service, so do not use it to hide bugs.

## The Worker Service template

`dotnet new worker` creates a project with `<Project Sdk="Microsoft.NET.Sdk.Worker">`, a reference to `Microsoft.Extensions.Hosting` and this `Program.cs`:

```csharp
HostApplicationBuilder builder = Host.CreateApplicationBuilder(args);
builder.Services.AddHostedService<Worker>();

IHost host = builder.Build();
host.Run();
```

It has configuration, logging and DI like a web app, but no Kestrel and no endpoints. Run it in a container, as a systemd unit or as a Windows service. A worker meant to run once and exit must call `IHostApplicationLifetime.StopApplication()` when it finishes, or the host keeps running.

## In-process queues

Hosted services can also drain an in-memory queue: an endpoint writes a work item to a bounded `Channel<T>` (module 04) and returns `202 Accepted`, and a `BackgroundService` reads and runs the items. Microsoft's hosted services article shows this pattern. It is good for work you can afford to lose, because the queue lives in process memory: a crash, a deploy or a scale-in drops whatever was waiting. Work that must survive belongs in a durable store or a broker (lessons 02 and 03).

## Common mistakes

- **Injecting a scoped service into the constructor.** A hosted service is a singleton: with scope validation (on in Development) startup fails, and without it one `DbContext` and its change tracker live for the whole process. Create a scope per unit of work.
- **Ignoring `stoppingToken`.** Shutdown waits for the loop only up to the shutdown timeout, then the process exits mid-work. Pass the token to every async call.
- **Letting an exception escape `ExecuteAsync`.** With the default `StopHost`, one failed cleanup tick stops the whole API. Catch per-iteration failures inside the loop.
- **Long synchronous work in `StartAsync`.** The host waits for it, so the app starts late. Keep `StartAsync` short.

## In practice

- **Same host or separate worker.** Start in the API process when the job is small. Move it to a Worker Service when it needs its own scaling, its own deploy cadence, or should not compete with requests for CPU.
- **Every replica runs every hosted service**, so scheduled work on several instances needs coordination (lesson 02).
- **Do not capture request state.** `HttpContext` must not be stored or used after the request; copy the values you need (an order id, a user id) into the work item.

## Status as of 2026-11-05

- .NET 10 (LTS, supported until 2028-11-14) runs all of `ExecuteAsync` on a background thread; .NET 9 and earlier ran the synchronous part during startup.
- The `StopHost` default for `BackgroundServiceExceptionBehavior` dates from .NET 6 and is unchanged in .NET 10.

## Check yourself

1. Why does constructor injection of a `DbContext` work in a scoped request handler but not in a `BackgroundService`?
2. What happens to the web API when a hosted service in the same process throws an unhandled exception, and how do you keep one bad iteration from causing it?
3. Why does an endpoint copy the order id into the work item instead of passing `HttpContext` to the hosted service?
4. Which work is acceptable to queue in a `Channel<T>` drained by a hosted service, and which is not?
