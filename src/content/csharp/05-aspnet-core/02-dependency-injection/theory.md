# Dependency Injection and Service Lifetimes

After this lesson you can explain why classes receive their dependencies instead of creating them, register services in the built-in container with the right lifetime, spot a captive dependency before it reaches production, and add behavior around a service with a decorator.

You need: 05/01 (the host and `Program.cs`), 02/03 (interfaces), 02/05 (primary constructors and extension methods), 04/03 (`await using`) and 04/05 (shared state across threads).

## Why inject dependencies

A class that builds its own collaborators is welded to them:

```csharp
public sealed class CheckoutService
{
    private readonly SqlCartRepository repository = new("Host=prod-db;Database=shop");

    // ... every method talks to that database, and only to it
}
```

To test `CheckoutService` you now need that database, and to switch storage you edit the class. **Dependency injection** turns this around: the class declares what it needs, usually as interfaces in its constructor, and something else supplies the objects.

```csharp
public sealed class CheckoutService(ICartRepository repository, TimeProvider clock)
{
    // ... uses whatever ICartRepository it was given
}
```

A test passes a fake repository and a fixed clock; production passes the SQL one. The "something else" is the **DI container**: you register which class implements each interface and how long an instance lives, and the container builds whole object graphs for you, calling constructors and filling their parameters. In ASP.NET Core the container is part of the host, and `builder.Services` is its list of registrations.

## Registering and consuming

```csharp
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddSingleton(TimeProvider.System);
builder.Services.AddScoped<ICartService, CartService>();
builder.Services.AddTransient<IPriceFormatter, PriceFormatter>();

var app = builder.Build();

app.MapGet("/cart/{id:int}", async (int id, ICartService carts) =>
    await carts.GetAsync(id));

app.Run();

public sealed class CartService(ICartRepository repository, TimeProvider clock) : ICartService
{
    public Task<Cart?> GetAsync(int id) => repository.FindAsync(id, clock.GetUtcNow());
}
// ... interfaces and Cart omitted
```

`CartService` uses a primary constructor (02/05): the parameters are captured and available in every member. The container calls the public constructor and fills each parameter from its registrations. Minimal API handlers get services the same way: `ICartService carts` is resolved from the request's scope because the type is registered. Controllers use constructor injection exactly like `CartService`.

## The three lifetimes

- **Transient**: a new instance every time it is requested. In apps that process requests, transient services are disposed at the end of the request. Use it for light, stateless helpers.
- **Scoped**: one instance per scope. ASP.NET Core creates a scope per request, so this is "one per HTTP request": every class that asks for the service during one request shares the same instance. `AddDbContext` registers EF Core contexts as scoped by default.
- **Singleton**: one instance for the whole process, created the first time it is requested. It must be thread-safe, because concurrent requests use it at the same time. Good for caches, clients that pool connections, and configuration.

The container disposes `IDisposable` services that it created, at the end of the scope or at shutdown for singletons. Never dispose a service you received by injection. An instance you create yourself and pass in (`AddSingleton(new Foo())`) is not disposed by the container.

## Captive dependencies

A captive dependency is a short-lived service held by a longer-lived one:

```csharp
builder.Services.AddScoped<ICartRepository, SqlCartRepository>(); // one per request
builder.Services.AddSingleton<CartTotalsCache>();                 // one per process

public sealed class CartTotalsCache(ICartRepository repository) // BUG: captive
{
    // ...
}
```

The singleton is built once, so it keeps the first `SqlCartRepository` (and its database connection) forever, sharing it across threads. Microsoft's guidance is explicit: do not resolve a scoped service from a singleton, through the constructor or through `IServiceProvider`, because the scoped service then behaves like a singleton.

In the Development environment, the host's scope validation catches this: building the app throws an exception that names both services. In Production that check is off, which is why the bug "only happens in prod". Run the app in Development before shipping a new registration.

The fix is to depend on `IServiceScopeFactory` (always a singleton) and create a scope for each unit of work:

