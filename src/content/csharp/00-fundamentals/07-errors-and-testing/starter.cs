try
{
    Console.WriteLine(Ages.CountAdults([20, 17, 18]));
}
catch (Exception ex)
{
    Console.WriteLine(ex.ToString());
}

public static class Ages
{
    public static int Parse(string text)
    {
        // TODO: throw ArgumentException when text is not a whole number (int.TryParse helps).
        // TODO: throw ArgumentOutOfRangeException when the number is below 0 or above 150.
        return 0;
    }

    public static int CountAdults(int[] ages)
    {
        int count = 0;

        for (int i = 0; i <= ages.Length; i++)
        {
            if (ages[i] >= 18)
            {
                count++;
            }
        }

        return count;
    }
}

public static class Safe
{
    public static (bool Ok, int Result) Divide(int a, int b)
    {
        // TODO: return (false, 0) when b is 0; otherwise (true, a / b).
        return (false, 0);
    }
}
