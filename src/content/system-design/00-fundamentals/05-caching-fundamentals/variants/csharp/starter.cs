// Top-level statements: Run executes these lines and prints the results; the tests ignore them.
long clock = 0;
var database = new Dictionary<string, string> { ["product:1"] = "Keyboard 120" };
var cache = new ReadThroughCache<string>(
    load: key => Task.FromResult(database.GetValueOrDefault(key, "not found")),
    ttlMs: 60_000,
    now: () => clock);
Console.WriteLine(await cache.GetAsync("product:1"));
Console.WriteLine(await cache.GetAsync("product:1"));
database["product:1"] = "Keyboard 99";
clock = 60_000;
Console.WriteLine(await cache.GetAsync("product:1"));
Console.WriteLine(cache.Stats());

public record CacheStats(int Hits, int Misses, double HitRatio);

public class ReadThroughCache<TValue>(Func<string, Task<TValue>> load, long ttlMs, Func<long> now)
{
    // TODO: store when each entry expires, so the source of truth is read again after ttlMs
    private readonly Dictionary<string, TValue> _entries = [];
    private int _hits;
    private int _misses;

    public async Task<TValue> GetAsync(string key)
    {
        if (_entries.TryGetValue(key, out var cached))
        {
            _hits++;
            return cached;
        }
        _misses++;
        var value = await load(key);
        _entries[key] = value;
        return value;
    }

    public void Invalidate(string key)
    {
        // TODO: forget the cached value so the next GetAsync loads it again
    }

    public CacheStats Stats()
    {
        // TODO: HitRatio is hits / (hits + misses), or 0 before any lookup
        return new CacheStats(_hits, _misses, 0);
    }
}
