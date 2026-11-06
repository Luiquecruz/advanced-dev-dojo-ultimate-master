// Run prints these results; the tests call the methods directly.
Console.WriteLine(Shipping.Band(100m, false));
Console.WriteLine(Numbers.SumOfEvens([1, 2, 3, 4]));
Console.WriteLine(Numbers.Average([1, 2]));

public static class Shipping
{
    public static string Band(decimal total, bool urgent)
    {
        // TODO: "express" for urgent orders, "free" from 100 on, "standard" otherwise.
        return "standard";
    }
}

public static class Numbers
{
    public static int SumOfEvens(int[] values)
    {
        // TODO: add up the even numbers only.
        return 0;
    }

    public static int CountBelow(int[] values, int limit)
    {
        // TODO: count the values strictly smaller than limit.
        return 0;
    }

    public static int Clamp(int value, int min, int max)
    {
        // TODO: min when value is smaller, max when it is larger, value otherwise.
        return value;
    }

    public static double Average(int[] values)
    {
        // TODO: the average with its fraction; 0 for an empty array.
        return 0;
    }
}
