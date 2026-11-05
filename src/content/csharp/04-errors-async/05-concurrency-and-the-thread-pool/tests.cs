using Dojo;
using System.Threading;

public sealed class HeldIssuer : ITokenIssuer
{
    private readonly TaskCompletionSource _answer = new(TaskCreationOptions.RunContinuationsAsynchronously);

    public int Calls { get; private set; }

    public bool FailNext { get; set; }

    public void Answer() => _answer.TrySetResult();

    public async Task<AccessToken> IssueAsync(CancellationToken cancellationToken)
    {
        Calls++;
        int call = Calls;
        await _answer.Task.WaitAsync(cancellationToken);
        await Task.Yield();
        if (FailNext)
        {
            FailNext = false;
            throw new InvalidOperationException("The identity server is unavailable.");
        }
        return new AccessToken($"token-{call}");
    }
}

public static class ConcurrencyTests
{
    // beginner mistake: refreshing without a gate, so every caller that finds no token asks the issuer
    [Test("TokenCache issues one token for callers that arrive together, and all of them get it")]
    public static async Task SingleFlight()
    {
        var issuer = new HeldIssuer();
        var cache = new TokenCache(issuer);
        Task<AccessToken> first = cache.GetAsync(CancellationToken.None);
        Task<AccessToken> second = cache.GetAsync(CancellationToken.None);
        Task<AccessToken> third = cache.GetAsync(CancellationToken.None);
        issuer.Answer();

        AccessToken[] tokens = await Task.WhenAll(first, second, third);
        Assert.Equal(1, issuer.Calls);
        Assert.SequenceEqual(["token-1", "token-1", "token-1"], tokens.Select(token => token.Value));
    }

    [Test("TokenCache issues a new token once after Invalidate")]
    public static async Task InvalidateRefreshesOnce()
    {
        var issuer = new HeldIssuer();
        issuer.Answer();
        var cache = new TokenCache(issuer);
        await cache.GetAsync(CancellationToken.None);
        cache.Invalidate();

        AccessToken[] tokens = await Task.WhenAll(cache.GetAsync(CancellationToken.None), cache.GetAsync(CancellationToken.None));
        Assert.Equal(2, issuer.Calls);
        Assert.Equal("token-2", tokens[0].Value);
        Assert.Equal("token-2", tokens[1].Value);
    }

    [Test("TokenCache passes a failed refresh to the caller and lets the next caller try again")]
    public static async Task FailedRefreshReleasesTheGate()
    {
        var issuer = new HeldIssuer { FailNext = true };
        issuer.Answer();
        var cache = new TokenCache(issuer);
        await Assert.ThrowsAsync<InvalidOperationException>(() => cache.GetAsync(CancellationToken.None));

        AccessToken token = await cache.GetAsync(CancellationToken.None);
        Assert.Equal("token-2", token.Value);
    }

    [Test("A caller waiting for the refresh can give up with its own token")]
    public static async Task WaitingCallerCancels()
    {
        var issuer = new HeldIssuer();
        var cache = new TokenCache(issuer);
        Task<AccessToken> refreshing = cache.GetAsync(CancellationToken.None);

        using var impatient = new CancellationTokenSource();
        Task<AccessToken> waiting = cache.GetAsync(impatient.Token);
        impatient.Cancel();
        await Assert.ThrowsAsync<OperationCanceledException>(() => waiting);

        issuer.Answer();
        Assert.Equal("token-1", (await refreshing).Value);
        Assert.Equal(1, issuer.Calls);
    }

    private static Func<Task<int>>[] CountingJobs(int count, Action<int> onStart, Action onEnd)
    {
        var jobs = new Func<Task<int>>[count];
        for (int index = 0; index < count; index++)
        {
            int value = index;
            jobs[index] = async () =>
            {
                onStart(value);
                await Task.Delay(5);
                onEnd();
                return value * 10;
            };
        }
        return jobs;
    }

    [Test("RunAllAsync never runs more than maxConcurrency jobs at once, but does use every slot")]
    public static async Task LimiterCapsInFlight()
    {
        int inFlight = 0;
        int peak = 0;
        var jobs = CountingJobs(10, _ => peak = Math.Max(peak, Interlocked.Increment(ref inFlight)), () => Interlocked.Decrement(ref inFlight));

        await Limited.RunAllAsync(jobs, 3);
        Assert.Equal(3, peak);
    }

    [Test("RunAllAsync returns the results in the order of the jobs and rejects a maxConcurrency below 1")]
    public static async Task LimiterKeepsOrderAndRejectsZero()
    {
        var jobs = CountingJobs(6, _ => { }, () => { });
        int[] results = await Limited.RunAllAsync(jobs, 2);
        Assert.SequenceEqual([0, 10, 20, 30, 40, 50], results);
        await Assert.ThrowsAsync<ArgumentOutOfRangeException>(() => Limited.RunAllAsync(CountingJobs(1, _ => { }, () => { }), 0));
    }
}
