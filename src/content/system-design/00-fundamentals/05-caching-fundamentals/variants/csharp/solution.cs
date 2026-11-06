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
    private readonly Dictionary<string, Entry> _entries = [];
    private int _hits;
    private int _misses;

    public async Task<TValue> GetAsync(string key)
    {
        if (_entries.TryGetValue(key, out var entry) && now() < entry.ExpiresAt)
        {
            _hits++;
            return entry.Value;
        }
        _misses++;
        _entries.Remove(key);
        var value = await load(key);
        _entries[key] = new Entry(value, now() + ttlMs);
        return value;
    }

    public void Invalidate(string key) => _entries.Remove(key);

    public CacheStats Stats()
    {
        var lookups = _hits + _misses;
        return new CacheStats(_hits, _misses, lookups == 0 ? 0 : (double)_hits / lookups);
    }

    private sealed record Entry(TValue Value, long ExpiresAt);
}
