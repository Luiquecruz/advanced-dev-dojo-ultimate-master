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
        var time = _now();
        _tokens = Math.Min(_capacity, _tokens + (time - _last) * _refillPerSecond / 1000);
        _last = time;
    }
}

public class SlidingWindowCounter
{
    private readonly int _limit;
    private readonly long _windowMs;
    private readonly Func<long> _now;
    private long _windowStart;
    private int _current;
    private int _previous;

    public SlidingWindowCounter(int limit, long windowMs, Func<long> now)
    {
        _limit = limit;
        _windowMs = windowMs;
        _now = now;
        _windowStart = StartOf(now());
    }

    public bool Allow()
    {
        var time = _now();
        var start = StartOf(time);
        if (start != _windowStart)
        {
            _previous = start - _windowStart == _windowMs ? _current : 0;
            _current = 0;
            _windowStart = start;
        }
        var estimate = (double)_previous * (_windowMs - (time - start)) / _windowMs + _current;
        if (estimate >= _limit)
        {
            return false;
        }
        _current += 1;
        return true;
    }

    private long StartOf(long time) => (long)Math.Floor((double)time / _windowMs) * _windowMs;
}
