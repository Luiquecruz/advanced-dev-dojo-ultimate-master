public sealed class Inventory
{
    private readonly Dictionary<string, int> _stock = new(StringComparer.OrdinalIgnoreCase);

    public void Receive(string sku, int quantity)
    {
        _stock[sku] = StockOf(sku) + quantity;
    }

    public int StockOf(string sku) => _stock.TryGetValue(sku, out int stock) ? stock : 0;

    public bool TryTake(string sku, int quantity)
    {
        if (!_stock.TryGetValue(sku, out int stock) || stock < quantity)
        {
            return false;
        }

        _stock[sku] = stock - quantity;
        return true;
    }

    public IReadOnlyDictionary<string, int> Snapshot() => new Dictionary<string, int>(_stock, StringComparer.OrdinalIgnoreCase);
}

public static class Skus
{
    public static IReadOnlyList<string> Duplicates(IEnumerable<string> skus)
    {
        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var duplicates = new List<string>();

        foreach (var sku in skus)
        {
            if (!seen.Add(sku))
            {
                duplicates.Add(sku);
            }
        }

        return duplicates;
    }
}
