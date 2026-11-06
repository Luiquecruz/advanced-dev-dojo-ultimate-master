// Run prints these results; the tests call the methods directly.
Console.WriteLine(Calendar.IsLeapYear(2024));
Console.WriteLine(Geometry.CircleArea(2));
Console.WriteLine(Geometry.Area(5));
Console.WriteLine(Prices.WithTax(100m));

public static class Calendar
{
    public static bool IsLeapYear(int year)
    {
        // TODO: divisible by 4, except century years, which must also be divisible by 400.
        return false;
    }
}

public static class Geometry
{
    public static double CircleArea(double radius)
    {
        // TODO: pi times the radius squared (Math.PI).
        return 0;
    }

    public static double Area(double width, double height)
    {
        // TODO: the area of a rectangle.
        return 0;
    }

    public static double Area(double side)
    {
        // TODO: a square is a rectangle with equal sides: call the other overload.
        return 0;
    }
}

public static class Prices
{
    // TODO: the default rate is 21%.
    public static decimal WithTax(decimal net, decimal rate = 0m)
    {
        // TODO: net plus tax, rounded to 2 decimal places.
        return net;
    }
}
