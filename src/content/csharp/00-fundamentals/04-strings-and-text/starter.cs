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
        // TODO: trim, lower-case, and join the words with single hyphens.
        return text;
    }
}

public static class Quantity
{
    public static bool TryRead(string text, out int quantity)
    {
        // TODO: true for whole numbers of 0 or more; false (and quantity 0) for anything else.
        quantity = 0;
        return false;
    }
}

public static class Money
{
    public static string Format(decimal amount)
    {
        // TODO: exactly 2 decimals with a dot, on every machine.
        return amount.ToString();
    }
}

public static class Vowels
{
    public static int Count(string word)
    {
        // TODO: count a, e, i, o and u, in either case.
        return 0;
    }
}
