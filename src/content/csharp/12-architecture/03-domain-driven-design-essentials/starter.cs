public sealed record Money
{
    public Money(decimal amount, string currency)
    {
        Amount = amount;
        Currency = currency;
    }

    // TODO: reject an amount below 0 and a currency that is not 3 characters, inside the init accessors.
    public decimal Amount { get; init; }

    public string Currency { get; init; }

    public Money Add(Money other)
    {
        // TODO: return the sum; refuse a different currency.
        throw new NotImplementedException();
    }

    public Money Times(int quantity) => new(Amount * quantity, Currency);
}

public sealed record OrderLine(string Sku, int Quantity, Money UnitPrice);

public interface IDomainEvent { }

public sealed record OrderPlaced(Guid OrderId, Money Total) : IDomainEvent;

public enum OrderStatus { Draft, Placed }

public sealed class Order
{
    public const int MaxLines = 10;

    private readonly List<OrderLine> _lines = [];
    private readonly List<IDomainEvent> _events = [];

    public Order(Guid id, string currency)
    {
        Id = id;
        Currency = currency;
        Total = new Money(0, currency);
    }

    public Guid Id { get; private set; }
    public string Currency { get; private set; }
    public OrderStatus Status { get; private set; } = OrderStatus.Draft;
    public Money Total { get; private set; }
    public IReadOnlyList<OrderLine> Lines => _lines;

    public void AddLine(string sku, int quantity, Money unitPrice)
    {
        // TODO: check every rule first, then add the line and update Total.
        _lines.Add(new OrderLine(sku, quantity, unitPrice));
    }

    public void Place()
    {
        // TODO: only a draft order with at least one line can be placed; record OrderPlaced.
        Status = OrderStatus.Placed;
    }

    public IReadOnlyList<IDomainEvent> DequeueEvents()
    {
        // TODO: return the recorded events and forget them.
        return _events;
    }
}
