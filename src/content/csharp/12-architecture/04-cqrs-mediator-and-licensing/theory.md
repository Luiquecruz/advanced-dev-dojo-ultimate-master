# CQRS, Mediators and Licensing

After this lesson you can separate commands from queries in an ASP.NET Core app with a few interfaces and the built-in DI container, add cross-cutting behavior with a decorator, decide whether a mediator library earns its place, and explain the 2025 licence change of MediatR and AutoMapper to your team.

You need: 05/02 (registering services, factories), 05/04 (`ILogger`), 06/01 (minimal API endpoints), 07/02 (EF Core projections), 10/04 (the outbox) and lesson 03 of this module (the `Order` aggregate).

## CQS and CQRS

**Command-query separation (CQS)** is a method-level rule from Bertrand Meyer: a method either changes state or returns data, not both. **CQRS** applies it to the model: a *write model* (aggregates, validation, transactions) for commands and a *read model* (DTOs shaped for the screen) for queries. Commands should name business intent ("place order"), not field edits ("set status to 2").

The read model can live in a separate store, such as a denormalized table or a search index rebuilt from the write side, and then reads are briefly stale (eventual consistency). The basic form, which Microsoft's microservices e-book uses for its ordering service, keeps **one database** and splits only the code: commands go through the domain model, queries project straight to DTOs.

## Commands without a library

Two interfaces are enough:

```csharp
public interface ICommandHandler<in TCommand, TResult>
{
    Task<TResult> HandleAsync(TCommand command, CancellationToken ct);
}

public interface IQueryHandler<in TQuery, TResult>
{
    Task<TResult> HandleAsync(TQuery query, CancellationToken ct);
}
```

A command handler loads or creates the aggregate from lesson 03, calls its methods and saves:

```csharp
public sealed record PlaceOrder(Guid CustomerId, string Currency, IReadOnlyList<PlaceOrderLine> Lines);
public sealed record PlaceOrderLine(string Sku, int Quantity, decimal UnitPrice);

internal sealed class PlaceOrderHandler(OrderingDbContext db) : ICommandHandler<PlaceOrder, Guid>
{
    public async Task<Guid> HandleAsync(PlaceOrder command, CancellationToken ct)
    {
        var order = new Order(command.CustomerId, command.Currency);
        foreach (var line in command.Lines)
        {
            order.AddLine(line.Sku, line.Quantity, new Money(line.UnitPrice, command.Currency));
        }
        order.Place();

        db.Orders.Add(order);
        await db.SaveChangesAsync(ct);
        return order.Id;
    }
}
```

## Queries skip the domain model

A query handler does not load aggregates. It projects with LINQ to exactly the shape the caller needs, and EF Core translates that to one `SELECT` of those columns. A projection to a non-entity type is not tracked, so it costs no change-tracking work.

```csharp
public sealed record GetOrderSummary(Guid OrderId);
public sealed record OrderSummary(Guid Id, OrderStatus Status, decimal Total, string Currency);

internal sealed class GetOrderSummaryHandler(OrderingDbContext db)
    : IQueryHandler<GetOrderSummary, OrderSummary?>
{
    public Task<OrderSummary?> HandleAsync(GetOrderSummary query, CancellationToken ct) =>
        db.Orders
            .Where(o => o.Id == query.OrderId)
            .Select(o => new OrderSummary(o.Id, o.Status, o.Total.Amount, o.Total.Currency))
            .SingleOrDefaultAsync(ct);
}
```

When a query outgrows LINQ (a report with window functions), the read side can switch to Dapper or raw SQL (07/05) without touching the write model. That freedom is the point of the split.

## Wiring and a decorator

The endpoint injects the handler it needs. There is no dispatcher: the DI container already maps a request type to its handler.

```csharp
app.MapPost("/orders", async (PlaceOrder command, ICommandHandler<PlaceOrder, Guid> handler, CancellationToken ct) =>
{
    var id = await handler.HandleAsync(command, ct);
    return TypedResults.Created($"/orders/{id}", new { id });
});
```

Cross-cutting behavior (logging, timing, a transaction) is a **decorator**: a class that implements the same interface and wraps the real handler.

```csharp
internal sealed class LoggingCommandHandler<TCommand, TResult>(
    ICommandHandler<TCommand, TResult> inner,
    ILogger<LoggingCommandHandler<TCommand, TResult>> logger) : ICommandHandler<TCommand, TResult>
{
    public async Task<TResult> HandleAsync(TCommand command, CancellationToken ct)
    {
        logger.LogInformation("Handling {Command}", typeof(TCommand).Name);
        var result = await inner.HandleAsync(command, ct);
        logger.LogInformation("Handled {Command}", typeof(TCommand).Name);
        return result;
    }
}
```

