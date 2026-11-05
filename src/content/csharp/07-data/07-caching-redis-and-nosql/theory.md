# Caching, Redis and NoSQL

After this lesson you can choose between `IMemoryCache`, `IDistributedCache` backed by Redis and `HybridCache`, write a cached read with a sensible key and expiration, invalidate it when data changes, and decide when a document or key-value store is a better primary database than SQL.

## Coming from PHP/Magento

Magento gives you layers out of the box: Redis as the cache backend (and often for sessions), Varnish as the full page cache in front, and cache tags so that saving a product cleans every entry tagged with it. PHP-FPM has no memory that survives a request, so every cache in Magento is out of process.

ASP.NET Core adds one layer Magento never had: **in-process memory**. Because the app is a long-running process, `IMemoryCache` can keep objects between requests with no network hop. That is the trap as well: each instance has its own copy. Behind a load balancer, instance A can serve a price that instance B already invalidated. The closest equivalents of Magento's setup are `HybridCache` with Redis (memory per instance plus a shared Redis layer, with tags) and the output caching middleware for whole responses, which plays a role similar to Varnish.

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

`RemoveAsync(key)` and `RemoveByTagAsync("products")` invalidate entries, which is how you mirror Magento's tag cleaning. Two precise limits from the docs: tag removal is **logical** (old values stay stored but are treated as misses until they expire), and invalidation reaches the current server and Redis, but **not the in-memory layer of other servers**. That is why `LocalCacheExpiration` is shorter than `Expiration`: it bounds how long another instance can serve a stale value. Keys are opaque strings, so use a delimiter (`product:{sku}`) and identifiers you control.

The factory's result is cached whatever it is, including `null` for an unknown SKU. A `GET` for a product that does not exist yet stores that miss for the full expiration, so a product created a minute later still reads as missing unless the create also removes the key. Either remove the key on every write that can change the answer (create, update, delete), or give misses a much shorter expiration than hits.

The cached value here is a DTO, not a tracked entity: caching entities would leak a `DbContext`'s change-tracking state across requests.

## When NoSQL fits better than SQL

Caching keeps SQL as the source of truth. Sometimes the primary store should be different:

| Need | Good fit | Why |
| --- | --- | --- |
| Orders, payments, stock | Relational (SQL Server, PostgreSQL) | Transactions across rows, constraints, ad-hoc reporting |
| A product document with variable attributes, read and written as one unit | Document store (Azure Cosmos DB, MongoDB) | No joins or EAV; the aggregate is one document, partitioned by key |
| Sessions, counters, rate limits, short-lived data | Key-value (Redis) | Very fast single-key operations with expiration |

EF Core reaches some document stores too: Microsoft maintains a provider for Azure Cosmos DB for NoSQL, and MongoDB maintains `MongoDB.EntityFrameworkCore`. Do not expect relational habits to carry over: you model each document around how it is read and written, and the provider docs ask you to learn the database itself before the EF Core layer. A middle path many teams take first is a relational database with JSON columns; EF Core 10 maps complex types to JSON (`ComplexProperty(...).ToJson()`), which covers "flexible attributes" without a second database.

## In practice

- Cache reads that are expensive and change rarely: category trees, product detail, configuration. Code must still work when the cache is empty.
- New code: `HybridCache`, with Redis once you run more than one instance. `IMemoryCache` remains fine for small per-instance data such as a parsed lookup table.
- Invalidate on write, close to `SaveChangesAsync`, and keep expirations as the safety net.
- Usual mistakes: caching per-user data under a shared key, unbounded memory caches, caching entities or mutable objects, caching a "not found" result without removing it when the item is created, and treating Redis as a durable primary database without configuring persistence.

## Status as of 2026-11-05

- `Microsoft.Extensions.Caching.Hybrid` 10.11.0 (2026-10-14) on NuGet; the library also supports .NET Framework 4.7.2 and .NET Standard 2.0.

## Check yourself

1. Three API instances use `IMemoryCache` for prices. An admin changes a price on instance A. What do users see, and how does `HybridCache` with Redis change that?
2. Why does `HybridCache` call the factory only once when 100 requests miss the same key together, while `IMemoryCache.GetOrCreateAsync` may call it 100 times?
3. A product has 300 optional attributes that differ per category. Which options would you evaluate before adding a document database?
