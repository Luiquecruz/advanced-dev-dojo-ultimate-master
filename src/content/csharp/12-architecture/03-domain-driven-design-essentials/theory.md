# Domain-Driven Design Essentials

After this lesson you can model a piece of business logic with entities, value objects and an aggregate root that protects its own rules, map value objects with EF Core complex types, raise domain events without dispatching them too early, and tell when this machinery pays off and when plain CRUD is the better tool.

## Coming from PHP/Magento

A Magento model extends `AbstractModel`: it is a bag of data with `getData()`, `setData()` and magic getters, saved by a resource model. The rules live elsewhere (totals collectors, observers on `sales_order_place_after`, price plugins). Any code can call `$order->setStatus('complete')` or `$item->setQty(-3)`, and nothing in the model refuses.

Domain-driven design (DDD) moves the rules into the object that owns the data. An `Order` refuses a line with quantity zero and refuses changes after it is placed, because its setters are private and its methods check the rules. The trap is writing EF Core entities the Magento way: public setters everywhere, logic in an `OrderService`. Microsoft's Azure Architecture Center calls that the *anemic domain model* antipattern: it keeps the cost of DDD and loses the benefit.

## Strategic DDD: bounded contexts and the ubiquitous language

Before code, DDD splits the business into **bounded contexts**: areas where a word has one meaning. "Product" in Catalog has a description and images; "product" in Inventory is a SKU with a quantity per warehouse. Each context has its own model, in the words domain experts use (the *ubiquitous language*), and is a natural boundary for a module (lesson 02) or a service (lesson 05).

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

A `record` already gives value equality, so `new Money(10, "EUR") == new Money(10, "EUR")` is `true` without the hand-written `ValueObject` base class that older .NET samples show.

## Aggregates: one consistency boundary

An **aggregate** is a cluster of objects changed together in one transaction, reached only through its **root**. Outside code holds a reference to the root, never to a child, and other aggregates are referenced by id. The rules from the Azure tactical DDD guide: design small aggregates, reference other aggregates by identity only, and use eventual consistency across aggregates.

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

        _lines.Add(new OrderLine(sku, quantity, unitPrice));
        Total = Total.Add(unitPrice.Times(quantity));
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

"Total equals the sum of the lines" cannot break: `AddLine` is the only way in, and it updates both. `Lines` returns a read-only wrapper, so a cast back to `List<OrderLine>` fails, and `Place` records `OrderPlaced` only once.

## Persisting it with EF Core 10

EF Core maps value objects as **complex types**: no key, stored as columns of the owner's table (or as one JSON column), compared by value. They were introduced in EF Core 8; EF Core 10 added optional complex types, struct complex types, JSON mapping and complex collections. Microsoft now advises moving from owned entity types to complex types for value objects.

```csharp
modelBuilder.Entity<Order>(order =>
{
    order.ComplexProperty(o => o.Total);  // columns Total_Amount, Total_Currency
    order.Ignore(o => o.Events);          // events are not columns
    // ... map the lines (a child table, or ComplexCollection(...).ToJson())
});
```

## Domain events: record now, dispatch at save

A **domain event** says something meaningful happened in the domain ("order placed", not "row inserted"). The aggregate only *records* it; the application dispatches it when the unit of work is saved. Microsoft's microservices e-book describes this deferred approach and the choice it forces: handlers that run *before* `SaveChangesAsync` share the transaction; handlers that run *after* need eventual consistency and compensation if they fail. Despite the rule above, the e-book says both can be right: one transaction across aggregates for side effects of one command (Bogard), or eventual consistency (Evans, Vernon). Business requirements decide.

```csharp
public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
{
    var orders = ChangeTracker.Entries<Order>().Select(e => e.Entity).ToList();
    // ... dispatch orders.SelectMany(o => o.Events) to in-process handlers,
    //     or write them to an outbox table in this same transaction (lesson 10/04)
    var written = await base.SaveChangesAsync(cancellationToken);
    orders.ForEach(o => o.ClearEvents());
    return written;
}
```

Events that leave the process (to another module or service) are **integration events**: published only after commit, through the outbox and a broker, as module 10 taught.

## In practice

- **Use DDD where the rules are hard** (pricing, stock reservation, payment states). A CMS block editor is plain CRUD.
- **Keep aggregates small.** "Customer with all orders" as one aggregate means every order change loads and locks the customer; link them by `CustomerId` instead.
- **Do not let EF Core shape the model.** Private setters, a private constructor and backing fields keep the API honest; EF Core still materializes the object.
- **Usual mistakes:** public setters plus an `OrderService` holding all rules; navigation properties from one aggregate into another; dispatching events from inside the entity method, so handlers run before the change is even saved.

## Status as of 2026-11-05

- EF Core 10 is an LTS release supported until 2028-11-10 (EF Core releases page; the .NET 10 runtime ends 2028-11-14). Optional, struct and JSON complex types and complex collections require EF Core 10.
- Microsoft's DDD pages in the .NET microservices e-book date from 2018–2022 and still show owned entity types and MediatR; the newer complex types page (2026) supersedes the owned-type advice.

## Check yourself

- Why is `Address` usually a value object, and when would it become an entity?
- `OrderLine` exposes no public method that changes quantity. Where would "change line quantity" go, and why?
- Your domain event handler sends an e-mail and the save then fails. What went wrong, and which two fixes exist?
