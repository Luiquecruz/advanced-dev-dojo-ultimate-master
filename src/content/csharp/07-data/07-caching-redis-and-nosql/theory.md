# Caching, Redis and NoSQL

After this lesson you can choose between `IMemoryCache`, `IDistributedCache` backed by Redis and `HybridCache`, write a cached read with a sensible key and expiration, invalidate it when data changes, and decide when a document or key-value store is a better primary database than SQL.

You need: 07/02 (EF Core queries and projections), 05/01 (one long-running process), 05/02 (singleton and scoped services), 05/03 (connection strings) and 02/03 (records).

## Why cache, and where

A cache keeps a copy of data that is expensive to compute or fetch (a database query, a call to another service) so that the next reader gets it faster. The copy can be stale, so every cache needs a rule for when it expires and a way to remove an entry when the source changes.

ASP.NET Core offers two places to keep the copy. Because the app is a long-running process, **in-process memory** (`IMemoryCache`) can keep objects between requests with no network hop; the trap is that each instance has its own copy, so behind a load balancer instance A can serve a price that instance B already invalidated. An **out-of-process cache** such as Redis is shared by every instance, at the cost of a network call and serialization. `HybridCache` combines the two, and the output caching middleware stores whole responses.

## IMemoryCache: fast and local

```csharp
using Microsoft.Extensions.Caching.Memory;

// ... registered with builder.Services.AddMemoryCache();
public sealed class CategoryNames(IMemoryCache cache, CatalogDbContext db)
{
    public async Task<IReadOnlyList<string>> GetAsync(CancellationToken cancellationToken) =>
        await cache.GetOrCreateAsync("categories:names", async entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(10);
            return await db.Categories.OrderBy(c => c.Name).Select(c => c.Name).ToListAsync(cancellationToken);
        }) ?? [];
}
```

Rules from Microsoft's in-memory cache page that matter in practice:

- `GetOrCreateAsync` is **not atomic**: when many requests miss the same key at once, each one runs the factory (a cache stampede).
- The cache stores **references**. If code mutates an object it read from the cache, every later reader sees the change. Cache immutable objects or copies.
- Nothing limits its size unless you set `SizeLimit`, and expiration only happens when the cache is touched. Never use raw user input as a key.
- A sliding expiration alone can keep a hot entry forever; combine it with an absolute expiration.

## IDistributedCache with Redis: shared, but bytes

```csharp
// ... dotnet add package Microsoft.Extensions.Caching.StackExchangeRedis
builder.Services.AddStackExchangeRedisCache(options =>
{
    options.Configuration = builder.Configuration.GetConnectionString("Redis");
    options.InstanceName = "catalog:";
});
```

`IDistributedCache` is shared by every instance and survives restarts of the app, but its API is low level: `GetAsync`, `SetAsync`, `RefreshAsync` and `RemoveAsync` work with `byte[]`, so you serialize yourself, and every read is a network call. Microsoft recommends Redis as the distributed cache for production apps.

## HybridCache: the default choice for new code

`HybridCache` (package `Microsoft.Extensions.Caching.Hybrid`) combines both: an in-memory primary cache per instance and, when an `IDistributedCache` such as Redis is registered, a secondary shared cache. It serializes with `System.Text.Json` by default and protects against stampedes: only one concurrent caller per key runs the factory, the others wait for its result.

```csharp
using Microsoft.Extensions.Caching.Hybrid;

// ... registered with builder.Services.AddHybridCache(); plus AddStackExchangeRedisCache as above
public sealed class ProductReader(HybridCache cache, CatalogDbContext db)
{
    public async Task<ProductDto?> GetAsync(string sku, CancellationToken cancellationToken) =>
        await cache.GetOrCreateAsync(
            $"product:{sku}",
            async cancel => await db.Products
                .Where(p => p.Sku == sku)
                .Select(p => new ProductDto(p.Sku, p.Name, p.Price))
                .SingleOrDefaultAsync(cancel),
            new HybridCacheEntryOptions
            {
                Expiration = TimeSpan.FromMinutes(5),
                LocalCacheExpiration = TimeSpan.FromMinutes(1)
            },
            tags: ["products"],
            cancellationToken: cancellationToken);

    public async Task OnProductChangedAsync(string sku, CancellationToken cancellationToken) =>
        await cache.RemoveAsync($"product:{sku}", cancellationToken);
}

public sealed record ProductDto(string Sku, string Name, decimal Price);
```

