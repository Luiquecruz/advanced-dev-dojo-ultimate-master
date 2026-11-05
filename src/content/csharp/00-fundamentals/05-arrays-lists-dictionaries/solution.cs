using System.Text;

Console.WriteLine(Words.Count("The cat saw the other cat").Count);
Console.WriteLine(string.Join(", ", Stock.Restock([5, 0, 12, 3], 4)));
Console.WriteLine(Cart.Total([("MUG", 2), ("PEN", 4)], new Dictionary<string, decimal> { ["MUG"] = 9.50m, ["PEN"] = 1.25m }));

public static class Words
{
    public static Dictionary<string, int> Count(string text)
    {
        var counts = new Dictionary<string, int>();
        var word = new StringBuilder();

        foreach (char c in text)
        {
            if (char.IsLetter(c))
            {
                word.Append(char.ToLowerInvariant(c));
            }
            else
            {
                AddWord(counts, word);
            }
        }

        AddWord(counts, word);
        return counts;
    }

    private static void AddWord(Dictionary<string, int> counts, StringBuilder word)
    {
        if (word.Length == 0)
        {
            return;
        }

        string key = word.ToString();
        counts.TryGetValue(key, out int seen);
        counts[key] = seen + 1;
        word.Clear();
    }
}

public static class Stock
{
    public static List<int> Restock(int[] levels, int minimum)
    {
        List<int> indexes = [];

        for (int i = 0; i < levels.Length; i++)
        {
            if (levels[i] < minimum)
            {
                indexes.Add(i);
            }
        }

        return indexes;
    }
}

public static class Cart
{
    public static decimal Total((string Sku, int Quantity)[] lines, Dictionary<string, decimal> prices)
    {
        decimal total = 0m;

        foreach (var (sku, quantity) in lines)
        {
            if (prices.TryGetValue(sku, out decimal price))
            {
                total += price * quantity;
            }
        }

        return total;
    }
}
