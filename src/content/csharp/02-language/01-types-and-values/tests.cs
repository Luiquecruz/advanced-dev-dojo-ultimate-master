using Dojo;

public static class PricingTests
{
    [Test("Discount lowers the caller's price and keeps its currency")]
    public static void DiscountChangesTheCallersValue()
    {
        var price = new Money { Amount = 50m, Currency = "EUR" };
        Pricing.Discount(ref price, 10m);
        Assert.Equal(45m, price.Amount);
        Assert.Equal("EUR", price.Currency);
    }

    [Test("Discount rounds to 2 decimal places")]
    public static void DiscountRounds()
    {
        var price = new Money { Amount = 19.99m, Currency = "EUR" };
        Pricing.Discount(ref price, 15m);
        Assert.Equal(16.99m, price.Amount);
    }

    // beginner mistake: changing the copy that reading a struct from a list returns, so the list never changes
    [Test("RaiseAll changes the prices stored in the list")]
    public static void RaiseAllWritesBack()
    {
        List<Money> prices = [new Money { Amount = 5m, Currency = "EUR" }, new Money { Amount = 7.5m, Currency = "USD" }];
        Pricing.RaiseAll(prices, 1m);
        Assert.Equal(6m, prices[0].Amount);
        Assert.Equal(8.5m, prices[1].Amount);
        Assert.Equal("USD", prices[1].Currency);
        Assert.Equal(2, prices.Count);
    }

    [Test("AddGift adds GIFT-01 to the caller's list, only once")]
    public static void AddGiftChangesTheSharedList()
    {
        var cart = new Cart();
        cart.Skus.Add("BAG-01");
        Pricing.AddGift(cart.Skus);
        Pricing.AddGift(cart.Skus);
        Assert.SequenceEqual(["BAG-01", "GIFT-01"], cart.Skus);
    }

    [Test("SameCart is true only when both variables refer to one cart")]
    public static void SameCartComparesIdentity()
    {
        var first = new Cart();
        first.Skus.Add("BAG-01");
        var second = new Cart();
        second.Skus.Add("BAG-01");
        var alias = first;
        Assert.True(Pricing.SameCart(first, alias), "a variable copied from first refers to the same cart");
        Assert.False(Pricing.SameCart(first, second), "two carts with the same SKUs are still two carts");
    }
}
