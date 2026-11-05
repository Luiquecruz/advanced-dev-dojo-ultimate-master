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
        if (!int.TryParse(text, out int age))
        {
            throw new ArgumentException($"'{text}' is not a whole number.", nameof(text));
        }

        if (age < 0 || age > 150)
        {
            throw new ArgumentOutOfRangeException(nameof(text), age, "An age is between 0 and 150.");
        }

        return age;
    }

    public static int CountAdults(int[] ages)
    {
        int count = 0;

        for (int i = 0; i < ages.Length; i++)
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
        if (b == 0)
        {
            return (false, 0);
        }

        return (true, a / b);
    }
}