```csharp
public sealed class CartTotalsCache(IServiceScopeFactory scopes)
{
    public async Task<decimal> RefreshAsync(int cartId)
    {
        await using var scope = scopes.CreateAsyncScope();
        var repository = scope.ServiceProvider.GetRequiredService<ICartRepository>();
        // ... compute and store the total
        return 0m;
    }
}
```

The rule of thumb: a service may depend on services with the same or a longer lifetime. Scoped may use singleton; singleton may not use scoped. Background services, which are singletons, use this same pattern (module 10).

## Multiple registrations, TryAdd and keyed services

Registering the same service type twice does not fail. The last registration wins when you ask for `IPaymentGateway`, and both are returned when you ask for `IEnumerable<IPaymentGateway>`. "Last" means the order of your C# calls, so the order of `Add*` lines in `Program.cs` matters.

Library code uses `TryAddScoped`, `TryAddSingleton` and friends (namespace `Microsoft.Extensions.DependencyInjection.Extensions`), which register only if nothing is registered yet, so the application can override the default by registering first.

When you need several implementations of one interface chosen by name (one rate calculator per carrier, for example), use keyed services, available since .NET 8:

```csharp
// ... IShippingRates and its implementations omitted
builder.Services.AddKeyedSingleton<IShippingRates, CorreiosRates>("correios");
builder.Services.AddKeyedSingleton<IShippingRates, FedexRates>("fedex");

app.MapGet("/rates/fedex", ([FromKeyedServices("fedex")] IShippingRates rates) =>
    rates.Quote());
```

## Decorators: behavior around a service

The built-in container has no interception: it never wraps your methods with extra code on its own. For HTTP cross-cutting concerns you use middleware (lesson 05/05) and endpoint filters (module 06). For a service, write a decorator: a class that implements the same interface, receives the inner implementation, and adds behavior.

```csharp
public sealed class LoggingCartService(ICartService inner, ILogger<LoggingCartService> logger) : ICartService
{
    public async Task<Cart?> GetAsync(int id)
    {
        logger.LogInformation("Loading cart {CartId}", id); // ILogger: lesson 05/04
        return await inner.GetAsync(id);
    }
}

builder.Services.AddScoped<CartService>();
builder.Services.AddScoped<ICartService>(provider => new LoggingCartService(
    provider.GetRequiredService<CartService>(),
    provider.GetRequiredService<ILogger<LoggingCartService>>()));
```

The factory registration builds the real service and wraps it. Third-party libraries such as Scrutor automate this; the built-in container does not.

## Common mistakes

- **A scoped service in a singleton's constructor.** The singleton keeps the first instance forever, so one `DbContext` is shared by concurrent requests and fails with threading errors or stale data. Development throws at `Build()`; Production does not. Use `IServiceScopeFactory`.
- **Forgetting a registration.** A constructor asks for `ICartRepository` and nothing registers it: the app throws `InvalidOperationException` ("Unable to resolve service") at startup or on the first request. Register every interface a constructor names.
- **Disposing an injected service.** Wrapping an injected `DbContext` in `using` disposes it for every other class in the request, which then throws `ObjectDisposedException`. The container disposes what it created.

## In practice

- Default to scoped for services that touch a database or the current request, singleton for stateless or thread-safe shared objects, transient for cheap helpers.
- Group registrations in extension methods named `Add{Feature}` on `IServiceCollection`, the convention the framework itself uses (`AddRazorComponents`, `AddDbContext`).
- Do not inject `IServiceProvider` and call `GetService` in business code. This "service locator" hides what a class needs and makes tests build a whole provider. The scope factory pattern above and factory registrations are the accepted exceptions.
- Do not store `HttpContext` in a field; inject `IHttpContextAccessor` only where you truly need it and read `HttpContext` at call time.
- A constructor with many parameters is a design smell (too many responsibilities), not a DI problem.

## Check yourself

1. Which lifetime gives every class in one request the same instance, and why is singleton not the same thing?
2. Why does a captive dependency often pass every test on your laptop and fail only in production?
3. You register `IPaymentGateway` twice. What does a constructor asking for `IPaymentGateway` get, and what does one asking for `IEnumerable<IPaymentGateway>` get?
4. How would you add logging around every call of `ICartService` without changing `CartService`?
