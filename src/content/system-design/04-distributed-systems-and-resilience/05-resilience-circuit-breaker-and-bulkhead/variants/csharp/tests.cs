using Dojo;

public static class CircuitBreakerTests
{
    private sealed class Clock
    {
        private long _time;

        public long Now() => _time;

        public void Advance(long milliseconds) => _time += milliseconds;
    }

    private sealed class Dependency(Func<Task<string>> reply)
    {
        public int Calls { get; private set; }

        public Task<string> Call()
        {
            Calls++;
            return reply();
        }
    }

    private static Dependency Failing() => new(() => Task.FromException<string>(new TimeoutException("timeout")));

    private static Dependency Answering(string result) => new(() => Task.FromResult(result));

    [Test("closed passes results and errors through, and only consecutive failures open the circuit")]
    public static async Task ClosedCountsConsecutiveFailures()
    {
        var clock = new Clock();
        var breaker = new CircuitBreaker(failureThreshold: 3, openMs: 1_000, now: clock.Now);
        Assert.Equal("closed", breaker.State());
        Assert.Equal("ok", await breaker.CallAsync(Answering("ok").Call));
        var down = Failing();
        Assert.Equal("timeout", (await Assert.ThrowsAsync<TimeoutException>(() => breaker.CallAsync(down.Call))).Message);
        Assert.Equal("timeout", (await Assert.ThrowsAsync<TimeoutException>(() => breaker.CallAsync(down.Call))).Message);
        await breaker.CallAsync(Answering("ok").Call);
        await Assert.ThrowsAsync<TimeoutException>(() => breaker.CallAsync(down.Call));
        await Assert.ThrowsAsync<TimeoutException>(() => breaker.CallAsync(down.Call));
        Assert.Equal("closed", breaker.State());
        Assert.Equal("timeout", (await Assert.ThrowsAsync<TimeoutException>(() => breaker.CallAsync(down.Call))).Message);
        Assert.Equal("open", breaker.State());
        Assert.Equal(5, down.Calls);
    }

    [Test("open fails fast with \"circuit open\" without calling the dependency until the open period has passed")]
    public static async Task OpenFailsFast()
    {
        var clock = new Clock();
        var breaker = new CircuitBreaker(failureThreshold: 2, openMs: 1_000, now: clock.Now);
        await Assert.ThrowsAsync<TimeoutException>(() => breaker.CallAsync(Failing().Call));
        await Assert.ThrowsAsync<TimeoutException>(() => breaker.CallAsync(Failing().Call));
        var dependency = Answering("ok");
        clock.Advance(999);
        Assert.Equal("circuit open", (await Assert.ThrowsAsync<InvalidOperationException>(() => breaker.CallAsync(dependency.Call))).Message);
        Assert.Equal(0, dependency.Calls);
        Assert.Equal("open", breaker.State());
        clock.Advance(1);
        Assert.Equal("half-open", breaker.State());
    }

    [Test("half-open allows one trial at a time and a successful trial closes the circuit")]
    public static async Task HalfOpenAllowsOneTrial()
    {
        var clock = new Clock();
        var breaker = new CircuitBreaker(failureThreshold: 1, openMs: 500, now: clock.Now);
        await Assert.ThrowsAsync<TimeoutException>(() => breaker.CallAsync(Failing().Call));
        clock.Advance(500);
        var recovery = new TaskCompletionSource<string>(TaskCreationOptions.RunContinuationsAsynchronously);
        var trial = breaker.CallAsync(() => recovery.Task);
        var other = Answering("other");
        Assert.Equal("circuit open", (await Assert.ThrowsAsync<InvalidOperationException>(() => breaker.CallAsync(other.Call))).Message);
        Assert.Equal(0, other.Calls);
        recovery.SetResult("recovered");
        Assert.Equal("recovered", await trial);
        Assert.Equal("closed", breaker.State());
        Assert.Equal("other", await breaker.CallAsync(other.Call));
    }

    [Test("a failed trial opens the circuit again for another open period")]
    public static async Task FailedTrialReopens()
    {
        var clock = new Clock();
        var breaker = new CircuitBreaker(failureThreshold: 2, openMs: 1_000, now: clock.Now);
        await Assert.ThrowsAsync<TimeoutException>(() => breaker.CallAsync(Failing().Call));
        await Assert.ThrowsAsync<TimeoutException>(() => breaker.CallAsync(Failing().Call));
        clock.Advance(1_000);
        Assert.Equal("timeout", (await Assert.ThrowsAsync<TimeoutException>(() => breaker.CallAsync(Failing().Call))).Message);
        Assert.Equal("open", breaker.State());
        clock.Advance(999);
        Assert.Equal("circuit open", (await Assert.ThrowsAsync<InvalidOperationException>(() => breaker.CallAsync(Answering("ok").Call))).Message);
        clock.Advance(1);
        Assert.Equal("ok", await breaker.CallAsync(Answering("ok").Call));
        Assert.Equal("closed", breaker.State());
    }

    // beginner mistake: retrying immediately or after a constant delay instead of exponential backoff with a cap and full jitter
    [Test("the backoff delay grows exponentially, is capped and is scaled by random()")]
    public static void BackoffGrowsAndIsCapped()
    {
        static long Delay(int attempt, double value) => Retry.BackoffDelay(attempt, baseMs: 100, capMs: 2_000, random: () => value);
        int[] attempts = [0, 1, 2, 3, 4];
        Assert.SequenceEqual([99, 199, 399, 799, 1_599], attempts.Select(attempt => Delay(attempt, 0.999_999)));
        Assert.Equal(1_999, Delay(5, 0.999_999));
        Assert.Equal(1_000, Delay(12, 0.5));
        Assert.Equal(200, Delay(3, 0.25));
        Assert.Equal(0, Delay(3, 0));
    }
}
