# Domain-Driven Design Essentials

After this lesson you can model a piece of business logic with entities, value objects and an aggregate root that protects its own rules, map value objects with EF Core complex types, raise domain events without dispatching them too early, and tell when this machinery pays off and when plain CRUD is the better tool.

You need: 02/03 (records, `with` and the `field` keyword), 03/01 (read-only views of a list), 04/01 (throw helpers), 07/02 (EF Core), 10/04 (the outbox) and 12/01 and 12/02.

## Rules live with the data

In a plain CRUD design, an order is a bag of data with public setters and the rules live in service classes. Any code can still write `order.Status = OrderStatus.Placed` or set a quantity of -3, and nothing refuses.

Domain-driven design (DDD) moves the rules into the object that owns the data. An `Order` refuses a line with quantity zero and refuses changes after it is placed, because its setters are private and its methods check the rules. Microsoft's Azure Architecture Center calls public setters with every rule in an `OrderService` the *anemic domain model* antipattern.

## Strategic DDD: bounded contexts and the ubiquitous language

Before code, DDD splits the business into **bounded contexts**: areas where a word has one meaning. "Product" in Catalog has a description and images; "product" in Inventory is a SKU with a quantity per warehouse. Each context has its own model, in the words domain experts use (the *ubiquitous language*), and is a natural boundary for a module (lesson 12/02) or a service (lesson 12/05).

## Entities and value objects

An **entity** has an identity that persists while its attributes change: an order is the same order after its address changes. A **value object** has no identity; it is defined by its values and is immutable, so two `Money(10, "EUR")` are interchangeable. The Azure guidance recommends value objects as the default and promoting a concept to an entity only when you must track it over time.

C# 14's `field` keyword lets a record validate in its `init` accessors, so both the constructor and a `with` expression go through the checks:

```csharp
public sealed record Money
{
    public Money(decimal amount, string currency)
    {
        Amount = amount;
        Currency = currency;
    }

    public decimal Amount
    {
        get;
        init => field = value >= 0 ? value : throw new ArgumentOutOfRangeException(nameof(Amount));
    }

    public string Currency
    {
        get;
        init => field = value is { Length: 3 } ? value : throw new ArgumentException("Use a 3-letter ISO 4217 code.", nameof(Currency));
    }

    public Money Add(Money other) =>
        other.Currency == Currency
            ? new Money(Amount + other.Amount, Currency)
            : throw new InvalidOperationException("Cannot add different currencies.");

    public Money Times(int quantity) => new(Amount * quantity, Currency);
}
```

A `record` already gives value equality: `new Money(10, "EUR") == new Money(10, "EUR")` is `true`, with no hand-written `ValueObject` base class.

## Aggregates: one consistency boundary

An **aggregate** is a cluster of objects changed together in one transaction, reached only through its **root**. The Azure tactical DDD guide's rules: design small aggregates, reference other aggregates by identity only, and use eventual consistency between them.

```csharp
public enum OrderStatus { Draft, Placed }

public sealed record OrderLine(string Sku, int Quantity, Money UnitPrice);

public interface IDomainEvent { }

public sealed record OrderPlaced(Guid OrderId, Guid CustomerId, Money Total) : IDomainEvent;

public sealed class Order
{
    private readonly List<OrderLine> _lines = [];
    private readonly List<IDomainEvent> _events = [];

    private Order() { } // used by EF Core

    public Order(Guid customerId, string currency)
    {
        Id = Guid.CreateVersion7();
        CustomerId = customerId;
        Total = new Money(0, currency);
    }

    public Guid Id { get; private set; }
    public Guid CustomerId { get; private set; } // another aggregate: an id, not a Customer object
    public OrderStatus Status { get; private set; } = OrderStatus.Draft;
    public Money Total { get; private set; } = null!;
    public IReadOnlyList<OrderLine> Lines => _lines.AsReadOnly();
    public IReadOnlyList<IDomainEvent> Events => _events;

    public void AddLine(string sku, int quantity, Money unitPrice)
    {
        if (Status != OrderStatus.Draft) throw new InvalidOperationException("Only draft orders can change.");
        ArgumentOutOfRangeException.ThrowIfNegativeOrZero(quantity);

        Money newTotal = Total.Add(unitPrice.Times(quantity));
        _lines.Add(new OrderLine(sku, quantity, unitPrice));
        Total = newTotal;
    }

    public void Place()
    {
        if (Status != OrderStatus.Draft) throw new InvalidOperationException("The order is already placed.");
        if (_lines.Count == 0) throw new InvalidOperationException("An order needs at least one line.");

        Status = OrderStatus.Placed;
        _events.Add(new OrderPlaced(Id, CustomerId, Total));
    }

    public void ClearEvents() => _events.Clear();
}
```

