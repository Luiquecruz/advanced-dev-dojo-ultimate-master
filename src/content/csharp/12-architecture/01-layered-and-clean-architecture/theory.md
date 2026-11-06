# Layered and Clean Architecture

After this lesson you can split a .NET solution into projects whose references point the right way, explain why Clean Architecture inverts the classic UI → business → data chain, wire the pieces together in one composition root, and say when the extra projects cost more than they return.

You need: 01/04 (projects and references), 02/03 (interfaces), 05/02 (dependency injection and lifetimes), 07/02 (EF Core and `DbContext`) and 09/01 (unit tests).

## A boundary the compiler checks

An architecture is a set of rules about which code may call which. In .NET the strongest rule you can write is a **project reference**, checked by the compiler. If `Catalog.Core` does not reference `Catalog.Infrastructure`, code in Core cannot name an EF Core type, and project references cannot form a cycle. A folder is only a convention; a project boundary is enforced by the build.

Wiring is C# in `Program.cs` (the composition root), so "which implementation runs" is code you can step through.

## Layers versus tiers

A **layer** is a logical split inside one application; a **tier** is a physical deployment unit. A three-project solution deployed as one web app is N-layer, single-tier. Microsoft's architecture e-book describes the classic N-layer app as UI → BLL (business logic layer) → DAL (data access layer), and names its drawback: compile-time dependencies run top to bottom, so the business layer, which holds the most important logic, depends on data access details and often needs a database to be tested.

## Clean Architecture: invert the dependency

Clean Architecture (also called hexagonal, ports and adapters, or onion) keeps the same pieces but flips one arrow. The **Application Core** defines the interfaces it needs; **Infrastructure** implements them; the **UI** (your ASP.NET Core project) depends on Core, and references Infrastructure only to wire it up.

```bash
dotnet new classlib -n Catalog.Core
dotnet new classlib -n Catalog.Infrastructure
dotnet new web -n Catalog.Api
dotnet reference add --project Catalog.Infrastructure Catalog.Core
dotnet reference add --project Catalog.Api Catalog.Core Catalog.Infrastructure
```

Core owns the abstraction, written in domain terms:

```csharp
namespace Catalog.Core.Products;

public interface IProductRepository
{
    Task<Product?> FindBySkuAsync(string sku, CancellationToken ct);
    void Add(Product product);
    Task SaveChangesAsync(CancellationToken ct);
}
```

Infrastructure implements it with EF Core and keeps the class `internal`, so nothing outside the project can instantiate it:

```csharp
using Catalog.Core.Products;
using Microsoft.EntityFrameworkCore;

namespace Catalog.Infrastructure.Products;

internal sealed class EfProductRepository(CatalogDbContext db) : IProductRepository
{
    public Task<Product?> FindBySkuAsync(string sku, CancellationToken ct) =>
        db.Products.SingleOrDefaultAsync(p => p.Sku == sku, ct);

    public void Add(Product product) => db.Products.Add(product);

    public Task SaveChangesAsync(CancellationToken ct) => db.SaveChangesAsync(ct);
}
```

## The composition root

Infrastructure exposes one public extension method that registers its services. The API project calls it once; this is the only place the API "knows" Infrastructure exists.

```csharp
using Catalog.Core.Products;
using Catalog.Infrastructure.Products;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Catalog.Infrastructure;

public static class InfrastructureRegistration
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, string connectionString)
    {
        services.AddDbContext<CatalogDbContext>(options => options.UseNpgsql(connectionString));
        services.AddScoped<IProductRepository, EfProductRepository>();
        return services;
    }
}
```

```csharp
// Program.cs in Catalog.Api
builder.Services.AddInfrastructure(builder.Configuration.GetConnectionString("Catalog")!);
// ...
```

`UseNpgsql` comes from the `Npgsql.EntityFrameworkCore.PostgreSQL` package, referenced only by Infrastructure. Swap it for `UseSqlServer` and neither Core nor the API changes. Lifetimes follow 05/02: `AddDbContext` registers the context as scoped, so the repository is scoped too.

## What goes where

| Project | Holds | References |
| --- | --- | --- |
| Core | entities, value objects, domain services, interfaces (ports), domain events, DTOs it returns | nothing of yours |
| Infrastructure | `DbContext`, migrations, repository implementations, e-mail, file storage, HTTP clients | Core |
| API (UI) | endpoints or controllers, filters, middleware, `Program.cs` | Core, and Infrastructure for wiring |

Many teams add a fourth project, **Application**, that holds use cases (one handler per operation) between the API and the domain. Microsoft's e-book keeps use cases inside the Core; both shapes keep the same rule: arrows point inward.

## Common mistakes

- **Layers that are only folders.** With `Core/` and `Infrastructure/` as folders of one project, a domain class can call `CatalogDbContext` and the build still passes; the rule erodes one shortcut at a time. Make each layer a project.
- **Core referencing EF Core "just for one attribute".** Core now depends on a data access package, so its unit tests drag in EF Core and the inversion is gone. Put the mapping in an `IEntityTypeConfiguration<T>` in Infrastructure.
- **An API that uses `EfProductRepository` directly.** It works until you change the database, then every endpoint changes. Keep the class `internal` and depend on `IProductRepository`.

## In practice

- **Cost is real.** Each boundary adds an interface, a mapping from entity to response, and a hop to read when debugging. For a CRUD service over a few tables, one project with folders is fine; Microsoft's e-book recommends Clean Architecture for *non-trivial* monoliths, not for every service.
- **Do not wrap EF Core blindly.** `DbContext` is already a unit of work and `DbSet<T>` is already a repository. A generic `IRepository<T>` with `GetAll()` returning `IQueryable<T>` leaks EF Core into Core anyway and hides what queries run. Define narrow, use-case-shaped interfaces, or let read-only queries use the `DbContext` directly (lesson 12/04).
- **Keep Core free of framework types.** No `HttpContext`, no `IActionResult`, no EF attributes in Core. Fluent configuration (`IEntityTypeConfiguration<T>`) lives in Infrastructure.
- **Test the boundary you drew.** Core gets fast unit tests; Infrastructure gets integration tests against a real database (module 09).

## Check yourself

- Draw the project references of a Clean Architecture solution. Which single arrow differs from N-layer, and what does it buy you in tests?
- Why does the API project reference Infrastructure at all, and how do you keep that reference from spreading beyond `Program.cs`?
- Your team proposes `IRepository<T>` with `IQueryable<T> Query()` in Core. What would you push back on?
- Name a service where you would deliberately stay with a single project.
