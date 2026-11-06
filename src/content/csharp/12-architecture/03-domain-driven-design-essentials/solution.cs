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
        init
        {
            ArgumentOutOfRangeException.ThrowIfNegative(value);
            field = value;
        }
    }

    public string Currency
    {
        get;
        init => field = value is { Length: 3 } ? value : throw new ArgumentException("Use a 3-letter currency code.", nameof(Currency));
    }

    public Money Add(Money other) =>
        other.Currency == Currency
            ? new Money(Amount + other.Amount, Currency)
            : throw new InvalidOperationException($"Cannot add {other.Currency} to {Currency}.");

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
    public IReadOnlyList<OrderLine> Lines => _lines.AsReadOnly();

    public void AddLine(string sku, int quantity, Money unitPrice)
    {
        if (Status != OrderStatus.Draft)
        {
            throw new InvalidOperationException($"Order {Id} is {Status}; only draft orders accept lines.");
        }
        ArgumentOutOfRangeException.ThrowIfNegativeOrZero(quantity);
        if (_lines.Count == MaxLines)
        {
            throw new InvalidOperationException($"An order has at most {MaxLines} lines.");
        }

        Money newTotal = Total.Add(unitPrice.Times(quantity));
        _lines.Add(new OrderLine(sku, quantity, unitPrice));
        Total = newTotal;
    }

    public void Place()
    {
        if (Status != OrderStatus.Draft)
        {
            throw new InvalidOperationException($"Order {Id} is already placed.");
        }
        if (_lines.Count == 0)
        {
            throw new InvalidOperationException("An order needs at least one line.");
        }

        Status = OrderStatus.Placed;
        _events.Add(new OrderPlaced(Id, Total));
    }

    public IReadOnlyList<IDomainEvent> DequeueEvents()
    {
        IDomainEvent[] events = [.. _events];
        _events.Clear();
        return events;
    }
}
