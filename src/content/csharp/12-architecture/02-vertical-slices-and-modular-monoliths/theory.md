# Vertical Slices and Modular Monoliths

After this lesson you can organize an ASP.NET Core application by feature instead of by technical layer, split a monolith into modules with enforced boundaries inside one deployable, and choose between layers, slices and modules for a given codebase.

## Coming from PHP/Magento

Magento is closer to a modular monolith than to a layered app. Each `app/code/Vendor/Module` folder carries its own `etc/di.xml`, `routes.xml`, `db_schema.xml`, controllers and models, and the whole store still ships as one deployment. What Magento does not give you is a boundary: every module shares one database, joins other modules' tables freely, and a plugin can intercept any public method of any other module. Over time, "modules" become a folder convention over one big ball of shared state.

A .NET modular monolith keeps Magento's good part (one deployable, feature-shaped folders) and adds what was missing: each module is its own project, its internals are `internal`, other modules reach it only through a small public contract, and its tables live in its own schema. The compiler and the database schema enforce what Magento left to code review.

## Layers cut horizontally, slices cut vertically

Lesson 01 split code by technical concern: endpoints in one project, use cases in another, EF Core in a third. Adding one feature ("get a product by SKU") touches all of them. A **vertical slice** groups everything one request needs, from the endpoint to the query, in one place. Jimmy Bogard, who popularized the term, sums it up as "minimize coupling between slices, and maximize coupling in a slice."

```
Catalog.Api/
  Features/
    Products/
      GetProductBySku.cs
      CreateProduct.cs
      AdjustStock.cs
    Categories/
      ListCategories.cs
  Program.cs
```

One slice, one file: request, response, endpoint and handler.

```csharp
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.EntityFrameworkCore;

namespace Catalog.Api.Features.Products;

public static class GetProductBySku
{
    public sealed record Response(string Sku, string Name, decimal Price);

    public static RouteHandlerBuilder MapGetProductBySku(this RouteGroupBuilder group) =>
        group.MapGet("/{sku}", Handle);

    private static async Task<Results<Ok<Response>, NotFound>> Handle(
        string sku, CatalogDbContext db, CancellationToken ct)
    {
        var product = await db.Products
            .Where(p => p.Sku == sku)
            .Select(p => new Response(p.Sku, p.Name, p.Price))
            .SingleOrDefaultAsync(ct);

        return product is null ? TypedResults.NotFound() : TypedResults.Ok(product);
    }
}
```

Returning the `RouteHandlerBuilder` lets the caller add metadata to that one endpoint. `Program.cs` only composes the slices, using a route group (`MapGroup`) for the shared prefix and tags:

```csharp
var products = app.MapGroup("/products").WithTags("Products");
products.MapGetProductBySku();
products.MapCreateProduct().RequireAuthorization("admin"); // this endpoint only
// ...
```

Each slice picks the simplest approach that works. A read slice projects straight from the `DbContext`; a write slice with real rules calls a domain object (lesson 03). There is no mandatory repository or service layer to pass through, so there is nothing to keep in sync. The price: the team must notice when logic is duplicated across slices and move it into a shared domain type. Bogard names that as the main drawback: the style assumes a team that recognizes code smells and refactors.

## Modular monolith: modules with real boundaries

A **module** is a larger unit than a slice: a business capability (Catalog, Inventory, Ordering) with its own data, its own internal slices or layers, and a public contract. All modules run in one process and deploy together.

```
src/
  Host/                          ← ASP.NET Core app, Program.cs
  Modules/
    Inventory/
      Inventory.Contracts/       ← public interfaces and DTOs only
      Inventory/                 ← internal implementation, references Contracts
    Ordering/
      Ordering/                  ← references Inventory.Contracts, never Inventory
```

The contract is the only thing other modules may reference:

```csharp
namespace Inventory.Contracts;

public interface IStockReader
{
    Task<int> GetAvailableAsync(string sku, CancellationToken ct);
}
```

The module registers itself and keeps its tables in its own schema, including its own migrations history table:

```csharp
using Inventory.Contracts;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Inventory;

public static class InventoryModule
{
    public static IServiceCollection AddInventoryModule(this IServiceCollection services, IConfiguration config)
    {
        services.AddDbContext<InventoryDbContext>(options =>
            options.UseNpgsql(
                config.GetConnectionString("Main"),
                npgsql => npgsql.MigrationsHistoryTable("__EFMigrationsHistory", "inventory")));
        services.AddScoped<IStockReader, StockReader>();
        return services;
    }
}

internal sealed class InventoryDbContext(DbContextOptions<InventoryDbContext> options) : DbContext(options)
{
    protected override void OnModelCreating(ModelBuilder modelBuilder) =>
        modelBuilder.HasDefaultSchema("inventory");
    // ...
}
```

Rules that keep the boundary honest:

- **No cross-module table access.** Ordering never queries `inventory.stock_items`; it calls `IStockReader` or reacts to an event. One physical database is fine; one shared schema is not.
- **Internal by default.** Entities, `DbContext`, handlers: all `internal`. Tests reach them with `[assembly: InternalsVisibleTo("Inventory.Tests")]`.
- **Talk in-process, asynchronously when you can.** A synchronous call through a contract is a method call. For "something happened" (an order placed), publish an event through an in-process dispatcher or the outbox from module 10, so the module could later move out of the process without rewriting its callers.

## In practice

| Choose | When |
| --- | --- |
| Layers / Clean Architecture | One domain of moderate size, a team used to it, rich rules that benefit from an isolated Core |
| Vertical slices | Many independent use cases, mostly reads and simple writes, frequent feature changes |
| Modular monolith | Several business capabilities and teams in one codebase, boundaries still moving, one deployment acceptable |

They combine: modules on the outside, slices inside each module, and a small domain model where the rules are hard. A modular monolith is also the cheapest way to find the boundaries a future microservice would need (lesson 05).

Usual mistakes: a `Shared` or `Common` project that grows into a second monolith every module depends on; modules that reference each other's implementation projects; one `DbContext` mapping every table "to make joins easy", which silently removes the boundary.

## Status as of 2026-11-05

- The research found no written Microsoft guidance on vertical slices or modular monoliths as of 2026-11-05; the official material is the video "On .NET Live: Clean Architecture, Vertical Slices, and Modular Monoliths (Oh My!)" with Steve Smith (Ardalis), whose modular monolith demo uses the RiverBooks sample.
- Route groups (`MapGroup`) are documented for ASP.NET Core 7.0 and later, including 10.0.

## Check yourself

- Adding a "discontinue product" feature: list the files you touch in a layered solution and in a sliced one.
- Why give each module its own schema and migrations history table instead of one shared `DbContext`?
- What does `Ordering` reference to read stock, and what must it never reference?
- When would you stop adding slices and extract shared logic into a domain type?
