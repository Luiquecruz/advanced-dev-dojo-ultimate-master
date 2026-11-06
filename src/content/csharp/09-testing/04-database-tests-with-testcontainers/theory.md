# Database Tests with Testcontainers

After this lesson you can run integration tests against the same database engine as production, started in a throwaway Docker container by Testcontainers, wire it into `WebApplicationFactory`, keep tests isolated with transactions, and explain why the EF Core in-memory provider is not the shortcut it looks like.

You need: 09/03 (`WebApplicationFactory`), 09/01 (`IAsyncLifetime` and collections), 07/02 (`DbContext`), 07/03 (migrations) and 07/06 (transactions).

## Why a real database

A test is only as trustworthy as what it runs against. EF Core ships an in-memory provider (`UseInMemoryDatabase`), and older tutorials use it in every test. It is not a database: it evaluates LINQ over .NET collections. Microsoft's EF Core testing guide says using it as a database fake is **highly discouraged**, and that the provider is **only supported for legacy applications**. It does not support transactions, does not run raw SQL, and supports fewer queries than a relational provider.

SQLite in memory is better but still a different engine. SQLite compares strings case-sensitively and SQL Server does not by default, so a test can pass on one and fail on the other. Provider-specific functions, such as SQL Server's `EF.Functions.DateDiffDay` or Npgsql's `EF.Functions.ILike`, fail outright on SQLite.

Microsoft's recommendation is plain: "We recommend that developers have good test coverage of their application running against their actual production database system."

## Docker in brief

Docker runs a program from an **image** (a packaged file system with the program and everything it needs) as a **container**, an isolated process with its own network and files. `docker run --rm -e POSTGRES_PASSWORD=example postgres:18` starts a PostgreSQL server without installing one (the image refuses to start without a password), and removing the container throws everything away. Lesson 11/01 builds images of your own; here you only need Docker installed and running.

## What Testcontainers does

Testcontainers for .NET (MIT) starts Docker containers from test code and removes them afterwards. It needs a Docker-API compatible runtime on the machine or CI agent. Modules wrap common images with sensible defaults: PostgreSQL, SQL Server, RabbitMQ, Redis, MongoDB and others.

```bash
dotnet add package Testcontainers.PostgreSql
```

```csharp
using Testcontainers.PostgreSql;

var postgres = new PostgreSqlBuilder("postgres:18").Build();
await postgres.StartAsync();                      // pulls the image if needed, waits until ready
var connectionString = postgres.GetConnectionString();
// ... use it
await postgres.DisposeAsync();                    // stops and removes the container
```

Each run gets a fresh server on a random host port, so tests never collide with a developer's local database. A resource reaper container (Ryuk) removes leftover containers after the test session, whether the tests passed or not.

## Wiring it into WebApplicationFactory

Combine it with lesson 09/03: the factory starts the container, points the app's `DbContext` at it and applies the real migrations from module 07.

```csharp
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Testcontainers.PostgreSql;
using Xunit;

public sealed class CatalogApiFactory : WebApplicationFactory<Program>, IAsyncLifetime
{
    private readonly PostgreSqlContainer _postgres = new PostgreSqlBuilder("postgres:18").Build();

    public async ValueTask InitializeAsync()
    {
        await _postgres.StartAsync();
        using var scope = Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<CatalogDbContext>();
        await db.Database.MigrateAsync();
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        builder.ConfigureTestServices(services =>
        {
            services.RemoveAll<IDbContextOptionsConfiguration<CatalogDbContext>>();
            services.AddDbContext<CatalogDbContext>(options =>
                options.UseNpgsql(_postgres.GetConnectionString()));
        });
    }

    public override async ValueTask DisposeAsync()
    {
        await base.DisposeAsync();
        await _postgres.DisposeAsync();
    }
}
// ... CatalogDbContext comes from the API project
```

- `IDbContextOptionsConfiguration<TContext>` is the registration `AddDbContext` adds; removing it drops the app's own provider configuration before the test adds its own, the same pattern the ASP.NET Core integration-tests page uses.
- `MigrateAsync` applies your migrations, so the tests also prove the migrations work. `EnsureCreated` would build the schema from the model and skip them.
- xUnit v3's `IAsyncLifetime` uses `ValueTask` and inherits `IAsyncDisposable`, which lines up with the factory's own `DisposeAsync`.

## Keeping tests isolated

A shared database brings back the problem of the first lesson: tests that write data interfere with each other. The EF Core docs describe three categories:

1. **Read-only tests** share seeded data and run in parallel safely.
2. **Tests that write** run inside a transaction that is never committed:

```csharp
public sealed class ProductSearchTests(CatalogApiFactory factory) : IClassFixture<CatalogApiFactory>
{
    [Fact]
    public async Task Search_MatchesNameCaseInsensitively()
    {
        var ct = TestContext.Current.CancellationToken;
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<CatalogDbContext>();
        await using var transaction = await db.Database.BeginTransactionAsync(ct);

        db.Products.Add(new Product { Sku = "SKU-SEARCH-1", Name = "Blue T-Shirt", Price = 20m });
        await db.SaveChangesAsync(ct);
        db.ChangeTracker.Clear();

        var found = await new ProductQueries(db).SearchAsync("t-shirt", ct);

        Assert.Contains(found, p => p.Sku == "SKU-SEARCH-1");
    }
}
// ... SearchAsync filters with EF.Functions.ILike(p.Name, $"%{term}%")
```

`ChangeTracker.Clear()` makes the query materialize the product from the database row, instead of handing back the instance already tracked in memory. The transaction rolls back when it is disposed. This test cannot run on the in-memory provider or SQLite, because `ILike` exists only in PostgreSQL.

3. **Tests which explicitly manage transactions** cannot be wrapped in an outer transaction, so they need cleanup after each test and must not run in parallel with each other: put them in one xUnit collection, or give each group its own database. The EF Core docs mention the Respawn package for fast cleanup. HTTP tests through the API commit too, so treat them the same way.

## Common mistakes

- **`UseInMemoryDatabase` "for speed".** It runs no SQL and has no transactions, so translation errors and constraint violations pass; Microsoft notes it is generally slower than SQLite in-memory anyway. Test against the real engine.
- **`EnsureCreated` instead of migrations.** The schema comes from the model, so a broken migration ships unnoticed. Call `MigrateAsync`.
- **Tests that depend on rows other tests inserted.** When the order changes they fail at random. Each test creates its own data with unique keys.
- **Committing writes in parallel tests.** Two classes writing the same tables race. Roll back, or serialize them in one collection.

## In practice

- Test against the real engine what only the real engine can prove: LINQ translation, migrations, unique constraints, optimistic concurrency (P3's second `PUT` with a stale row version must return 409), provider functions, raw SQL and Dapper queries.
- Keep business rules in unit tests. A database test per rule makes the suite slow for no gain.
- Start one container per test class or collection, not per test. Container startup takes seconds; queries against a local container are fast.
- Pin the image tag to the version you run in production (`postgres:18`, not `postgres:latest`).

## Check yourself

- Name three bugs a test on the EF Core in-memory provider cannot catch.
- Why does the write test call `ChangeTracker.Clear()` before querying?
- Which of your P3 tests need a real PostgreSQL, and which do not need a database at all?
