using Dojo;

public static class CacheAsideTests
{
    private sealed class Clock
    {
        public long Now { get; set; }
    }

    /// <summary>
    /// The load given to the cache: it records every key it is called with and answers $"{key}@{clock.Now}" right away,
    /// unless a task was queued with AnswerNext (the oldest is used first) or every call waits for the same gate.
    /// </summary>
    private sealed class Load(Clock clock, Task<string>? gate)
    {
        private readonly Queue<Task<string>> _queued = new();

        public List<string> Calls { get; } = [];

        public void AnswerNext(TaskCompletionSource<string> answer) => _queued.Enqueue(answer.Task);

        public Task<string> CallAsync(string key)
        {
            Calls.Add(key);
            if (_queued.TryDequeue(out var answer))
            {
                return answer;
            }
            return gate ?? Task.FromResult($"{key}@{clock.Now}");
        }
    }

    private static (Clock Clock, Load Load, CacheAside<string> Cache) Setup(long ttlMs = 1000, long jitterMs = 500, double[]? randoms = null, Task<string>? gate = null)
    {
        var clock = new Clock();
        var queue = new Queue<double>(randoms ?? [0.5]);
        var load = new Load(clock, gate);
        var cache = new CacheAside<string>(
            load: load.CallAsync,
            ttlMs: ttlMs,
            jitterMs: jitterMs,
            now: () => clock.Now,
            random: () => queue.Count > 1 ? queue.Dequeue() : queue.Peek());
        return (clock, load, cache);
    }

    [Test("a miss loads the key, and the value is served from the cache until its jittered expiry")]
    public static async Task ServesTheValueUntilItsJitteredExpiry()
    {
        var (clock, load, cache) = Setup(ttlMs: 1000, jitterMs: 500, randoms: [0.5]);
        Assert.Equal("user:1@0", await cache.GetAsync("user:1"));
        Assert.SequenceEqual(["user:1"], load.Calls);
        clock.Now = 1249;
        Assert.Equal("user:1@0", await cache.GetAsync("user:1"));
        Assert.Equal(1, load.Calls.Count, "load calls");
        clock.Now = 1250;
        Assert.Equal("user:1@1250", await cache.GetAsync("user:1"));
        Assert.Equal("user:2@1250", await cache.GetAsync("user:2"));
        Assert.Equal(3, load.Calls.Count, "load calls");
    }

    // beginner mistake: every concurrent miss calls load, so a hot key expiring stampedes the database
    [Test("100 concurrent gets on a cold key call load exactly once and share its value")]
    public static async Task CoalescesConcurrentMisses()
    {
        var gate = new TaskCompletionSource<string>();
        var (_, load, cache) = Setup(gate: gate.Task);
        var pending = Enumerable.Range(0, 100).Select(_ => cache.GetAsync("product:7")).ToArray();
        Assert.Equal(1, load.Calls.Count, "load calls");
        gate.SetResult("keyboard");
        Assert.SequenceEqual(Enumerable.Repeat("keyboard", 100), await Task.WhenAll(pending));
        Assert.Equal("keyboard", await cache.GetAsync("product:7"));
        Assert.Equal(1, load.Calls.Count, "load calls");
    }

    [Test("a rejected load fails every waiting get, is not cached, and the next get retries")]
    public static async Task AFailedLoadIsNotCached()
    {
        var (_, load, cache) = Setup();
        var failure = new TaskCompletionSource<string>();
        load.AnswerNext(failure);
        var waiting = Enumerable.Range(0, 3).Select(_ => cache.GetAsync("user:1")).ToArray();
        failure.SetException(new TimeoutException("database timeout"));
        foreach (var task in waiting)
        {
            var error = await Assert.ThrowsAsync<TimeoutException>(() => task);
            Assert.Equal("database timeout", error.Message);
        }
        Assert.Equal(1, load.Calls.Count, "load calls");
        Assert.Equal("user:1@0", await cache.GetAsync("user:1"));
        Assert.Equal(2, load.Calls.Count, "load calls");
    }

    [Test("jitter gives entries loaded together different expiry times")]
    public static async Task JitterSpreadsTheExpiries()
    {
        var (clock, load, cache) = Setup(ttlMs: 1000, jitterMs: 500, randoms: [0, 0.999]);
        await cache.GetAsync("a");
        await cache.GetAsync("b");
        clock.Now = 1000;
        Assert.Equal("a@1000", await cache.GetAsync("a"));
        Assert.Equal("b@0", await cache.GetAsync("b"));
        clock.Now = 1499;
        Assert.Equal("b@1499", await cache.GetAsync("b"));
        Assert.Equal(4, load.Calls.Count, "load calls");
    }

    [Test("invalidate drops the cached value and the in-flight load, whose late result is never stored")]
    public static async Task InvalidateDropsTheValueAndTheLoad()
    {
        var (clock, load, cache) = Setup();
        Assert.Equal("user:1@0", await cache.GetAsync("user:1"));
        clock.Now = 10;
        cache.Invalidate("user:1");
        Assert.Equal("user:1@10", await cache.GetAsync("user:1"));
        Assert.Equal(2, load.Calls.Count, "load calls");

        var slow = new TaskCompletionSource<string>();
        load.AnswerNext(slow);
        var stale = cache.GetAsync("user:2");
        cache.Invalidate("user:2");
        var fresh = cache.GetAsync("user:2");
        Assert.Equal(4, load.Calls.Count, "load calls");
        Assert.Equal("user:2@10", await fresh);
        slow.SetResult("old row");
        Assert.Equal("old row", await stale);
        Assert.Equal("user:2@10", await cache.GetAsync("user:2"));
        Assert.Equal(4, load.Calls.Count, "load calls");
    }

    [Test("forgotten loads that settle while a newer load is in flight, by value or by error, leave the newer load in charge")]
    public static async Task ForgottenLoadsLeaveTheNewerLoadInCharge()
    {
        var (_, load, cache) = Setup();
        var first = new TaskCompletionSource<string>();
        var second = new TaskCompletionSource<string>();
        var third = new TaskCompletionSource<string>();
        load.AnswerNext(first);
        load.AnswerNext(second);
        load.AnswerNext(third);
        var resolvesLate = cache.GetAsync("user:3");
        cache.Invalidate("user:3");
        var rejectsLate = cache.GetAsync("user:3");
        cache.Invalidate("user:3");
        var current = cache.GetAsync("user:3");
        Assert.Equal(3, load.Calls.Count, "load calls");
        first.SetResult("old row");
        Assert.Equal("old row", await resolvesLate);
        second.SetException(new TimeoutException("database timeout"));
        var error = await Assert.ThrowsAsync<TimeoutException>(() => rejectsLate);
        Assert.Equal("database timeout", error.Message);
        var joined = cache.GetAsync("user:3");
        Assert.Equal(3, load.Calls.Count, "load calls");
        third.SetResult("new row");
        Assert.Equal("new row", await current);
        Assert.Equal("new row", await joined);
        Assert.Equal("new row", await cache.GetAsync("user:3"));
        Assert.Equal(3, load.Calls.Count, "load calls");
    }
}
