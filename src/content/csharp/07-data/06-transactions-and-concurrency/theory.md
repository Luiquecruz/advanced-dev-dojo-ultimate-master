# Transactions and Concurrency

After this lesson you can say which EF Core operations are already atomic, open an explicit transaction when one business operation needs several statements, and protect rows against lost updates with optimistic concurrency tokens. You will turn a concurrency conflict into an HTTP 409 and decrement stock safely without any lock in your C# code.

## Coming from PHP/Magento

The transaction API maps directly: `$connection->beginTransaction()`, `commit()` and `rollBack()` become `BeginTransactionAsync`, `CommitAsync` and disposing the transaction without committing. What changes is how often you need it, because `SaveChangesAsync` already wraps all its pending changes in a transaction.

The harder problem is the **lost update**. Two admins open the same product, both change it, and the second save silently overwrites the first. Magento's inventory reservations exist for a related reason: concurrent checkouts must not read and rewrite the same stock value. In ASP.NET Core the risk is higher than you might expect, because one process serves many requests in parallel, and a `lock` statement in C# protects nothing once you run two instances. The database has to arbitrate, and EF Core's tool for that is the concurrency token.

## What is atomic already

- One `SaveChangesAsync` call: all its inserts, updates and deletes commit together or not at all.
- One `ExecuteUpdateAsync` or `ExecuteDeleteAsync`: a single SQL statement. Two of them in a row are **two** transactions; if the second fails, the first stays applied.
- Several `SaveChangesAsync` calls, or EF Core plus Dapper, need an explicit transaction to be atomic together.

## Explicit transactions

```csharp
// ... db, order and cancellationToken come from the handler
await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);

db.Orders.Add(order);
await db.SaveChangesAsync(cancellationToken);   // order.Id is now known

await db.Products
    .Where(p => p.Sku == order.Sku)
    .ExecuteUpdateAsync(s => s.SetProperty(p => p.Stock, p => p.Stock - order.Quantity), cancellationToken);

await transaction.CommitAsync(cancellationToken);
```

If anything throws before `CommitAsync`, disposing the transaction rolls it back. Inside a transaction, EF Core creates a savepoint before each `SaveChangesAsync`, so a failed save rolls back only its own changes. Keep transactions short: never wait for an HTTP call or user input while one is open, because every row lock it holds blocks other requests.

When the context uses a retrying execution strategy (`EnableRetryOnFailure`, common on Azure SQL), a user-initiated transaction throws `InvalidOperationException` unless you run the whole block through the strategy, so that a retry replays everything:

```csharp
// ... the strategy replays the whole delegate on a transient failure
var strategy = db.Database.CreateExecutionStrategy();
await strategy.ExecuteAsync(async () =>
{
    await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);
    // ... the same work as above
    await transaction.CommitAsync(cancellationToken);
});
```

`TransactionScope` (ambient transactions) also works with SqlClient; in async code create it with `TransactionScopeAsyncFlowOption.Enabled`, or the transaction does not flow across `await`.

## Optimistic concurrency tokens

Optimistic concurrency takes no locks. A **concurrency token** is a column that EF Core adds to the `WHERE` clause of every `UPDATE` and `DELETE`; if another writer changed the row in the meantime, zero rows match and `SaveChangesAsync` throws `DbUpdateConcurrencyException`.

```csharp
using System.ComponentModel.DataAnnotations;

public class Product
{
    public int Id { get; set; }
    public required string Sku { get; set; }
    public decimal Price { get; set; }
    public int Stock { get; set; }

    [Timestamp]
    public uint Version { get; set; }   // PostgreSQL: maps to the xmin system column
    // SQL Server: [Timestamp] public byte[] Version { get; set; } maps to rowversion
}
```

Both databases change the value automatically on every update of the row. On a database without such a column you can use `[ConcurrencyCheck]` on a `Guid` that your code replaces on each save.

## From conflict to HTTP 409

In an API the client read the row in an earlier request, so it must send back the version it saw. You set that as the token's **original value**, which is what EF Core compares against:

```csharp
// ... in Program.cs
app.MapPut("/products/{sku}", async (string sku, UpdateProduct request, CatalogDbContext db, CancellationToken cancellationToken) =>
{
    var product = await db.Products.SingleOrDefaultAsync(p => p.Sku == sku, cancellationToken);
    if (product is null)
    {
        return Results.NotFound();
    }

    db.Entry(product).Property(p => p.Version).OriginalValue = request.Version;
    product.Price = request.Price;
    product.Stock = request.Stock;

    try
    {
        await db.SaveChangesAsync(cancellationToken);
        return Results.Ok(new { product.Sku, product.Version });
    }
    catch (DbUpdateConcurrencyException)
    {
        return Results.Problem(
            title: "The product was changed by another request. Reload it and try again.",
            statusCode: StatusCodes.Status409Conflict);
    }
});

public record UpdateProduct(decimal Price, int Stock, uint Version);
```

Two `PUT` requests carrying the same version: the first succeeds and gets a new version back, the second gets 409. That is the P3 acceptance test. Other resolutions exist: reload and retry automatically, or merge using `ex.Entries`, `GetDatabaseValuesAsync()` and the original values, as Microsoft's concurrency page shows.

## Atomic updates for counters

For stock you often do not need a token at all. Let the database check and change the value in one statement:

```csharp
// ... reserve stock only if enough is left
ArgumentOutOfRangeException.ThrowIfNegativeOrZero(quantity); // in an endpoint: return 400 instead

int reserved = await db.Products
    .Where(p => p.Sku == sku && p.Stock >= quantity)
    .ExecuteUpdateAsync(s => s.SetProperty(p => p.Stock, p => p.Stock - quantity), cancellationToken);

if (reserved == 0)
{
    // ... unknown SKU or not enough stock: no row was changed
}
```

The condition and the decrement run atomically in the database, so two concurrent requests can never both take the last unit. The guard comes first because `ExecuteUpdateAsync` runs immediately with no validation step: with a negative `quantity`, `Stock >= quantity` matches any product and `Stock - quantity` adds stock.

## In practice

- Default to `SaveChangesAsync` atomicity; add an explicit transaction only when one operation spans several saves or tools.
- Put a concurrency token on aggregates people edit through forms or APIs, and return 409 with Problem Details on conflict. Use conditional `ExecuteUpdateAsync` for counters and stock.
- Higher isolation levels (`BeginTransactionAsync(IsolationLevel.Serializable)`) also prevent conflicts, but they hold locks or raise serialization errors, and require the whole read-modify-write inside one transaction.
- Usual mistakes: `lock` in C# to protect database rows, long transactions around remote calls, catching `DbUpdateConcurrencyException` and saving again without reloading, and forgetting that two `ExecuteUpdateAsync` calls are not atomic together.

## Check yourself

1. Which of these are atomic on their own: one `SaveChangesAsync`, two `ExecuteUpdateAsync` calls, a `SaveChangesAsync` followed by a Dapper insert?
2. Why does setting `OriginalValue` from the request make the token work across two HTTP requests?
3. When is a conditional `ExecuteUpdateAsync` a better fit than a concurrency token?
