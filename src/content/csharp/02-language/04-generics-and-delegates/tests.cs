using Dojo;

public sealed record Item(int Id, string Name, decimal Price) : IHasId;

public sealed record Supplier(int Id, string Country) : IHasId;

public static class GenericsAndDelegatesTests
{
    private static Repository<Item> Items()
    {
        var items = new Repository<Item>();
        items.Add(new Item(1, "Bag", 34m));
        items.Add(new Item(2, "Mug", 9m));
        items.Add(new Item(3, "Lamp", 52m));
        return items;
    }

    [Test("Repository.Find returns the item with the id, or null")]
    public static void FindById()
    {
        var items = Items();
        Assert.Equal("Mug", items.Find(2)?.Name);
        Assert.Null(items.Find(99));
    }

    [Test("Repository.Add replaces the item that has the same id")]
    public static void AddReplaces()
    {
        var items = Items();
        items.Add(new Item(2, "Large mug", 12m));
        Assert.Equal(3, items.Count);
        Assert.Equal("Large mug", items.Find(2)?.Name);
    }

    [Test("Repository.Filter keeps what the Func accepts, in insertion order, for any IHasId type")]
    public static void FilterWithFunc()
    {
        Func<Item, bool> over20 = item => item.Price > 20m;
        var expensive = Items().Filter(over20);
        Assert.SequenceEqual(["Bag", "Lamp"], [expensive[0].Name, expensive[1].Name]);
        Assert.Equal(2, expensive.Count);

        var suppliers = new Repository<Supplier>();
        suppliers.Add(new Supplier(7, "NL"));
        suppliers.Add(new Supplier(8, "PT"));
        Assert.Equal(8, suppliers.Filter(supplier => supplier.Country == "PT")[0].Id);
        Assert.Equal(0, suppliers.Filter(supplier => supplier.Country == "BR").Count);
    }

    [Test("StockCounter raises LowStock once, when the stock drops below the threshold")]
    public static void LowStockRaisedOnce()
    {
        var counter = new StockCounter(initialStock: 10, threshold: 5);
        var raised = new List<int>();
        object? sender = null;
        counter.LowStock += (source, e) =>
        {
            sender = source;
            raised.Add(e.Stock);
        };
        counter.Remove(5);
        Assert.Equal(0, raised.Count);
        counter.Remove(2);
        counter.Remove(1);
        Assert.SequenceEqual([3], raised);
        Assert.True(ReferenceEquals(counter, sender), "the sender is the counter that raised the event");
        Assert.Equal(2, counter.Stock);
    }

    [Test("StockCounter.Remove works when nobody subscribed")]
    public static void NoSubscribers()
    {
        var counter = new StockCounter(initialStock: 3, threshold: 5);
        counter.Remove(1);
        Assert.Equal(2, counter.Stock);
        var crossing = new StockCounter(initialStock: 5, threshold: 5);
        crossing.Remove(1);
        Assert.Equal(4, crossing.Stock);
    }

    // beginner mistake: every lambda captures the one shared for-loop variable, so all of them return the final count
    [Test("Callbacks.Numbered builds callbacks that each return their own index")]
    public static void ClosuresCaptureEachIndex()
    {
        var callbacks = Callbacks.Numbered(3);
        Assert.Equal(3, callbacks.Count);
        Assert.SequenceEqual([0, 1, 2], [callbacks[0](), callbacks[1](), callbacks[2]()]);
    }
}
