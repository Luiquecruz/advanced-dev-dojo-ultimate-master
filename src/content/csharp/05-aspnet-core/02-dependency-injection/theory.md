# Dependency Injection and Service Lifetimes

After this lesson you can register services in the built-in container with the right lifetime, spot a captive dependency before it reaches production, and translate the Magento `di.xml` ideas you already know (preferences, virtual types, plugins) into what .NET offers and what it does not.

## Coming from PHP/Magento

Magento DI looks familiar from the consumer side: classes ask for interfaces in their constructor, and `di.xml` maps an interface to a class with a `<preference>`. That transfers directly.

The registration side is different:

| Magento | ASP.NET Core |
| --- | --- |
| `<preference for="I" type="C"/>` in XML, merged across modules | `builder.Services.AddScoped<I, C>()` in C#, in the order the code runs |
| `shared="false"` or the default shared instance per request | three explicit lifetimes: transient, scoped, singleton |
| `<virtualType>` | a factory registration or a keyed service |
| generated `Factory` and `Proxy` classes | `IServiceScopeFactory`, `Func` registrations, or plain `new` for value objects |
| before/after/around plugins on any public method | no interception; decorators are registered by hand |
| `ObjectManager::getInstance()` (discouraged) | `IServiceProvider.GetService` (also discouraged: a service locator) |

The trap is the lifetime. In Magento a "shared" object lives until the request ends, because the process ends. In .NET a singleton lives as long as the process, and the container will happily hand a short-lived object to a long-lived one if you ask it to.

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

`CartService` uses a primary constructor (C# 12): the parameters are captured and available in every member. The container calls the public constructor and fills each parameter from its registrations. Minimal API handlers get services the same way: `ICartService carts` is resolved from the request's scope because the type is registered. Controllers use constructor injection exactly like `CartService`.

## The three lifetimes

- **Transient**: a new instance every time it is requested. In apps that process requests, transient services are disposed at the end of the request. Use it for light, stateless helpers.
- **Scoped**: one instance per scope. ASP.NET Core creates a scope per request, so this is "one per HTTP request", the closest match to Magento's shared instance. `AddDbContext` registers EF Core contexts as scoped by default.
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

Registering the same service type twice does not fail. The last registration wins when you ask for `IPaymentGateway`, and both are returned when you ask for `IEnumerable<IPaymentGateway>`. That is the same "last one wins" you know from `di.xml` merging, except the order is the order of your C# calls, not module sequence.

Library code uses `TryAddScoped`, `TryAddSingleton` and friends (namespace `Microsoft.Extensions.DependencyInjection.Extensions`), which register only if nothing is registered yet, so the application can override the default by registering first.

When you need several implementations of one interface chosen by name (a Magento virtual type per carrier, for example), use keyed services, available since .NET 8:

```csharp
// ... IShippingRates and its implementations omitted
builder.Services.AddKeyedSingleton<IShippingRates, CorreiosRates>("correios");
builder.Services.AddKeyedSingleton<IShippingRates, FedexRates>("fedex");

app.MapGet("/rates/fedex", ([FromKeyedServices("fedex")] IShippingRates rates) =>
    rates.Quote());
```

## No plugins: decorators instead

The built-in container has no interception. There is no equivalent of an around plugin that wraps an arbitrary public method of any class. For HTTP cross-cutting concerns you use middleware (lesson 05) and endpoint filters (module 06). For a service, write a decorator: a class that implements the same interface, receives the inner implementation, and adds behavior. You wire it with a factory registration; third-party containers and libraries can automate this, but the built-in one does not.

## In practice

- Default to scoped for services that touch a database or the current request, singleton for stateless or thread-safe shared objects, transient for cheap helpers.
- Group registrations in extension methods named `Add{Feature}` on `IServiceCollection`, the convention the framework itself uses (`AddRazorComponents`, `AddDbContext`).
- Do not inject `IServiceProvider` and call `GetService` in business code. It hides dependencies, the same reason Magento discourages `ObjectManager`. The scope factory pattern above is the accepted exception.
- Do not store `HttpContext` in a field; inject `IHttpContextAccessor` only where you truly need it and read `HttpContext` at call time.
- A constructor with many parameters is a design smell (too many responsibilities), not a DI problem.

## Check yourself

1. Which lifetime is the closest match to an object shared through the Magento object manager during one request, and why is singleton not?
2. Why does a captive dependency often pass every test on your laptop and fail only in production?
3. You register `IPaymentGateway` twice. What does a constructor asking for `IPaymentGateway` get, and what does one asking for `IEnumerable<IPaymentGateway>` get?
4. How would you add logging around every call of `ICartService` without plugins?
