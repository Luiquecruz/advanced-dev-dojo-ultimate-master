public interface IPriceSource
{
    Task<decimal> GetPriceAsync(string sku);
}

public static class Prices
{
    public static async Task<Dictionary<string, decimal>> GetAllAsync(IPriceSource source, IReadOnlyList<string> skus)
    {
        var tasks = new List<Task<decimal>>();
        foreach (string sku in skus)
        {
            tasks.Add(source.GetPriceAsync(sku));
        }

        decimal[] prices = await Task.WhenAll(tasks);

        var result = new Dictionary<string, decimal>();
        for (int index = 0; index < skus.Count; index++)
        {
            result[skus[index]] = prices[index];
        }
        return result;
    }

    public static async Task<decimal?> TryGetAsync(IPriceSource source, string sku)
    {
        try
        {
            return await source.GetPriceAsync(sku);
        }
        catch (KeyNotFoundException)
        {
            return null;
        }
    }
}

public sealed class PriceCache(IPriceSource source)
{
    private readonly Dictionary<string, decimal> _prices = [];

    public ValueTask<decimal> GetAsync(string sku)
    {
        if (_prices.TryGetValue(sku, out decimal price))
        {
            return new ValueTask<decimal>(price);
        }
        return new ValueTask<decimal>(LoadAsync(sku));
    }

    private async Task<decimal> LoadAsync(string sku)
    {
        decimal price = await source.GetPriceAsync(sku);
        _prices[sku] = price;
        return price;
    }
}
