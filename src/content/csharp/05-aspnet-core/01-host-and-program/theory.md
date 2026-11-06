# The Host and Program.cs

After this lesson you can read the `Program.cs` of any modern ASP.NET Core app, say what the host does before the first request arrives, and predict which state lives for one request and which lives for the whole process. Most of this module builds on that last point.

You need: 01/02 (`dotnet new` and `dotnet run`), 02/04 (lambdas), 04/02 (`async` and `await`) and 04/05 (threads, the thread pool and `Interlocked`).

## A request and a response

A web API is a program that waits for messages over the network and answers them. The protocol is HTTP. A client (a browser, a mobile app, another server) sends a **request**: a method that says what it wants (`GET` to read, `POST` to create, `PUT` to replace, `DELETE` to remove), a path such as `/products/42`, headers (`Accept: application/json`) and, for some methods, a body. The server sends back a **response**: a status code (`200 OK`, `404 Not Found`, `500 Internal Server Error`), headers and usually a body, here JSON.

```text
GET /time HTTP/1.1                 HTTP/1.1 200 OK
Host: localhost:5000               Content-Type: application/json
Accept: application/json
                                   {"utc":"2026-11-05T10:00:00+00:00"}
```

Your job in ASP.NET Core is to say which code answers which method and path. `app.MapGet("/time", handler)` means "when a `GET` request for `/time` arrives, run this lambda and turn its return value into the response". Module 06 covers the rest of HTTP.

## What a host is

A host is the object that owns the app's resources: the dependency injection container, configuration, logging and the hosted services (`IHostedService`). When it starts, it calls `StartAsync` on each hosted service. In a web app, one of those services is the HTTP server, Kestrel, which runs inside your process. Because everything hangs off one object, the host also controls startup and graceful shutdown.

There are two builders for the same idea:

- `WebApplication.CreateBuilder(args)` for HTTP apps (APIs, sites).
- `Host.CreateApplicationBuilder(args)` for non-HTTP apps, such as the Worker Service template you will use in module 10.

Both give you the same `Services`, `Configuration`, `Logging` and `Environment` properties.

## Reading Program.cs

A .NET 10 API template uses top-level statements: the file is the entry point, with no `Main` method or `Startup` class (those belong to code written before .NET 6).

```csharp
var builder = WebApplication.CreateBuilder(args);

// 1. Register services (lesson 05/02)
// TimeProvider is .NET's injectable clock; 09/02 shows why tests need it
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

`CreateBuilder` does a lot before your first line runs. It loads configuration from `appsettings.json`, `appsettings.{Environment}.json`, user secrets (in Development), environment variables and command-line arguments. It adds the Console, Debug and EventSource logging providers (plus EventLog on Windows), configures Kestrel, and in Development enables DI scope validation and the developer exception page. Lessons 05/02 to 05/05 open each of these boxes.

## Environments

The host reads its environment name from `ASPNETCORE_ENVIRONMENT` or `DOTNET_ENVIRONMENT`. If neither is set, the environment is `Production`. Framework-defined values are `Development`, `Staging` and `Production`, and you can use any other name. The environment selects `appsettings.{Environment}.json` and lets code branch with `app.Environment.IsDevelopment()`.

The safe default matters: a server that forgets the variable runs as Production, without the developer exception page. `dotnet run` on your machine usually runs as Development because the template's `Properties/launchSettings.json` sets the variable. That file is for local tooling only and is not used when the app is deployed.

## One process, many requests

`dotnet run` starts one process that boots once, then serves requests concurrently on the thread pool until it is told to stop. Nothing is thrown away between requests, so a captured variable or a static field is a single shared value:

```csharp
var app = WebApplication.Create(args);

var hits = 0; // one variable for the lifetime of the process

app.MapGet("/hits", () => Interlocked.Increment(ref hits));

app.Run();
```

Every request increments the same `hits`, and two requests can run at the same instant on different threads, which is why the snippet uses `Interlocked.Increment` instead of `hits++`. This is useful for genuinely process-wide things (a connection pool, a compiled regex, an in-memory cache) and dangerous for anything that belongs to one user or one request. Per-request data travels with the request: through `HttpContext`, method parameters or scoped services (lesson 05/02).

Two more consequences of the long-running model:

- Blocking a thread with `.Result` or `.Wait()` takes it away from other requests and can starve the thread pool (04/05).
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

A deploy that kills the process without waiting for graceful shutdown cuts requests in half, so set the orchestrator's grace period longer than the timeout: `docker stop` waits 10 seconds and a Kubernetes pod 30 seconds by default before killing the process.

## Common mistakes

- **Per-user data in a static field.** A `static Dictionary` filled with the current user's cart is shared by every request and thread: users see each other's data, and concurrent writes can corrupt the dictionary. Keep per-request data in parameters, `HttpContext` or scoped services.
- **Registering a service after `Build()`.** The container is already built, so the call throws `InvalidOperationException` at startup. Move every `builder.Services` call above `var app = builder.Build();`.
- **Relying on the default environment.** A server without `ASPNETCORE_ENVIRONMENT` silently runs as Production, and one copied from a laptop may run as Development with detailed error pages. Set the variable in every deployed environment.

## In practice

- Keep `Program.cs` readable. When registrations grow, move them into extension methods such as `builder.Services.AddCatalog()` (lesson 05/02 shows the convention) instead of letting the file reach hundreds of lines.
- Use `WebApplication` for HTTP and `Host.CreateApplicationBuilder` for workers. You will see `Host.CreateDefaultBuilder(...).ConfigureWebHostDefaults(...)` and `Startup` classes in older code and blog posts: they still work, but they are not what new templates generate.
- Treat static mutable state as a bug unless it is deliberately process-wide and thread-safe.
- Do slow startup work (warming a cache, checking a dependency) with a timeout, because it delays the moment the app can serve traffic.

## Check yourself

1. Which objects in an ASP.NET Core app live for one request, and which live for the whole process?
2. What happens between `WebApplication.CreateBuilder(args)` and the first line you wrote?
3. A container orchestrator sends SIGTERM during a deploy. Walk through what the host does and what you control.
4. Why does the `/hits` example need `Interlocked.Increment`?
