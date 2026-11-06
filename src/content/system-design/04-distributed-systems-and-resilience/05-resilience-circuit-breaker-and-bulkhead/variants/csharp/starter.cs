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

    public CircuitBreaker(int failureThreshold, long openMs, Func<long> now)
    {
        _failureThreshold = failureThreshold;
        _openMs = openMs;
        _now = now;
    }

    public string State()
    {
        // TODO: report "open" while _openMs has not passed since the circuit opened, then "half-open"
        return "closed";
    }

    public async Task<T> CallAsync<T>(Func<Task<T>> operation)
    {
        // TODO: while open (or while the half-open trial runs) throw new InvalidOperationException("circuit open") without calling operation
        // TODO: in half-open, one trial: success closes the circuit, failure opens it again
        try
        {
            var result = await operation();
            _failures = 0;
            return result;
        }
        catch (Exception)
        {
            _failures += 1;
            // TODO: open the circuit when _failures reaches _failureThreshold
            throw;
        }
    }
}

public static class Retry
{
    public static long BackoffDelay(int attempt, long baseMs, long capMs, Func<double> random)
    {
        // TODO: full jitter: random() times the exponential backoff baseMs * 2^attempt, capped at capMs, rounded down
        return baseMs;
    }
}