`RemoveAsync(key)` and `RemoveByTagAsync("products")` invalidate entries: tag every product entry with `products` and one call clears them all. Two precise limits from the docs: tag removal is **logical** (old values stay stored but are treated as misses until they expire), and invalidation reaches the current server and Redis, but **not the in-memory layer of other servers**. That is why `LocalCacheExpiration` is shorter than `Expiration`: it bounds how long another instance can serve a stale value. Keys are opaque strings, so use a delimiter (`product:{sku}`) and identifiers you control.

The factory's result is cached whatever it is, including `null` for an unknown SKU. A `GET` for a product that does not exist yet stores that miss for the full expiration, so a product created a minute later still reads as missing unless the create also removes the key. Either remove the key on every write that can change the answer (create, update, delete), or give misses a much shorter expiration than hits.

The cached value here is a DTO, not a tracked entity: caching entities would leak a `DbContext`'s change-tracking state across requests.

## When NoSQL fits better than SQL

Caching keeps SQL as the source of truth. Sometimes the primary store should be different:

| Need | Good fit | Why |
| --- | --- | --- |
| Orders, payments, stock | Relational (SQL Server, PostgreSQL) | Transactions across rows, constraints, ad-hoc reporting |
| A product document with variable attributes, read and written as one unit | Document store (Azure Cosmos DB, MongoDB) | No joins or attribute tables; the aggregate is one document, partitioned by key |
| Sessions, counters, rate limits, short-lived data | Key-value (Redis) | Very fast single-key operations with expiration |

EF Core reaches some document stores too: Microsoft maintains a provider for Azure Cosmos DB for NoSQL, and MongoDB maintains `MongoDB.EntityFrameworkCore`. Do not expect relational habits to carry over: you model each document around how it is read and written, and the provider docs ask you to learn the database itself before the EF Core layer. A middle path many teams take first is a relational database with JSON columns; EF Core 10 maps complex types to JSON (`ComplexProperty(...).ToJson()`), which covers "flexible attributes" without a second database.

## Common mistakes

- **`IMemoryCache` across several instances.** An update invalidates the entry on one instance only, so users see the old price on the others until it expires. Use `HybridCache` with Redis and a short `LocalCacheExpiration`.
- **Per-user data under a shared key.** `cart:summary` without the user id hands one customer's cart to another. Put every value the result depends on in the key.
- **Mutating a cached object.** `IMemoryCache` returns the same reference, so a change made by one request appears in every later read. Cache immutable records or copies.
- **Caching "not found" without invalidating on create.** A new product stays missing until the miss expires. Remove the key on every write.

## In practice

- Cache reads that are expensive and change rarely: category trees, product detail, configuration. Code must still work when the cache is empty.
- New code: `HybridCache`, with Redis once you run more than one instance. `IMemoryCache` remains fine for small per-instance data such as a parsed lookup table.
- Invalidate on write, close to `SaveChangesAsync`, and keep expirations as the safety net.
- Treat Redis as a cache unless you configure its persistence deliberately; restart it in a test environment and check that the app still works.

## Status as of 2026-11-05

- `Microsoft.Extensions.Caching.Hybrid` 10.11.0 (2026-10-14) on NuGet; the library also supports .NET Framework 4.7.2 and .NET Standard 2.0.

## Check yourself

1. Three API instances use `IMemoryCache` for prices. An admin changes a price on instance A. What do users see, and how does `HybridCache` with Redis change that?
2. Why does `HybridCache` call the factory only once when 100 requests miss the same key together, while `IMemoryCache.GetOrCreateAsync` may call it 100 times?
3. A product has 300 optional attributes that differ per category. Which options would you evaluate before adding a document database?
