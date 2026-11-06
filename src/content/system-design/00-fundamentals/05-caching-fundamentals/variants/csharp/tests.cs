using Dojo;

public sealed class FakeClock
{
    public long Now { get; set; }
}

public sealed class FakeDatabase
{
    public Dictionary<string, string> Rows { get; } = new() { ["product:1"] = "Keyboard 120", ["product:2"] = "Mouse 45" };

    public int Calls { get; private set; }

    public async Task<string> LoadAsync(string key)
    {
        Calls++;
        await Task.Yield();
        return Rows.TryGetValue(key, out var value) ? value : throw new KeyNotFoundException($"no row for {key}");
    }
}

public static class ReadThroughCacheTests
{
    private static (FakeClock Clock, FakeDatabase Database, ReadThroughCache<string> Cache) Setup(long ttlMs = 1000)
    {
        var clock = new FakeClock();
        var database = new FakeDatabase();
        var cache = new ReadThroughCache<string>(load: database.LoadAsync, ttlMs: ttlMs, now: () => clock.Now);
        return (clock, database, cache);
    }

    [Test("the first get is a miss that calls load; later gets within the TTL are hits")]
    public static async Task FirstGetMissesAndLaterGetsHit()
    {
        var (_, database, cache) = Setup();
        Assert.Equal(new CacheStats(0, 0, 0), cache.Stats());
        Assert.Equal("Keyboard 120", await cache.GetAsync("product:1"));
        Assert.Equal("Keyboard 120", await cache.GetAsync("product:1"));
        Assert.Equal("Keyboard 120", await cache.GetAsync("product:1"));
        Assert.Equal("Mouse 45", await cache.GetAsync("product:2"));
        Assert.Equal(2, database.Calls);
        Assert.Equal(new CacheStats(2, 2, 0.5), cache.Stats());
    }

    // beginner mistake: treating the cache as the primary store, so a cached value is served forever and the source of truth is never read again
    [Test("an entry expires one TTL after it was stored, and the next get loads the new value from the source")]
    public static async Task EntryExpiresAfterOneTtl()
    {
        var (clock, database, cache) = Setup(ttlMs: 1000);
        clock.Now = 2000;
        await cache.GetAsync("product:1");
        database.Rows["product:1"] = "Keyboard 99";
        clock.Now = 2999;
        Assert.Equal("Keyboard 120", await cache.GetAsync("product:1"));
        clock.Now = 3000;
        Assert.Equal("Keyboard 99", await cache.GetAsync("product:1"));
        Assert.Equal(2, database.Calls);
        Assert.Equal(new CacheStats(1, 2, 1.0 / 3), cache.Stats());
    }

    [Test("invalidate(key) makes the next get of that key a miss, and leaves other keys cached")]
    public static async Task InvalidateForgetsOnlyThatKey()
    {
        var (_, database, cache) = Setup();
        await cache.GetAsync("product:1");
        await cache.GetAsync("product:2");
        database.Rows["product:1"] = "Keyboard 99";
        cache.Invalidate("product:1");
        Assert.Equal("Keyboard 99", await cache.GetAsync("product:1"));
        Assert.Equal("Mouse 45", await cache.GetAsync("product:2"));
        Assert.Equal(3, database.Calls);
        var stats = cache.Stats();
        Assert.Equal((1, 3), (stats.Hits, stats.Misses));
    }

    [Test("a failed load fails the get, counts as a miss and caches nothing")]
    public static async Task FailedLoadCachesNothing()
    {
        var (_, database, cache) = Setup();
        var error = await Assert.ThrowsAsync<KeyNotFoundException>(() => cache.GetAsync("product:9"));
        Assert.Contains("no row for product:9", error.Message);
        database.Rows["product:9"] = "Monitor 340";
        Assert.Equal("Monitor 340", await cache.GetAsync("product:9"));
        Assert.Equal(2, database.Calls);
        var stats = cache.Stats();
        Assert.Equal((0, 2), (stats.Hits, stats.Misses));
    }
}
