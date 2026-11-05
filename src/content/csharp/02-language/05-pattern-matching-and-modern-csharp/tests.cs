using Dojo;

public static class ShippingTests
{
    [Test("Cost prices letters by weight, with 20 g still the small rate")]
    public static void Letters()
    {
        Assert.Equal(1.10m, Shipping.Cost(new Letter(20)));
        Assert.Equal(2.50m, Shipping.Cost(new Letter(21)));
    }

    // beginner mistake: writing > 10 instead of >= 10, or putting the country arm before the heavy arm; the first matching arm wins
    [Test("Cost charges the heavy rate from exactly 10 kg, before any country rule")]
    public static void HeavyParcelsFirst()
    {
        Assert.Equal(15m, Shipping.Cost(new Parcel(10m, "PT")));
        Assert.Equal(15m, Shipping.Cost(new Parcel(12m, "NL")));
        Assert.Equal(7.50m, Shipping.Cost(new Parcel(9.99m, "PT")));
    }

    [Test("Cost charges 4.95 for lighter parcels to NL or BE")]
    public static void BeneluxParcels()
    {
        Assert.Equal(4.95m, Shipping.Cost(new Parcel(2m, "NL")));
        Assert.Equal(4.95m, Shipping.Cost(new Parcel(0.5m, "BE")));
        Assert.Equal(7.50m, Shipping.Cost(new Parcel(2m, "DE")));
    }

    [Test("Cost multiplies the pallet rate, and rejects null and empty pallets")]
    public static void PalletsAndBadInput()
    {
        Assert.Equal(180m, Shipping.Cost(new Pallet(3)));
        Assert.Throws<ArgumentNullException>(() => Shipping.Cost(null));
        var error = Assert.Throws<ArgumentException>(() => Shipping.Cost(new Pallet(0)));
        Assert.Equal(typeof(ArgumentException), error.GetType());
    }

    [Test("DescribeRoute names the route by its shape")]
    public static void Routes()
    {
        Assert.Equal("no stops", Shipping.DescribeRoute([]));
        Assert.Equal("direct to Lisbon", Shipping.DescribeRoute(["Lisbon"]));
        Assert.Equal("Amsterdam to Lisbon", Shipping.DescribeRoute(["Amsterdam", "Lisbon"]));
        Assert.Equal("Amsterdam to Lisbon via Paris", Shipping.DescribeRoute(["Amsterdam", "Paris", "Lisbon"]));
        Assert.Equal("Amsterdam to Lisbon via 3 stops", Shipping.DescribeRoute(["Amsterdam", "Brussels", "Paris", "Madrid", "Lisbon"]));
    }

    [Test("Zone keeps the name and the codes passed to its primary constructor")]
    public static void ZoneFromPrimaryConstructor()
    {
        var benelux = new Zone("Benelux", "NL", "BE", "LU");
        Assert.Equal("Benelux", benelux.Name);
        Assert.True(benelux.Covers("be"), "codes are compared ignoring case");
        Assert.False(benelux.Covers("DE"));
        Assert.False(new Zone("Empty").Covers("NL"));
    }
}
