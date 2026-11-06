// Top-level statements: Run executes these lines and prints the results; the tests ignore them.
long time = 0;
var breaker = new CircuitBreaker(failureThreshold: 2, openMs: 1_000, now: () => time);
for (var attempt = 0; attempt < 3; attempt++)
{
    try
    {
        await breaker.CallAsync(() => Task.FromException<string>(new TimeoutException("timeout")));
    }
    catch (Exception error)
    {
        Console.WriteLine($"{attempt} {error.Message} {breaker.State()}");
    }
}
time = 1_000;
var before = breaker.State();
var answer = await breaker.CallAsync(() => Task.FromResult("recovered"));
Console.WriteLine($"{before} {answer} {breaker.State()}");
int[] attempts = [0, 1, 2, 3, 4, 5];
Console.WriteLine(string.Join(", ", attempts.Select(attempt => Retry.BackoffDelay(attempt, baseMs: 100, capMs: 2_000, random: () => 0.5))));

public class CircuitBreaker
{
    private readonly int _failureThreshold;
    private readonly long _openMs;
    private readonly Func<long> _now;
    private int _failures;
    private long? _openedAt;
    private bool _trialRunning;

    public CircuitBreaker(int failureThreshold, long openMs, Func<long> now)
    {
        _failureThreshold = failureThreshold;
        _openMs = openMs;
        _now = now;
    }

    public string State()
    {
        if (_openedAt is null)
        {
            return "closed";
        }
        return _now() - _openedAt.Value >= _openMs ? "half-open" : "open";
    }

    public async Task<T> CallAsync<T>(Func<Task<T>> operation)
    {
        var state = State();
        if (state == "open" || (state == "half-open" && _trialRunning))
        {
            throw new InvalidOperationException("circuit open");
        }
        if (state == "half-open")
        {
            return await TrialAsync(operation);
        }
        try
        {
            var result = await operation();
            _failures = 0;
            return result;
        }
        catch (Exception)
        {
            _failures += 1;
            if (_failures >= _failureThreshold)
            {
                Open();
            }
            throw;
        }
    }

    private async Task<T> TrialAsync<T>(Func<Task<T>> operation)
    {
        _trialRunning = true;
        try
        {
            var result = await operation();
            _openedAt = null;
            return result;
        }
        catch (Exception)
        {
            Open();
            throw;
        }
        finally
        {
            _trialRunning = false;
        }
    }

    private void Open()
    {
        _openedAt = _now();
        _failures = 0;
    }
}

public static class Retry
{
    public static long BackoffDelay(int attempt, long baseMs, long capMs, Func<double> random) =>
        (long)Math.Floor(random() * Math.Min(capMs, baseMs * Math.Pow(2, attempt)));
}
