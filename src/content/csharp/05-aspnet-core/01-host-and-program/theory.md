# The Host and Program.cs

After this lesson you can read the `Program.cs` of any modern ASP.NET Core app, say what the host does before the first request arrives, and predict which state lives for one request and which lives for the whole process. That last point is the biggest change from PHP, and most of this module builds on it.

## Coming from PHP/Magento

In Magento, nginx hands each request to a PHP-FPM worker. The worker boots the application (`app/bootstrap.php`, the object manager, the merged `di.xml`), handles one request and throws every object away. Statics, singletons from the object manager, a counter in a class property: all of it dies at the end of the request. Caches survive only because they live outside PHP, in Redis or Varnish.

ASP.NET Core inverts this. `dotnet run` starts one process that boots once, then serves requests concurrently on a thread pool until it is told to stop. The web server, Kestrel, runs inside that process. There is no FPM pool and no per-request boot.

What transfers: constructor injection, configuration per environment, a front controller that dispatches to handlers. The trap: anything you put in a static field or a singleton is shared by every request and every thread, for hours. Code that is harmless in PHP (a static array used as a cache, a property set during one request) becomes a data leak or a race condition here.

## What a host is

A host is the object that owns the app's resources: the dependency injection container, configuration, logging and the hosted services (`IHostedService`). When it starts, it calls `StartAsync` on each hosted service. In a web app, one of those services is the HTTP server. Because everything hangs off one object, the host also controls startup and graceful shutdown.

There are two builders for the same idea:

- `WebApplication.CreateBuilder(args)` for HTTP apps (APIs, sites).
- `Host.CreateApplicationBuilder(args)` for non-HTTP apps, such as the Worker Service template you will use in module 10.

Both give you the same `Services`, `Configuration`, `Logging` and `Environment` properties.

## Reading Program.cs

A .NET 10 API template uses top-level statements: the file is the entry point, with no `Main` method or `Startup` class (those belong to code written before .NET 6).

```csharp
var builder = WebApplication.CreateBuilder(args);

// 1. Register services: this is your di.xml
builder.Services.AddSingleton(TimeProvider.System);

var app = builder.Build();

// 2. Build the request pipeline: middleware and endpoints
if (app.Environment.IsDevelopment())
{
    app.Logger.LogInformation("Running in Development");
}

app.MapGet("/time", (TimeProvider clock) => new { utc = clock.GetUtcNow() });

// 3. Start Kestrel and block until shutdown
app.Run();
```

The file has two phases separated by `builder.Build()`. Before it you describe services; after it the container is built and frozen, and you describe how a request flows. Registering a service after `Build()` throws, because the container already exists.

`CreateBuilder` does a lot before your first line runs. It loads configuration from `appsettings.json`, `appsettings.{Environment}.json`, user secrets (in Development), environment variables and command-line arguments. It adds the Console, Debug and EventSource logging providers (plus EventLog on Windows), configures Kestrel, and in Development enables DI scope validation and the developer exception page. Lessons 02 to 05 open each of these boxes.

## Environments

The host reads its environment name from `ASPNETCORE_ENVIRONMENT` or `DOTNET_ENVIRONMENT`. If neither is set, the environment is `Production`. Framework-defined values are `Development`, `Staging` and `Production`, and you can use any other name. The environment selects `appsettings.{Environment}.json` and lets code branch with `app.Environment.IsDevelopment()`.

The safe default matters: a server that forgets the variable runs as Production, without the developer exception page. `dotnet run` on your machine usually runs as Development because the template's `Properties/launchSettings.json` sets the variable. That file is for local tooling only and is not used when the app is deployed.

## One process, many requests

Because the process is long-lived, a captured variable or a static field is a single shared value:

```csharp
var app = WebApplication.Create(args);

var hits = 0; // one variable for the lifetime of the process

app.MapGet("/hits", () => Interlocked.Increment(ref hits));

app.Run();
```

Every request increments the same `hits`, and two requests can run at the same instant on different threads, which is why the snippet uses `Interlocked.Increment` instead of `hits++`. In PHP the same code would always return 1. This is useful for genuinely process-wide things (a connection pool, a compiled regex, an in-memory cache) and dangerous for anything that belongs to one user or one request. Per-request data travels with the request: through `HttpContext`, method parameters or scoped services (lesson 02).

Two more consequences of the long-running model, covered in depth elsewhere:

- Blocking a thread with `.Result` or `.Wait()` takes it away from other requests and can starve the thread pool (module 04).
- Memory you hold is never freed by "the request ended". A static dictionary that only grows is a leak.

## Startup and shutdown

`app.Run()` starts the host and blocks until shutdown. Shutdown starts on Ctrl+C or SIGTERM, which is what Docker and Kubernetes send. The host then:

1. Triggers `ApplicationStopping`.
2. Stops the server from accepting new connections and lets in-flight requests finish.
3. Stops hosted services and triggers `ApplicationStopped`.

All of this must fit inside the shutdown timeout, 30 seconds by default (it was 5 seconds in .NET 5 and earlier). Services still running when it expires are stopped anyway.

```csharp
var builder = WebApplication.CreateBuilder(args);
builder.Services.Configure<HostOptions>(o => o.ShutdownTimeout = TimeSpan.FromSeconds(45));

var app = builder.Build();
app.Lifetime.ApplicationStopping.Register(() =>
    app.Logger.LogInformation("Stopping: finishing in-flight requests"));

app.Run();
```

In PHP-FPM a deploy just kills idle workers. Here, a deploy that does not wait for graceful shutdown cuts requests in half, so orchestrators give the process a grace period at least as long as the timeout.

## In practice

- Keep `Program.cs` readable. When registrations grow, move them into extension methods such as `builder.Services.AddCatalog()` (lesson 02 shows the convention) instead of letting the file reach hundreds of lines.
- Use `WebApplication` for HTTP and `Host.CreateApplicationBuilder` for workers. You will see `Host.CreateDefaultBuilder(...).ConfigureWebHostDefaults(...)` and `Startup` classes in older code and blog posts: they still work, but they are not what new templates generate.
- Treat static mutable state as a bug unless it is deliberately process-wide and thread-safe.
- Set `ASPNETCORE_ENVIRONMENT` explicitly in every deployed environment so nobody relies on the default by accident.
- Usual mistakes: registering services after `Build()`, assuming a request-scoped value can sit in a static field, and doing slow work at startup without a timeout, which delays readiness.

## Check yourself

1. Which objects in a Magento request survive until the next request, and which objects in an ASP.NET Core app do?
2. What happens between `WebApplication.CreateBuilder(args)` and the first line you wrote?
3. A container orchestrator sends SIGTERM during a deploy. Walk through what the host does and what you control.
4. Why does the `/hits` example need `Interlocked.Increment`?
