using Dojo;
using System.Threading;

public static class CancellationTests
{
    [Test("RunAsync indexes every product and returns the count")]
    public static async Task RunIndexesEverything()
    {
        var indexed = new List<int>();
        int done = await Reindexer.RunAsync([1, 2, 3], (id, token) => { indexed.Add(id); return Task.CompletedTask; }, CancellationToken.None);
        Assert.Equal(3, done);
        Assert.SequenceEqual([1, 2, 3], indexed);
    }

    // beginner mistake: accepting a token and calling the work with CancellationToken.None instead of forwarding it
    [Test("RunAsync passes the caller's token to every call")]
    public static async Task RunForwardsToken()
    {
        using var source = new CancellationTokenSource();
        var received = new List<CancellationToken>();
        await Reindexer.RunAsync([1, 2], (id, token) => { received.Add(token); return Task.CompletedTask; }, source.Token);
        Assert.Equal(2, received.Count);
        Assert.True(received.All(token => token == source.Token), "every call receives the caller's token, not CancellationToken.None");
    }

    [Test("RunAsync stops before the next product once the caller cancels")]
    public static async Task RunStopsBetweenItems()
    {
        using var source = new CancellationTokenSource();
        var indexed = new List<int>();
        Task Index(int id, CancellationToken token)
        {
            indexed.Add(id);
            if (id == 2)
            {
                source.Cancel();
            }
            return Task.CompletedTask;
        }

        await Assert.ThrowsAsync<OperationCanceledException>(() => Reindexer.RunAsync([1, 2, 3, 4], Index, source.Token));
        Assert.SequenceEqual([1, 2], indexed);
    }

    [Test("WithTimeoutAsync returns the result when the operation finishes in time")]
    public static async Task DeadlineReturnsResult()
    {
        int result = await Deadline.WithTimeoutAsync(async token => { await Task.Delay(1, token); return 42; }, TimeSpan.FromSeconds(5), CancellationToken.None);
        Assert.Equal(42, result);
    }

    [Test("WithTimeoutAsync throws TimeoutException when its own deadline fires, and cancels the operation's token")]
    public static async Task DeadlineThrowsTimeout()
    {
        CancellationToken seen = default;
        async Task<int> Slow(CancellationToken token)
        {
            seen = token;
            await Task.Delay(TimeSpan.FromSeconds(1), token);
            return 1;
        }

        var error = await Assert.ThrowsAsync<TimeoutException>(() => Deadline.WithTimeoutAsync(Slow, TimeSpan.FromMilliseconds(30), CancellationToken.None));
        Assert.True(seen.IsCancellationRequested, "the operation's token is cancelled, so the work really stops");
        Assert.True(error.InnerException is OperationCanceledException, "InnerException should be the OperationCanceledException");
    }

    [Test("WithTimeoutAsync lets the caller's cancellation, and any cancellation before its deadline, through as OperationCanceledException")]
    public static async Task DeadlineKeepsCallerCancellation()
    {
        using var caller = new CancellationTokenSource();
        caller.CancelAfter(TimeSpan.FromMilliseconds(30));
        await Assert.ThrowsAsync<OperationCanceledException>(() =>
            Deadline.WithTimeoutAsync(async token => { await Task.Delay(TimeSpan.FromSeconds(1), token); return 1; }, TimeSpan.FromSeconds(5), caller.Token));
        await Assert.ThrowsAsync<OperationCanceledException>(() =>
            Deadline.WithTimeoutAsync<int>(token => throw new OperationCanceledException("the client's own timeout"), TimeSpan.FromSeconds(5), CancellationToken.None));
    }
}