"Total equals the sum of the lines" cannot break: `AddLine` is the only way in, and it computes the new total first, so a currency mismatch changes nothing. `Lines` returns a read-only wrapper, so a cast back to `List<OrderLine>` fails, and `Place` records `OrderPlaced` only once.

## Persisting it with EF Core 10

EF Core maps value objects as **complex types**: no key, stored as columns of the owner's table (or as one JSON column), compared by value. Microsoft now advises moving from owned entity types to complex types for value objects.

```csharp
modelBuilder.Entity<Order>(order =>
{
    order.ComplexProperty(o => o.Total);  // columns Total_Amount, Total_Currency
    order.Ignore(o => o.Events);          // events are not columns
    // ... map the lines (a child table, or ComplexCollection(...).ToJson())
});
```

<!-- coderabbit-ai-generated:v1 -->

<!-- coderabbit-ai-generated-section:v1:40d33ca0dfd6ca860dea5bd943658d0b1e3408725c7c6a38a8c68e90594e665b -->

## Domain events: record now, dispatch at save

A **domain event** records a business fact, such as "order placed". Defer dispatch until save. Pre-save handlers must share the database transaction. E-mail handlers must enqueue outbox records in that transaction or send only after commit: failed saves cannot undo sent e-mail. Post-commit failures need recovery; an outbox supports retries (10/04).

```csharp
public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
{
    var orders = ChangeTracker.Entries<Order>().Select(e => e.Entity).ToList();
    // Dispatch events only to handlers writing through this DbContext.
    // E-mail handlers add outbox records; the relay sends after commit.
    var written = await base.SaveChangesAsync(cancellationToken);
    orders.ForEach(o => o.ClearEvents());
    return written;
}
```

**Integration events** leave the process; publish them after commit through the outbox and broker (10/04).



## Common mistakes

- **Handing out the internal list.** `public IReadOnlyList<OrderLine> Lines => _lines;` still returns the `List<OrderLine>`, so a caller casts it back and adds a line to a placed order. Return `_lines.AsReadOnly()`.
- **Changing state before the last check.** `AddLine` appends the line, then the currency check throws, leaving a line the total does not include. Validate first, then mutate.
- **Navigation properties into another aggregate.** An `Order.Customer` that updates loyalty points makes one save change two aggregates. Hold `CustomerId`.
- **Dispatching events from the entity method.** Handlers run before the save, so a failed save leaves an e-mail sent for an order that does not exist. Record events; dispatch before save only for effects sharing the database transaction. Enqueue e-mail in the outbox or send it only after commit.

<!-- /coderabbit-ai-generated:v1 -->

## In practice

- **Use DDD where the rules are hard** (pricing, stock reservation, payment states). A CMS block editor is plain CRUD.
- **Keep aggregates small.** "Customer with all orders" as one aggregate means every order change loads and locks the customer; link them by `CustomerId` instead.

## Status as of 2026-11-05

- EF Core 10 is an LTS release supported until 2028-11-10 (EF Core releases page; the .NET 10 runtime ends 2028-11-14). Optional, struct and JSON complex types and complex collections require EF Core 10.
- Complex types arrived in EF Core 8. The e-book's DDD pages (2018–2022) still show owned entity types and MediatR; the complex types page (2026) supersedes the owned-type advice.

## Check yourself

- Why is `Address` usually a value object, and when would it become an entity?
- `OrderLine` exposes no public method that changes quantity. Where would "change line quantity" go, and why?
- Your domain event handler sends an e-mail and the save then fails. What went wrong, and which two fixes exist?
