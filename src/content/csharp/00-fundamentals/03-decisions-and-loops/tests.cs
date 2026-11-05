using Dojo;

public static class DecisionsAndLoopsTests
{
    [Test("Band ships urgent orders express, whatever the total")]
    public static void UrgentOrdersShipExpress()
    {
        Assert.Equal("express", Shipping.Band(150m, true));
        Assert.Equal("express", Shipping.Band(10m, true));
        Assert.Equal("standard", Shipping.Band(10m, false));
    }

    // beginner mistake: writing total > 100 for "100 or more", so an order of exactly 100 is not free
    [Test("Band ships free from exactly 100 on")]
    public static void FreeFromExactlyOneHundred()
    {
        Assert.Equal("free", Shipping.Band(100m, false));
        Assert.Equal("free", Shipping.Band(250m, false));
        Assert.Equal("standard", Shipping.Band(99.99m, false));
    }

    [Test("SumOfEvens adds only the even numbers, negatives included")]
    public static void SumOfEvens()
    {
        Assert.Equal(6, Numbers.SumOfEvens([1, 2, 3, 4]));
        Assert.Equal(-2, Numbers.SumOfEvens([-3, -2, 7]));
        Assert.Equal(0, Numbers.SumOfEvens([1, 3, 5]));
        Assert.Equal(0, Numbers.SumOfEvens([]));
    }

    [Test("CountBelow counts the values strictly below the limit")]
    public static void CountBelow()
    {
        Assert.Equal(2, Numbers.CountBelow([5, 1, 9, 3], 5));
        Assert.Equal(4, Numbers.CountBelow([5, 1, 9, 3], 10));
        Assert.Equal(0, Numbers.CountBelow([], 10));
    }

    [Test("Clamp keeps the value between min and max")]
    public static void Clamp()
    {
        Assert.Equal(10, Numbers.Clamp(15, 0, 10));
        Assert.Equal(0, Numbers.Clamp(-3, 0, 10));
        Assert.Equal(7, Numbers.Clamp(7, 0, 10));
        Assert.Equal(10, Numbers.Clamp(10, 0, 10));
    }

    [Test("Average keeps the fraction and is 0 for an empty array")]
    public static void Average()
    {
        Assert.Equal(1.5, Numbers.Average([1, 2]));
        Assert.Equal(4.0, Numbers.Average([2, 4, 6]));
        Assert.Equal(0.0, Numbers.Average([]));
    }
}