The built-in container has no `Decorate` method, so you register the decorator with a factory:

```csharp
builder.Services.AddScoped<PlaceOrderHandler>();
builder.Services.AddScoped<ICommandHandler<PlaceOrder, Guid>>(sp =>
    new LoggingCommandHandler<PlaceOrder, Guid>(
        sp.GetRequiredService<PlaceOrderHandler>(),
        sp.GetRequiredService<ILogger<LoggingCommandHandler<PlaceOrder, Guid>>>()));
builder.Services.AddScoped<IQueryHandler<GetOrderSummary, OrderSummary?>, GetOrderSummaryHandler>();
```

The wrapping is explicit, visible in `Program.cs`, and limited to the interfaces you chose.

## Where MediatR fits, and its licence

MediatR implements the mediator pattern: endpoints send a request object to `IMediator`, which finds the handler and runs a pipeline of behaviors around it. You will meet it in many existing .NET codebases, including Microsoft's current `dotnet/eShop` sample, which references MediatR 13.1.0, a release under the new licence (as of 2026-11-05). It saves the registration lines above and adds indirection: "go to definition" on `mediator.Send(command)` does not lead to the handler.

On 2025-07-02 its author announced commercial editions. **MediatR v13.0 and AutoMapper v15.0** are the first releases under a dual licence: Reciprocal Public License 1.5 (RPL-1.5) plus the Lucky Penny Software commercial licence, tiered by developer count. A free Community edition covers companies under USD 5 million gross annual revenue, non-profits under USD 5 million budget, education and non-production use, and still requires registering for a licence key. Earlier releases keep the licence they shipped with. Whether later majors use the same terms is assumed, not verified.

What to do in a team:

- **New code:** the interfaces above replace MediatR, and hand-written mapping or a LINQ `Select` replaces AutoMapper. Explicit mapping also shows up in "find references", and projections run in SQL.
- **Existing code on MediatR 12:** it keeps its old licence, but upgrading past that major means accepting the new terms. Decide deliberately; do not let a routine package update decide for you.
- **Existing code on AutoMapper 14 or earlier:** it keeps the MIT licence, but it also keeps a high-severity denial-of-service vulnerability (see Status) that has no MIT-licensed fix. Staying put is not the safe default. The realistic choices are to accept the new licence and upgrade to a patched release, to replace AutoMapper with explicit mapping, or to mitigate deliberately (never map untrusted, deeply nested object graphs) while you plan one of the other two.
- **Choosing to pay or to qualify for Community** is a legitimate option; check the terms with whoever owns licensing, as for any commercial dependency.

## Common mistakes

- **Queries that load aggregates.** A summary handler loads `Order` with its lines and maps in memory, reading and tracking every column for four fields. Project with `Select` to the DTO.
- **Commands that return the updated entity.** The API then exposes the write model, so every change to the aggregate changes the API. Return an id or nothing, and let a query read the result.
- **A decorator that runs the inner handler before validating**, or logs the errors and calls it anyway. The invalid order is already saved when the error appears. Check first and throw before `inner.HandleAsync`.
- **A mediator "for clean code" in a five-endpoint project.** It adds indirection and, since 2025, a licence question for nothing.

## In practice

- Start with one database and separate handlers. Add a separate read store (a denormalized table, a search index, Redis) only when a measured read problem needs it; then you inherit eventual consistency, and the outbox (10/04) keeps the stores in sync.
- Microsoft's CQRS pattern page says it might not suit simple domains or plain CRUD. A product admin API rarely needs it.

## Status as of 2026-11-05

- Latest versions seen on NuGet: MediatR 14.2.0 and AutoMapper 16.2.0 (both 2026-07-02).
- AutoMapper advisory GHSA-rvv3-g6hj-g44x / CVE-2026-32933 (published 2026-03-13, CVSS 7.5): denial of service through uncontrolled recursion. Affected: every version below 15.1.1, and 16.0.0 up to (not including) 16.1.1. Patched: 15.1.1 and 16.1.1. So 14.x and every earlier MIT-licensed release is affected, and NuGet flags 14.0.0; the only fixes are under RPL-1.5/commercial terms.

## Check yourself

- When does a CQRS read model become eventually consistent, and what keeps it in sync?
- Why does the query handler not load an `Order` aggregate?
- How would you add a transaction around every command handler without a library?
- Your project depends on AutoMapper 14 and a bot opens a pull request to 16.2.0. Why is rejecting it to keep the MIT licence not a free choice, and what are your real options?
