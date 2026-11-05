# Tracking and Query Performance

After this lesson you can see the SQL EF Core sends, spot and remove N+1 queries, decide between `Include`, a projection and a split query, turn off tracking for reads, and update many rows without loading them. These are the changes that fix most slow EF Core endpoints, and none of them needs raw SQL.

## Coming from PHP/Magento

You have met N+1 already: a product collection loaded once, then `$productRepository->getById()` or `$product->getCategory()` inside a `foreach`, one query per row. EF Core reproduces it in two ways: a query inside a loop, and **lazy loading**, where touching a navigation property silently runs a query. Microsoft recommends avoiding lazy loading for exactly that reason.

The other habit to drop is "load the entity, then pick fields". Magento collections tempt you to `addAttributeToSelect('*')`; in EF Core loading full tracked entities for a read-only list costs columns, memory and change-tracking work. The first step is always to look at the SQL.

## See the SQL first

```csharp
// ... in Program.cs
builder.Services.AddDbContext<CatalogDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("Catalog"))
        .LogTo(Console.WriteLine, LogLevel.Information));
```

`LogTo` prints every executed command (`LogLevel` comes from `Microsoft.Extensions.Logging`). EF Core does not log parameter values unless you call `EnableSensitiveDataLogging()`, which belongs in development only. In production the same messages flow through `ILogger` under the `Microsoft.EntityFrameworkCore.Database.Command` category. Count the statements per request: if a list of 50 rows produces 51, you have N+1.

## N+1 and its three fixes

```csharp
// ... N+1: one query for orders, then one per order
var orders = await db.Orders.Where(o => o.CreatedAt >= since).ToListAsync(cancellationToken);
foreach (var order in orders)
{
    var lines = await db.OrderLines.Where(l => l.OrderId == order.Id).ToListAsync(cancellationToken);
    // ...
}
```

1. **Eager loading** with `Include` fetches the related rows in the same query: `db.Orders.Include(o => o.Lines)`. Filtered includes limit them: `.Include(o => o.Lines.Where(l => l.Quantity > 0))`.
2. **Projection** with `Select` fetches only the columns the response needs, related data included, in one statement. For read endpoints this is usually the best option:

```csharp
// ... db, since and cancellationToken come from the handler
var summaries = await db.Orders
    .Where(o => o.CreatedAt >= since)
    .OrderBy(o => o.Id)
    .Select(o => new OrderSummary(o.Id, o.CustomerEmail, o.Lines.Count, o.Lines.Sum(l => l.Quantity * l.UnitPrice)))
    .ToListAsync(cancellationToken);

public record OrderSummary(int Id, string CustomerEmail, int LineCount, decimal Total);
```

3. **Split queries** for several collections. `Include(b => b.Posts).Include(b => b.Contributors)` in one SQL statement returns the cross product of both collections per row, the "cartesian explosion". `AsSplitQuery()` loads each collection in its own statement instead:

```csharp
// ...
var products = await db.Products
    .Include(p => p.Images)
    .Include(p => p.Reviews)
    .AsSplitQuery()
    .ToListAsync(cancellationToken);
```

Split queries cost one round trip per collection and give no consistency guarantee across the statements if data changes in between. EF Core warns when a single query loads several collections and you have not chosen a mode; choose per query, or globally with `UseQuerySplittingBehavior`.

## Tracking or no tracking

By default, queries that return entities are **tracked**: EF Core does identity resolution and stores a snapshot of each entity so `SaveChangesAsync` can find changes. For read-only results that work is wasted:

```csharp
// ...
var products = await db.Products
    .AsNoTracking()
    .Where(p => p.Stock > 0)
    .ToListAsync(cancellationToken);
```

In Microsoft's own benchmark (10 blogs with 20 posts each), the no-tracking query took about 0.71 of the time and roughly 61% of the allocations. Two details: a projection to a DTO with no entity inside is not tracked anyway, and a no-tracking query returns a separate instance for each occurrence of the same row, unless you use `AsNoTrackingWithIdentityResolution()`. An app that is mostly reads can set `UseQueryTrackingBehavior(QueryTrackingBehavior.NoTracking)` and opt in with `AsTracking()` where it writes.

## Bulk changes without loading

```csharp
// ... One UPDATE statement, no entities loaded
int updated = await db.Products
    .Where(p => p.CategoryId == categoryId)
    .ExecuteUpdateAsync(setters => setters.SetProperty(p => p.Price, p => p.Price * 1.05m), cancellationToken);

await db.Products.Where(p => p.Stock == 0 && p.Discontinued).ExecuteDeleteAsync(cancellationToken);
```

`ExecuteUpdateAsync` and `ExecuteDeleteAsync` run immediately, bypass the change tracker and return the affected row count. Tracked entities in the same context keep their old values, so do not mix them with `SaveChangesAsync` changes on the same rows.

## Paging and streaming

- `Skip`/`Take` makes the database walk past every skipped row. For "next page" navigation, Microsoft recommends **keyset pagination**: remember the last key and ask for `Where(p => p.Id > lastId).OrderBy(p => p.Id).Take(20)`. Always order by something unique.
- Large exports can stream with `await foreach (var row in query.AsAsyncEnumerable())` instead of buffering a whole list.
- Indexes still decide speed: on SQL Server, `StartsWith` can use an index and `EndsWith` cannot. Check the query plan in your database tools.

## In practice

- Read endpoints: `Select` into a DTO, always with an order and a limit. Write endpoints: load tracked entities, change, save.
- Turn on `LogTo` (or the `Database.Command` log category) in development and in integration tests; a test that counts SQL statements catches N+1 regressions.
- Usual mistakes: lazy-loading proxies enabled "for convenience", `ToListAsync()` before `Where` (the filter then runs in memory on every row), returning tracked entity graphs to the serializer, and `AsSplitQuery` everywhere without measuring.

## Check yourself

1. A page shows 20 orders and produces 21 SQL statements. Name two ways to bring it to one.
2. When would `AsSplitQuery()` make a query slower than the single-query version?
3. Why does a projection to a record need no `AsNoTracking()`?
