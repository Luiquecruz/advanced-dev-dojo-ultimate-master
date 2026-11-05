using Dojo;

public static class ReceiptTests
{
    [Test("LineTotal multiplies the price by the quantity")]
    public static void LineTotalMultiplies()
    {
        Assert.Equal(13.50m, Receipt.LineTotal(4.50m, 3));
        Assert.Equal(19.99m, Receipt.LineTotal(19.99m, 1));
        Assert.Equal(0m, Receipt.LineTotal(19.99m, 0));
    }

    [Test("WithTax adds the tax and rounds to 2 decimal places")]
    public static void WithTaxAddsAndRounds()
    {
        Assert.Equal(121m, Receipt.WithTax(100m, 0.21m));
        Assert.Equal(24.19m, Receipt.WithTax(19.99m, 0.21m));
        Assert.Equal(10m, Receipt.WithTax(10m, 0m));
    }

    [Test("Describe writes the quantity, x and the name")]
    public static void DescribeFormatsTheLine()
    {
        Assert.Equal("3 x Mug", Receipt.Describe("Mug", 3));
        Assert.Equal("1 x Duffle Bag", Receipt.Describe("Duffle Bag", 1));
    }

    [Test("FullBoxes and Leftover split the items into full boxes and the rest")]
    public static void BoxesUseDivisionAndRemainder()
    {
        Assert.Equal(3, Receipt.FullBoxes(7, 2));
        Assert.Equal(1, Receipt.Leftover(7, 2));
        Assert.Equal(3, Receipt.FullBoxes(12, 4));
        Assert.Equal(0, Receipt.Leftover(12, 4));
        Assert.Equal(0, Receipt.FullBoxes(5, 6));
        Assert.Equal(5, Receipt.Leftover(5, 6));
    }

    // beginner mistake: dividing two ints, which drops the fraction (7 / 2 is 3)
    [Test("AverageRating keeps the fraction")]
    public static void AverageRatingKeepsTheFraction()
    {
        Assert.Equal(3.5, Receipt.AverageRating(7, 2));
        Assert.Equal(4.5, Receipt.AverageRating(9, 2));
        Assert.Equal(4.0, Receipt.AverageRating(12, 3));
    }
}
