using System.Text;

Console.WriteLine(Words.Count("The cat saw the other cat").Count);
Console.WriteLine(string.Join(", ", Stock.Restock([5, 0, 12, 3], 4)));
Console.WriteLine(Cart.Total([("MUG", 2), ("PEN", 4)], new Dictionary<string, decimal> { ["MUG"] = 9.50m, ["PEN"] = 1.25m }));

public static class Words
{
    public static Dictionary<string, int> Count(string text)
    {
        var counts = new Dictionary<string, int>();
        // TODO: build each word from its letters (a StringBuilder helps), in lowercase.
        // TODO: when a non-letter ends a word, and once more after the loop, add 1 to that word's count.
        return counts;
    }
}

public static class Stock
{
    public static List<int> Restock(int[] levels, int minimum)
    {
        List<int> indexes = [];
        // TODO: add the index of every level below minimum.
        return indexes;
    }
}

public static class Cart
{
    public static decimal Total((string Sku, int Quantity)[] lines, Dictionary<string, decimal> prices)
    {
        decimal total = 0m;
        // TODO: add quantity × price for every line whose SKU has a price; skip the others.
        return total;
    }
}
