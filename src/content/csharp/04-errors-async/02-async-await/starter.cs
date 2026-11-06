public interface IPriceSource
{
    Task<decimal> GetPriceAsync(string sku);
}

public static class Prices
{
    public static async Task<Dictionary<string, decimal>> GetAllAsync(IPriceSource source, IReadOnlyList<string> skus)
    {
        var result = new Dictionary<string, decimal>();
        foreach (string sku in skus)
        {
            // TODO: this waits for each price before asking for the next one. Start every request first.
            result[sku] = await source.GetPriceAsync(sku);
        }
        return result;
    }

    public static async Task<decimal?> TryGetAsync(IPriceSource source, string sku)
    {
        // TODO: return the price, or null when the source throws KeyNotFoundException. Let other exceptions through.
        await Task.CompletedTask;
        throw new NotImplementedException();
    }
}

public sealed class PriceCache(IPriceSource source)
{
    private readonly Dictionary<string, decimal> _prices = [];

    public ValueTask<decimal> GetAsync(string sku)
    {
        // TODO: return a completed ValueTask for a cached price; otherwise load it from the source once and remember it.
        throw new NotImplementedException();
    }
}
