// Run prints these results; the tests call the methods directly.
Console.WriteLine(Calendar.IsLeapYear(2024));
Console.WriteLine(Geometry.CircleArea(2));
Console.WriteLine(Geometry.Area(5));
Console.WriteLine(Prices.WithTax(100m));

public static class Calendar
{
    public static bool IsLeapYear(int year) => year % 4 == 0 && (year % 100 != 0 || year % 400 == 0);
}

public static class Geometry
{
    public static double CircleArea(double radius) => Math.PI * radius * radius;

    public static double Area(double width, double height) => width * height;

    public static double Area(double side) => Area(side, side);
}

public static class Prices
{
    public static decimal WithTax(decimal net, decimal rate = 0.21m) => Math.Round(net * (1 + rate), 2);
}
