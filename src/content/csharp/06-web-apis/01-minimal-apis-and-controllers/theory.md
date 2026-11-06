# Minimal APIs and Controllers

ASP.NET Core gives you two ways to write HTTP endpoints: minimal APIs (`app.MapGet(...)` with a handler) and controllers (classes that derive from `ControllerBase`). After this lesson you can write the same endpoint in both styles, explain what each one does at runtime, organize a minimal API so it does not end up as one 900-line `Program.cs`, and pick a style for a new project or for a job interview.

You need: 05/01 (requests, responses and `MapGet`), 05/02 (lifetimes and constructor injection), 02/03 (records, interfaces and attributes), 02/05 (pattern matching, primary constructors and extension methods) and 04/05 (`Interlocked`).

## A minimal API endpoint

A handler is any delegate: a lambda, a local function or a static method. ASP.NET Core inspects its parameters to decide where each value comes from (the next lesson covers the rules) and turns the return value into a response: a string becomes `text/plain`, an object becomes JSON with status 200, and an `IResult` decides the status itself.

```csharp
using Microsoft.AspNetCore.Http.HttpResults;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddSingleton<IProductStore, InMemoryProductStore>();
var app = builder.Build();

app.MapGet("/products/{sku}", Results<Ok<Product>, NotFound> (string sku, IProductStore store) =>
    store.Find(sku) is { } product ? TypedResults.Ok(product) : TypedResults.NotFound());

app.Run();

public record Product(string Sku, string Name, decimal Price);

public interface IProductStore
{
    Product? Find(string sku);
}

// InMemoryProductStore : IProductStore ...
```

`TypedResults` returns concrete types (`Ok<Product>`, `NotFound`), and the `Results<T1, T2>` return type lists every outcome. The compiler rejects a branch that returns something not listed, and OpenAPI (06/04) reads the possible responses from the signature. Microsoft's responses page prefers `TypedResults` over `Results` for that reason, and because typed results are easier to assert in unit tests.

## Handlers are built once

A minimal API handler is a delegate built **once at startup** and shared by every request on many threads. Anything a lambda captures from `Program.cs` therefore behaves like a static field:

```csharp
// ... builder and app created as usual
var requestCount = 0;

// Bug: every request on every thread increments the same variable without synchronization.
app.MapGet("/stats/unsafe", () => ++requestCount);

// Fix: keep shared state in a registered service that is safe for concurrent use.
app.MapGet("/stats", (RequestCounter counter) => counter.Increment());

public sealed class RequestCounter
{
    private int _count;
    public int Increment() => Interlocked.Increment(ref _count);
}
```

`RequestCounter` is registered with `builder.Services.AddSingleton<RequestCounter>()`. Dependencies belong in handler parameters, resolved from DI per request (05/02), not in captured locals. Controllers are different: the framework creates a controller instance per request and disposes it afterwards.

## The same endpoint as a controller

```csharp
using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("products")]
public class ProductsController(IProductStore store) : ControllerBase
{
    [HttpGet("{sku}")]
    public ActionResult<Product> Get(string sku)
    {
        var product = store.Find(sku);
        if (product is null)
        {
            return NotFound();
        }

        return product;
    }
}
```

`Program.cs` then needs `builder.Services.AddControllers()` and `app.MapControllers()`. The class uses a primary constructor, so `store` is injected per request. `[ApiController]` switches on API conventions: attribute routing is required, invalid model state returns 400 automatically, parameters get inferred binding sources, and error status codes produce Problem Details. Derive from `ControllerBase`, not `Controller`: `Controller` adds Razor view support, which an API does not use.

## Organizing a minimal API

A real catalog has a dozen endpoints. Group them by resource with `MapGroup`, which applies a prefix and shared metadata (tags, authorization, filters) once, and move each group into an extension method in its own file:

```csharp
public static class ProductEndpoints
{
    public static RouteGroupBuilder MapProductEndpoints(this IEndpointRouteBuilder routes)
    {
        var group = routes.MapGroup("/products").WithTags("Products");

        group.MapGet("/{sku}", GetBySku).WithName("GetProduct");
        // group.MapPost("/", Create); ...

        return group;
    }

    static Results<Ok<Product>, NotFound> GetBySku(string sku, IProductStore store) =>
        store.Find(sku) is { } product ? TypedResults.Ok(product) : TypedResults.NotFound();
}

// Program.cs: app.MapProductEndpoints();
```

Named static methods also make handlers unit-testable without HTTP, and they are where .NET 10 reads XML doc comments for OpenAPI (lambdas carry none).

## Common mistakes

- **Capturing mutable state in a handler lambda.** A `List<Order>` declared in `Program.cs` and appended to from `MapPost` is shared by all requests: data leaks between users, and concurrent `Add` calls can corrupt the list. Keep state in a thread-safe registered service.
- **Every endpoint inline in `Program.cs`.** The file grows to hundreds of lines and merge conflicts follow. Use `MapGroup` and an extension method per resource from the start.
- **Leaving out `[ApiController]` or deriving from `Controller`.** Without the attribute, invalid input reaches the action instead of returning 400. Derive from `ControllerBase` and add `[ApiController]`.
- **`Results.Ok(...)` everywhere.** The handler returns plain `IResult`, so OpenAPI cannot list its responses. Use `TypedResults`.

## In practice

Microsoft's APIs overview page states it directly: "For new projects, we recommend using Minimal APIs." It lists simpler syntax, lower overhead and easier testing. It keeps controllers as the alternative for large applications with complex business logic, teams that already know MVC, and specific MVC features: custom model binders (`IModelBinder`), `IModelValidator`, application parts and the application model, and OData.

How to decide:

- **New service, your choice**: minimal APIs with route groups and `TypedResults`. This track's projects use them.
- **Existing controller codebase**: keep controllers. Mixing both in one app works (`MapControllers` and `MapGet` coexist), but one style per codebase is easier to read.
- **Job market**: in this track's sample of 69 postings, 64% asked for Web API/REST and 23% named MVC explicitly. Much of the code you will maintain is controller-based, so you need to read both fluently.

## Check yourself

1. A colleague stores a `List<Order>` in a local variable of `Program.cs` and appends to it from a `MapPost` lambda. What goes wrong under load, and where should that state live?
2. What does `[ApiController]` change compared with a plain controller class?
3. When would you keep or choose controllers for a new API, according to Microsoft's own list?
4. Why does `Results<Ok<Product>, NotFound>` give you more than returning `IResult`?
