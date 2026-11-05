# The Middleware Pipeline

After this lesson you can read the pipeline in `Program.cs`, put built-in middleware in an order that works, write your own middleware as a delegate or a class, and decide when middleware is the right tool and when a Magento habit (plugins, observers) points somewhere else.

## Coming from PHP/Magento

In Magento a request passes through `index.php`, the front controller, routers and the action controller, and you hook into it with plugins on classes such as `FrontControllerInterface` or with observers on events like `controller_action_predispatch`. Plugin order comes from `sortOrder` in merged `di.xml` files, so the effective order is a puzzle spread across modules.

ASP.NET Core has one explicit chain of request delegates, the pipeline, written in order in `Program.cs`. Each middleware receives the `HttpContext`, may do work, calls the next one (or does not), and may do more work on the way back. Conceptually it is a stack of around plugins on the whole request.

What transfers: the idea of wrapping a request to add cross-cutting behavior. The traps: order is the order of the code, not a configuration value, and a middleware sees the HTTP request only. It cannot intercept a call to one of your services the way a plugin intercepts any public method (lesson 02 covers decorators for that). Observers map best to events or messages, not to middleware.

## Use, Run and Map

```csharp
var app = WebApplication.Create(args);

app.Use(async (context, next) =>
{
    // before: runs on the way in
    await next(context);
    // after: runs on the way out, in reverse order
});

app.Use(async (context, next) =>
{
    if (context.Request.Path == "/ping")
    {
        await context.Response.WriteAsync("pong"); // short-circuit: next is never called
        return;
    }

    await next(context);
});

app.MapGet("/", () => "Hello");

app.Run();
```

- `Use` adds a middleware that receives `next`. Not calling `next` short-circuits the pipeline, as the `/ping` check does: later middleware and the endpoint never run.
- `Run` adds a terminal middleware with no `next`. Anything registered after it does not run for that branch.
- `Map` branches the pipeline by path; `UseWhen` branches on a predicate and rejoins the main pipeline unless the branch short-circuits.

Requests flow down in the order of the code, and responses flow back up in reverse. A middleware that measures time therefore wraps everything registered after it.

## Order matters

A typical API pipeline, following the order in the documentation:

```csharp
var builder = WebApplication.CreateBuilder(args);
builder.Services.AddAuthentication();
builder.Services.AddAuthorization();
// ... CORS, rate limiter and other services

var app = builder.Build();

if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/error"); // first: catches exceptions from everything below
    app.UseHsts();             // browser apps; for APIs see lesson 08/05
}

app.UseHttpsRedirection();   // browser apps; APIs reject HTTP instead (08/05)
app.UseRouting();
app.UseCors();
app.UseAuthentication();
app.UseAuthorization();
app.UseRateLimiter();   // after UseRouting when endpoints use rate-limit policies

app.MapGet("/products", () => Results.Ok());

app.Run();
```

The reasons are concrete. The exception handler only catches exceptions thrown by middleware after it. Authentication must run before authorization, because authorization needs to know who the user is. CORS, authentication and authorization must appear in that order. Rate limiting with endpoint-specific policies needs routing to have chosen the endpoint first. Modules 06 and 08 explain the exception handler, CORS, authentication and rate limiting themselves; here, learn to read the order.

`WebApplication` adds some middleware for you: the developer exception page first in Development, `UseRouting` if you did not call it and endpoints exist, `UseAuthentication` and `UseAuthorization` right after routing when their services are registered, and `UseEndpoints` at the end. Calling `UseRouting` yourself, as above, controls where routing happens.

## Writing middleware as a class

Inline delegates are fine for a few lines. Reusable middleware is a class with a constructor that takes `RequestDelegate` and a public `InvokeAsync(HttpContext)` that returns `Task`:

```csharp
using System.Diagnostics;

public sealed class RequestTimingMiddleware(RequestDelegate next, ILogger<RequestTimingMiddleware> logger)
{
    public async Task InvokeAsync(HttpContext context)
    {
        var start = Stopwatch.GetTimestamp();

        context.Response.OnStarting(() =>
        {
            var elapsed = Stopwatch.GetElapsedTime(start).TotalMilliseconds;
            context.Response.Headers["Server-Timing"] = $"app;dur={elapsed:F1}";
            return Task.CompletedTask;
        });

        await next(context);

        logger.LogInformation("{Method} {Path} returned {StatusCode} in {ElapsedMs:F1} ms",
            context.Request.Method, context.Request.Path, context.Response.StatusCode,
            Stopwatch.GetElapsedTime(start).TotalMilliseconds);
    }
}

public static class RequestTimingMiddlewareExtensions
{
    public static IApplicationBuilder UseRequestTiming(this IApplicationBuilder app) =>
        app.UseMiddleware<RequestTimingMiddleware>();
}
```

Register it with `app.UseRequestTiming();` at the point in the pipeline where it should wrap the rest.

Two rules show up in this small class:

- **Headers cannot change once the body has started.** ASP.NET Core does not buffer the response, so after the first write the headers are already on the wire and setting one throws. Set them before calling `next`, or register `Response.OnStarting` as above, or check `Response.HasStarted`. Also do not call `next` after you have written to the response yourself.
- **Middleware is a singleton in practice.** Convention-based middleware is constructed once at startup and lives for the whole application. Constructor parameters must therefore be singletons (a logger is fine). A scoped service, such as a `DbContext` or a per-request cart, goes into `InvokeAsync` as an extra parameter, which DI fills per request: `InvokeAsync(HttpContext context, ICartService carts)`. Injecting a scoped service into the constructor is the captive dependency from lesson 02: in Development it throws at runtime (scope validation); in Production it silently shares one instance across all requests.

The alternative is factory-based middleware: implement `IMiddleware`, register the class in DI, usually as scoped or transient, and it is activated per request, so scoped constructor injection works. Registering it as a singleton would bring the captive problem back.

## When not to use middleware

Middleware runs for every request that reaches it, so it belongs to concerns that are about HTTP and apply broadly: correlation ids, timing, security headers, request logging. Microsoft's guidance is not to use custom middleware for long-running work; queue it to a background service (module 10). Logic that applies to one group of endpoints, such as validating a header for `/admin`, fits endpoint filters better (module 06). Domain reactions, such as "send an email when an order is placed", are not HTTP concerns at all.

## In practice

- Read the pipeline top to bottom as "outermost to innermost"; put exception handling first and endpoints last.
- Package each custom middleware with a `Use{Name}` extension method so `Program.cs` stays a readable list.
- Keep middleware fast: it sits on the hot path of every request.
- Usual mistakes: authorization before authentication, adding headers after `await next(context)` without `OnStarting`, injecting a scoped service into a middleware constructor, and expecting middleware to see exceptions thrown by code registered before it.

## Check yourself

1. Why does the exception handler come first, and what does it miss when it does not?
2. Which Magento extension points map to middleware, which to endpoint filters, and which to neither?
3. A middleware sets a response header after `await next(context)` and the app throws in production. Why, and what are two fixes?
4. Where do you inject a scoped service into convention-based middleware, and why not the constructor?
