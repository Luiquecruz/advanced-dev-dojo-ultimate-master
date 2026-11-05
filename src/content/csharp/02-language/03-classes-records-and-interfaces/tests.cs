using Dojo;

public static class CatalogTests
{
    private static Product Bag(decimal price) => new(new Sku("24-MB01"), "Joust Duffle Bag", price);

    // beginner mistake: declaring Sku as a plain class, whose == compares identity instead of the value
    [Test("Two Sku values with the same text are equal")]
    public static void SkuHasValueEquality()
    {
        var first = new Sku("24-MB01");
        var second = new Sku("24-MB01");
        Assert.True(first == second, "== compares the values of two Sku objects");
        Assert.True(first.Equals(second), "Equals compares the values too");
        Assert.False(first == new Sku("24-MB04"), "different text, different Sku");
    }

    [Test("Product rejects a negative price, in the constructor and in ChangePrice")]
    public static void ProductValidatesPrice()
    {
        Assert.Throws<ArgumentOutOfRangeException>(() => Bag(-1m));
        var bag = Bag(34m);
        Assert.Throws<ArgumentOutOfRangeException>(() => bag.ChangePrice(-0.01m));
        Assert.Equal(34m, bag.Price);
        bag.ChangePrice(0m);
        Assert.Equal(0m, bag.Price);
    }

    [Test("Only Product can set Price")]
    public static void PriceSetterIsPrivate()
    {
        var setter = typeof(Product).GetProperty("Price")?.SetMethod;
        Assert.NotNull(setter);
        Assert.True(setter!.IsPrivate, "Price needs a private set accessor");
    }

    [Test("PercentOff and FloorAt are price rules")]
    public static void RulesApply()
    {
        IPriceRule percentOff = new PercentOff(15m);
        Assert.Equal(16.99m, percentOff.Apply(19.99m));
        IPriceRule floor = new FloorAt(10m);
        Assert.Equal(10m, floor.Apply(7.5m));
        Assert.Equal(12m, floor.Apply(12m));
    }

    [Test("Checkout.Total applies the rules in list order and adds the prices")]
    public static void TotalAppliesRulesInOrder()
    {
        List<Product> products = [Bag(15m), Bag(40m)];
        Assert.Equal(30m, Checkout.Total(products, [new PercentOff(50m), new FloorAt(10m)]));
        Assert.Equal(27.5m, Checkout.Total(products, [new FloorAt(10m), new PercentOff(50m)]));
        Assert.Equal(55m, Checkout.Total(products, []));
        Assert.Equal(0m, Checkout.Total([], [new FloorAt(10m)]));
    }
}
