using Dojo;

public static class DomainDrivenDesignTests
{
    private static readonly Guid OrderId = new("0197a1b2-0000-7000-8000-000000000001");

    private static Money Eur(decimal amount) => new(amount, "EUR");

    [Test("Money is a value object: equal by value, Add refuses another currency, and a negative amount throws even through with")]
    public static void MoneyIsAValueObject()
    {
        Assert.True(Eur(10) == Eur(10), "two Money values with the same amount and currency should be equal");
        Assert.Equal(Eur(12.5m), Eur(10).Add(Eur(2.5m)));
        Assert.Throws<InvalidOperationException>(() => Eur(10).Add(new Money(1, "USD")));
        Assert.Throws<ArgumentOutOfRangeException>(() => new Money(-1, "EUR"));
        Assert.Throws<ArgumentOutOfRangeException>(() => { Money negative = Eur(5) with { Amount = -1 }; });
        Assert.Throws<ArgumentException>(() => new Money(1, "EURO"));
    }

    [Test("AddLine keeps Total equal to the sum of the lines and rejects a quantity of 0 or another currency without changing the order")]
    public static void AddLineKeepsTheTotalConsistent()
    {
        var order = new Order(OrderId, "EUR");
        order.AddLine("MUG", 2, Eur(7.5m));
        order.AddLine("BAG", 1, Eur(30));
        Assert.Equal(Eur(45), order.Total);

        Assert.Throws<ArgumentOutOfRangeException>(() => order.AddLine("HAT", 0, Eur(9)));
        Assert.Throws<InvalidOperationException>(() => order.AddLine("HAT", 1, new Money(9, "USD")));
        Assert.Equal(2, order.Lines.Count);
        Assert.Equal(Eur(45), order.Total);
    }

    [Test("An order holds at most 10 lines: the 11th throws InvalidOperationException and is not added")]
    public static void AnOrderHoldsAtMostTenLines()
    {
        var order = new Order(OrderId, "EUR");
        for (int line = 1; line <= Order.MaxLines; line++)
        {
            order.AddLine($"SKU-{line}", 1, Eur(1));
        }
        Assert.Throws<InvalidOperationException>(() => order.AddLine("SKU-11", 1, Eur(1)));
        Assert.Equal(10, order.Lines.Count);
        Assert.Equal(Eur(10), order.Total);
    }

    [Test("Place needs at least one line, and a placed order refuses new lines and a second Place")]
    public static void APlacedOrderIsFrozen()
    {
        var empty = new Order(OrderId, "EUR");
        Assert.Throws<InvalidOperationException>(() => empty.Place());
        Assert.Equal(OrderStatus.Draft, empty.Status);

        var order = new Order(OrderId, "EUR");
        order.AddLine("MUG", 1, Eur(7.5m));
        order.Place();
        Assert.Equal(OrderStatus.Placed, order.Status);
        Assert.Throws<InvalidOperationException>(() => order.AddLine("BAG", 1, Eur(30)));
        Assert.Throws<InvalidOperationException>(() => order.Place());
        Assert.Equal(1, order.Lines.Count);
    }

    [Test("Place records one OrderPlaced event; DequeueEvents returns it once, and the returned list keeps it")]
    public static void DequeueEventsDrainsTheEvents()
    {
        var order = new Order(OrderId, "EUR");
        order.AddLine("MUG", 2, Eur(7.5m));
        Assert.Equal(0, order.DequeueEvents().Count);

        order.Place();
        IReadOnlyList<IDomainEvent> events = order.DequeueEvents();
        IReadOnlyList<IDomainEvent> again = order.DequeueEvents();
        Assert.Equal(1, events.Count);
        Assert.Equal<IDomainEvent>(new OrderPlaced(OrderId, Eur(15)), events[0]);
        Assert.Equal(0, again.Count);
    }

    // beginner mistake: returning the internal List<OrderLine> as Lines, so callers can add lines that skip every rule
    [Test("Lines is read-only from outside: code that gets hold of it cannot add a line to the order")]
    public static void LinesCannotBeChangedFromOutside()
    {
        var order = new Order(OrderId, "EUR");
        order.AddLine("MUG", 1, Eur(7.5m));
        order.Place();

        if (order.Lines is ICollection<OrderLine> { IsReadOnly: false } writable)
        {
            writable.Add(new OrderLine("FREE", 100, Eur(0)));
        }

        Assert.Equal(1, order.Lines.Count);
        Assert.Equal("MUG", order.Lines[0].Sku);
    }
}
