using Dojo;

public static class MethodsTests
{
    [Test("IsLeapYear is true for years divisible by 4")]
    public static void LeapYearsDivisibleByFour()
    {
        Assert.True(Calendar.IsLeapYear(2024), "2024 is a leap year");
        Assert.True(Calendar.IsLeapYear(1996), "1996 is a leap year");
        Assert.False(Calendar.IsLeapYear(2023), "2023 is not a leap year");
        Assert.False(Calendar.IsLeapYear(2026), "2026 is not a leap year");
    }

    // beginner mistake: checking only year % 4 == 0, which makes 1900 and 2100 leap years
    [Test("IsLeapYear treats century years as leap years only when divisible by 400")]
    public static void CenturyYears()
    {
        Assert.False(Calendar.IsLeapYear(1900), "1900 is divisible by 100 but not by 400");
        Assert.False(Calendar.IsLeapYear(2100), "2100 is divisible by 100 but not by 400");
        Assert.True(Calendar.IsLeapYear(2000), "2000 is divisible by 400");
        Assert.True(Calendar.IsLeapYear(1600), "1600 is divisible by 400");
    }

    [Test("CircleArea is pi times the radius squared")]
    public static void CircleArea()
    {
        Assert.Equal(Math.PI * 4, Geometry.CircleArea(2), 1e-9);
        Assert.Equal(Math.PI, Geometry.CircleArea(1), 1e-9);
        Assert.Equal(0.0, Geometry.CircleArea(0), 1e-9);
    }

    [Test("Area has overloads for a rectangle and a square")]
    public static void AreaOverloads()
    {
        Assert.Equal(12.0, Geometry.Area(3, 4), 1e-9);
        Assert.Equal(25.0, Geometry.Area(5), 1e-9);
        Assert.Equal(2.25, Geometry.Area(1.5), 1e-9);
    }

    [Test("WithTax uses 21% by default and accepts a named rate")]
    public static void WithTaxDefaultAndNamedArguments()
    {
        Assert.Equal(121m, Prices.WithTax(100m));
        Assert.Equal(24.19m, Prices.WithTax(19.99m));
        Assert.Equal(53m, Prices.WithTax(rate: 0.06m, net: 50m));
        Assert.Equal(100m, Prices.WithTax(net: 100m, rate: 0m));
    }
}
