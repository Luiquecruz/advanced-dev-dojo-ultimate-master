# EF Core Basics

After this lesson you can map C# classes to tables with a `DbContext`, register it in ASP.NET Core, query it with LINQ that EF Core translates to SQL, and save changes through the change tracker. You will know what one `DbContext` instance represents and why it lives for exactly one request.

You need: 07/01 (tables, keys and SQL), 03/02 and 03/03 (LINQ and `IQueryable`), 05/02 (scoped lifetime), 05/03 (connection strings), 02/02 (nullable reference types and `null!`) and 02/05 (primary constructors).

## What an ORM does

Writing SQL and reading rows by hand (07/01) works, but every query repeats the same mapping between columns and properties. An **object-relational mapper** (ORM) does that mapping for you: you describe how classes map to tables once, query with LINQ, and the ORM writes the SQL. EF Core is the ORM Microsoft ships for .NET.

Its central object is the `DbContext`, a **unit of work**: one session with the database that remembers every entity it loaded. You change plain C# objects, and a single `SaveChangesAsync()` writes every pending insert, update and delete, in one transaction by default. One context is meant to live for one request, which is what `AddDbContext` does by registering it as **scoped**.

## Entities and the DbContext

```csharp
using Microsoft.EntityFrameworkCore;

public class Category
{
    public int Id { get; set; }
    public required string Name { get; set; }
    public List<Product> Products { get; } = [];
}

public class Product
{
    public int Id { get; set; }
    public required string Sku { get; set; }
    public required string Name { get; set; }
    public decimal Price { get; set; }
    public int Stock { get; set; }
    public int CategoryId { get; set; }
    public Category Category { get; set; } = null!;
}

public class CatalogDbContext(DbContextOptions<CatalogDbContext> options) : DbContext(options)
{
    public DbSet<Product> Products => Set<Product>();
    public DbSet<Category> Categories => Set<Category>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Product>(product =>
        {
            product.Property(p => p.Sku).HasMaxLength(64);
            product.HasIndex(p => p.Sku).IsUnique();
            product.Property(p => p.Price).HasPrecision(12, 2);
        });
    }
}
```

Conventions do most of the mapping: a property named `Id` is the primary key, `CategoryId` plus the `Category` navigation form a foreign key, and `Products` is the other side of the one-to-many relationship. With nullable reference types on, a non-nullable `string` becomes a `NOT NULL` column. `OnModelCreating` (the Fluent API) adds what conventions cannot guess: lengths, precision, indexes. Attributes such as `[MaxLength(64)]` are an alternative; teams usually pick one style.

The constructor takes `DbContextOptions<CatalogDbContext>`: that is how the provider and connection string configured at startup reach the context.

## Registration and lifetime

```csharp
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContext<CatalogDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("Catalog")));
// SQL Server instead: options.UseSqlServer(...) from Microsoft.EntityFrameworkCore.SqlServer
```

`UseNpgsql` comes from the `Npgsql.EntityFrameworkCore.PostgreSQL` package and `UseSqlServer` from `Microsoft.EntityFrameworkCore.SqlServer`; one context instance uses one provider. `AddDbContext` registers the context as scoped, so each HTTP request gets its own instance, disposed at the end of the request.

A `DbContext` is **not thread-safe**. Never start two queries on the same instance without awaiting the first (`Task.WhenAll` over one context throws "A second operation started on this context..."), and never capture it in a singleton or a background task. Code that needs several units of work, or work outside a request, either registers `AddDbContextFactory` and creates and disposes contexts explicitly, or creates a DI scope per unit of work and resolves the scoped `DbContext` from it (module 10 uses the scope approach for background services).

## Querying: LINQ becomes SQL

```csharp
// ... in Program.cs, after var app = builder.Build();
app.MapGet("/products", async (CatalogDbContext db, decimal? maxPrice, CancellationToken cancellationToken) =>
{
    var query = db.Products.AsQueryable();
    if (maxPrice is not null)
    {
        query = query.Where(p => p.Price <= maxPrice);
    }

    return await query
        .OrderBy(p => p.Sku)
        .Select(p => new { p.Sku, p.Name, p.Price, Category = p.Category.Name })
        .ToListAsync(cancellationToken);
});
```

Nothing runs until `ToListAsync`: EF Core then translates the whole expression (filter, order, the join implied by `p.Category.Name`, the projection) into one SQL statement and sends it with `maxPrice` as a parameter. Lesson 03/03 covers why this works only on `IQueryable`. If part of a `Where` cannot be translated, for example a call to your own C# method, EF Core throws at runtime instead of silently loading the table; only the final `Select` may run C# on the client.

Common terminal operators: `ToListAsync`, `FirstOrDefaultAsync`, `SingleAsync`, `AnyAsync`, `CountAsync`. Use the async versions in web code. `FindAsync(id)` looks up by primary key and returns an already-tracked instance without a round trip if the context has it.

## Saving: the change tracker

```csharp
// ... inside a handler that received db, sku, quantity and cancellationToken
var product = await db.Products.SingleAsync(p => p.Sku == sku, cancellationToken);
product.Stock -= quantity;

db.Products.Add(new Product { Sku = "MUG-02", Name = "Mug", Price = 9.90m, CategoryId = product.CategoryId });

await db.SaveChangesAsync(cancellationToken);
```

Entities returned by a query are **tracked**: EF Core keeps a snapshot, compares it on `SaveChangesAsync`, and generates an `UPDATE` with only the changed columns. `Add` marks a new entity for `INSERT` (the database-generated `Id` is filled in afterwards) and `Remove` marks one for `DELETE`. All of it is applied in one transaction.

## Common mistakes

- **Forgetting `SaveChangesAsync`.** The handler changes tracked entities and returns 200, but nothing reaches the database; the changes vanish with the context. Call `SaveChangesAsync` once at the end of the unit of work.
- **`SaveChangesAsync` inside a loop.** Every iteration is a round trip and a separate transaction, so a failure halfway leaves half the rows saved. Change all entities, then save once.
- **Two queries at once on one context.** `Task.WhenAll` over the same `DbContext` throws "A second operation started on this context". Await each query, or use one context per parallel unit of work.

## In practice

- Most teams use the `DbContext` directly in handlers or in thin services. Microsoft does not require a repository on top of EF Core; a generic `IRepository<T>` mostly re-implements `DbSet<T>` with fewer features. Add a repository when you need a test seam or want to hide queries behind domain methods.
- Read-only endpoints project to DTOs with `Select` instead of returning entities; lesson 07/04 explains why that is also the fast path.

## Status as of 2026-11-05

- EF Core 10 is the current LTS release (`Microsoft.EntityFrameworkCore` 10.0.14 on NuGet, 2026-10-25). It requires .NET 10 and is supported until 2028-11-10 according to the EF Core releases page (the .NET support policy lists 2028-11-14 for the .NET 10 runtime; EF Core follows its own page).
- `Npgsql.EntityFrameworkCore.PostgreSQL` 10.0.3 targets EF Core 10. EF Core 11 is in release candidates and scheduled for November 2026.

## Check yourself

1. What does one `DbContext` instance represent, and why is scoped the right lifetime in a web API?
2. Where does the SQL for a LINQ query get generated, and at which line does it run?
3. You change three products and add one. How many calls to `SaveChangesAsync` do you need, and what guarantees do you get?
