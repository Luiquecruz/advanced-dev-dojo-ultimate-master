// Run prints these results; the tests call the methods directly.
Console.WriteLine(Shipping.Band(100m, false));
Console.WriteLine(Numbers.SumOfEvens([1, 2, 3, 4]));
Console.WriteLine(Numbers.Average([1, 2]));

public static class Shipping
{
    public static string Band(decimal total, bool urgent)
    {
        if (urgent)
        {
            return "express";
        }
        if (total >= 100m)
        {
            return "free";
        }
        return "standard";
    }
}

public static class Numbers
{
    public static int SumOfEvens(int[] values)
    {
        int sum = 0;
        foreach (int value in values)
        {
            if (value % 2 == 0)
            {
                sum += value;
            }
        }
        return sum;
    }

    public static int CountBelow(int[] values, int limit)
    {
        int count = 0;
        foreach (int value in values)
        {
            if (value < limit)
            {
                count++;
            }
        }
        return count;
    }

    public static int Clamp(int value, int min, int max)
    {
        if (value < min)
        {
            return min;
        }
        if (value > max)
        {
            return max;
        }
        return value;
    }

    public static double Average(int[] values)
    {
        if (values.Length == 0)
        {
            return 0;
        }
        int sum = 0;
        for (int i = 0; i < values.Length; i++)
        {
            sum += values[i];
        }
        return (double)sum / values.Length;
    }
}
