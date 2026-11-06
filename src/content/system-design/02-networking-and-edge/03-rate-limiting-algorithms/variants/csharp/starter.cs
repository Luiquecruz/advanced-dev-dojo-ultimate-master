// Top-level statements: Run executes these lines and prints the results; the tests ignore them.
long clock = 0;
var bucket = new TokenBucket(capacity: 3, refillPerSecond: 1, now: () => clock);
Console.WriteLine(string.Join(", ", Enumerable.Range(0, 4).Select(_ => bucket.TryRemove())));
clock = 2_000;
Console.WriteLine(bucket.Available());

var limiter = new SlidingWindowCounter(limit: 2, windowMs: 1_000, now: () => clock);
Console.WriteLine(string.Join(", ", Enumerable.Range(0, 3).Select(_ => limiter.Allow())));

public class TokenBucket
{
    private readonly double _capacity;
    private readonly double _refillPerSecond;
    private readonly Func<long> _now;
    private double _tokens;
    private long _last;

    public TokenBucket(double capacity, double refillPerSecond, Func<long> now)
    {
        _capacity = capacity;
        _refillPerSecond = refillPerSecond;
        _now = now;
        _tokens = capacity;
        _last = now();
    }

    public bool TryRemove(double tokens = 1)
    {
        Refill();
        if (_tokens < tokens)
        {
            return false;
        }
        _tokens -= tokens;
        return true;
    }

    public double Available()
    {
        Refill();
        return _tokens;
    }

    private void Refill()
    {
        // TODO: add the tokens earned since _last, capped at _capacity, and move _last to now
    }
}

public class SlidingWindowCounter
{
    private readonly int _limit;
    private readonly long _windowMs;
    private readonly Func<long> _now;
    private long _windowStart;
    private int _current;

    public SlidingWindowCounter(int limit, long windowMs, Func<long> now)
    {
        _limit = limit;
        _windowMs = windowMs;
        _now = now;
        _windowStart = StartOf(now());
    }

    public bool Allow()
    {
        var start = StartOf(_now());
        if (start != _windowStart)
        {
            _windowStart = start;
            _current = 0;
        }
        // TODO: keep the previous window's count and weight it by the part of it that still overlaps the sliding window
        if (_current >= _limit)
        {
            return false;
        }
        _current += 1;
        return true;
    }

    private long StartOf(long time) => (long)Math.Floor((double)time / _windowMs) * _windowMs;
}
