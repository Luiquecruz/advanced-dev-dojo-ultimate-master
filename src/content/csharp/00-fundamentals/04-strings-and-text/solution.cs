using System.Globalization;

// Run prints these results; the tests call the methods directly.
Console.WriteLine(Slug.From("  Joust Duffle Bag "));
Console.WriteLine(Quantity.TryRead(" 12 ", out int quantity) + " " + quantity);
Console.WriteLine(Money.Format(19.9m));
Console.WriteLine(Vowels.Count("Duffle"));

public static class Slug
{
    public static string From(string text)
    {
        string[] words = text.Trim().ToLowerInvariant().Split(' ', StringSplitOptions.RemoveEmptyEntries);
        return string.Join("-", words);
    }
}

public static class Quantity
{
    public static bool TryRead(string text, out int quantity)
    {
        if (!int.TryParse(text, NumberStyles.Integer, CultureInfo.InvariantCulture, out quantity) || quantity < 0)
        {
            quantity = 0;
            return false;
        }
        return true;
    }
}

public static class Money
{
    public static string Format(decimal amount) => amount.ToString("F2", CultureInfo.InvariantCulture);
}

public static class Vowels
{
    public static int Count(string word)
    {
        int count = 0;
        foreach (char letter in word)
        {
            if ("aeiou".Contains(char.ToLowerInvariant(letter)))
            {
                count++;
            }
        }
        return count;
    }
}
