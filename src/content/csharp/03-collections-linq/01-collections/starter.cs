public sealed class Inventory
{
    // TODO: choose the collection that stores the stock per SKU, ignoring case.

    public void Receive(string sku, int quantity)
    {
        // TODO: add quantity to the stock of sku.
    }

    public int StockOf(string sku)
    {
        // TODO: return the stock, or 0 for an unknown SKU.
        return 0;
    }

    public bool TryTake(string sku, int quantity)
    {
        // TODO: remove the quantity only when there is enough stock.
        return false;
    }

    public IReadOnlyDictionary<string, int> Snapshot()
    {
        // TODO: return the stock per SKU as it is now.
        return new Dictionary<string, int>();
    }
}

public static class Skus
{
    public static IReadOnlyList<string> Duplicates(IEnumerable<string> skus)
    {
        // TODO: return each SKU seen before, ignoring case, in the order the repeats occur.
        return [];
    }
}
