// Top-level statements: Run executes these lines and prints the results; the tests ignore them.
var clock = 0L;
var cache = new CacheAside<string>(
    load: key => Task.FromResult($"profile of {key}"),
    ttlMs: 60000,
    jitterMs: 5000,
    now: () => clock,
    random: Random.Shared.NextDouble);
var both = await Task.WhenAll(cache.GetAsync("user:1"), cache.GetAsync("user:1"));
clock += 1000;
Console.WriteLine($"{both[0]} | {both[1]} | {await cache.GetAsync("user:1")}");

public class CacheAside<TValue>
{
    private readonly Func<string, Task<TValue>> _load;
    private readonly long _ttlMs;
    private readonly long _jitterMs;
    private readonly Func<long> _now;
    private readonly Func<double> _random;
    private readonly Dictionary<string, Entry> _entries = [];
    private readonly Dictionary<string, Task<TValue>> _inFlight = [];

    public CacheAside(Func<string, Task<TValue>> load, long ttlMs, long jitterMs, Func<long> now, Func<double> random)
    {
        _load = load;
        _ttlMs = ttlMs;
        _jitterMs = jitterMs;
        _now = now;
        _random = random;
    }

    public async Task<TValue> GetAsync(string key)
    {
        if (_entries.TryGetValue(key, out var entry) && _now() < entry.ExpiresAt)
        {
            return entry.Value;
        }
        if (_inFlight.TryGetValue(key, out var pending))
        {
            return await pending;
        }
        var loading = _load(key);
        _inFlight[key] = loading;
        TValue value;
        try
        {
            value = await loading;
        }
        catch
        {
            ForgetIfCurrent(key, loading);
            throw;
        }
        if (ForgetIfCurrent(key, loading))
        {
            var jitter = (long)Math.Floor(_random() * _jitterMs);
            _entries[key] = new Entry(value, _now() + _ttlMs + jitter);
        }
        return value;
    }

    public void Invalidate(string key)
    {
        _entries.Remove(key);
        _inFlight.Remove(key);
    }

    private bool ForgetIfCurrent(string key, Task<TValue> loading)
    {
        if (!_inFlight.TryGetValue(key, out var current) || current != loading)
        {
            return false;
        }
        _inFlight.Remove(key);
        return true;
    }

    private sealed record Entry(TValue Value, long ExpiresAt);
}
