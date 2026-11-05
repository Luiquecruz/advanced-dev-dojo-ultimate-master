using Dojo;

public sealed class FakePriceSource : IPriceSource
{
    private readonly TaskCompletionSource _gate = new(TaskCreationOptions.RunContinuationsAsynchronously);
    private readonly Dictionary<string, decimal> _prices = new() { ["MUG"] = 12.5m, ["BAG"] = 30m, ["HAT"] = 8m };

    public FakePriceSource(bool holdAnswers = false)
    {
        if (!holdAnswers)
        {
            _gate.SetResult();
        }
    }

    public List<string> Requests { get; } = [];

    public void Answer() => _gate.TrySetResult();

    public async Task<decimal> GetPriceAsync(string sku)
    {
        Requests.Add(sku);
        await _gate.Task;
        await Task.Yield();
        if (sku == "DOWN")
        {
            throw new InvalidOperationException("The price service is unavailable.");
        }
        return _prices.TryGetValue(sku, out decimal price) ? price : throw new KeyNotFoundException($"No price for {sku}.");
    }
}

public static class AsyncAwaitTests
{
    [Test("GetAllAsync returns every price by SKU")]
    public static async Task GetAllReturnsPrices()
    {
        Dictionary<string, decimal> prices = await Prices.GetAllAsync(new FakePriceSource(), ["MUG", "BAG", "HAT"]);
        Assert.Equal(3, prices.Count);
        Assert.Equal(12.5m, prices["MUG"]);
        Assert.Equal(30m, prices["BAG"]);
        Assert.Equal(8m, prices["HAT"]);
    }

    // beginner mistake: awaiting each request inside the loop, so the next one starts only after the previous answer
    [Test("GetAllAsync starts every request before waiting for the first answer")]
    public static async Task GetAllStartsEveryRequest()
    {
        var source = new FakePriceSource(holdAnswers: true);
        Task<Dictionary<string, decimal>> pending = Prices.GetAllAsync(source, ["MUG", "BAG", "HAT"]);
        Assert.SequenceEqual(["MUG", "BAG", "HAT"], source.Requests, "requests started before any price arrived");
        source.Answer();
        Assert.Equal(3, (await pending).Count);
    }

    [Test("GetAllAsync fails with the exception of a failed request")]
    public static async Task GetAllPropagatesFailure()
    {
        await Assert.ThrowsAsync<KeyNotFoundException>(() => Prices.GetAllAsync(new FakePriceSource(), ["MUG", "NOPE"]));
    }

    [Test("TryGetAsync returns the price, null for an unknown SKU, and lets other failures through")]
    public static async Task TryGetReturnsNullAndLetsOtherFailuresThrough()
    {
        var source = new FakePriceSource();
        Assert.Equal(8m, await Prices.TryGetAsync(source, "HAT"));
        Assert.Null(await Prices.TryGetAsync(source, "NOPE"));
        var error = await Assert.ThrowsAsync<InvalidOperationException>(() => Prices.TryGetAsync(source, "DOWN"));
        Assert.Contains("unavailable", error.Message);
    }

    [Test("PriceCache asks the source once and then answers with an already completed ValueTask")]
    public static async Task PriceCacheCompletesSynchronously()
    {
        var source = new FakePriceSource();
        var cache = new PriceCache(source);
        Assert.Equal(30m, await cache.GetAsync("BAG"));

        ValueTask<decimal> cached = cache.GetAsync("BAG");
        Assert.True(cached.IsCompletedSuccessfully, "a cached price needs no waiting");
        Assert.Equal(30m, await cached);
        Assert.SequenceEqual(["BAG"], source.Requests);
    }

    [Test("PriceCache does not cache a failed load")]
    public static async Task PriceCacheSkipsFailures()
    {
        var source = new FakePriceSource();
        var cache = new PriceCache(source);
        await Assert.ThrowsAsync<KeyNotFoundException>(async () => await cache.GetAsync("NOPE"));
        await Assert.ThrowsAsync<KeyNotFoundException>(async () => await cache.GetAsync("NOPE"));
        Assert.Equal(2, source.Requests.Count);
    }
}
