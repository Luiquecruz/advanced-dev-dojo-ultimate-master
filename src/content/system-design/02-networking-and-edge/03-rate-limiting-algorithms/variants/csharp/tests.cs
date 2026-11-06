using Dojo;

public static class RateLimiterTests
{
    private static bool[] Attempts(int count, Func<bool> call) => [.. Enumerable.Range(0, count).Select(_ => call())];

    [Test("a token bucket starts full, allows a burst up to its capacity and then rejects")]
    public static void AllowsABurstUpToCapacity()
    {
        long clock = 1_000;
        var bucket = new TokenBucket(capacity: 5, refillPerSecond: 1, now: () => clock);
        Assert.SequenceEqual([true, true, true, true, true, false], Attempts(6, () => bucket.TryRemove()));
        Assert.Equal(0.0, bucket.Available());
    }

    [Test("a token bucket refills lazily from the elapsed time, capped at its capacity")]
    public static void RefillsLazilyUpToCapacity()
    {
        long clock = 0;
        var bucket = new TokenBucket(capacity: 4, refillPerSecond: 2, now: () => clock);
        Assert.True(bucket.TryRemove(4));
        clock = 250;
        Assert.Equal(0.5, bucket.Available());
        clock = 1_000;
        Assert.Equal(2.0, bucket.Available());
        Assert.False(bucket.TryRemove(3));
        Assert.True(bucket.TryRemove(2));
        clock = 60_000;
        Assert.Equal(4.0, bucket.Available());
    }

    [Test("a sliding window counter allows the limit within a window and does not count rejected requests")]
    public static void AllowsTheLimitWithinAWindow()
    {
        long clock = 0;
        var limiter = new SlidingWindowCounter(limit: 3, windowMs: 1_000, now: () => clock);
        Assert.SequenceEqual([true, true, true, false, false], Attempts(5, limiter.Allow));
        clock = 1_500;
        Assert.SequenceEqual([true, true, false], Attempts(3, limiter.Allow));
    }

    // beginner mistake: a fixed window that resets at the boundary and lets a second full burst through
    [Test("the sliding window counter rejects the boundary burst a fixed window would allow")]
    public static void RejectsTheBoundaryBurst()
    {
        long clock = 59_000;
        var limiter = new SlidingWindowCounter(limit: 10, windowMs: 60_000, now: () => clock);
        Assert.True(Attempts(10, limiter.Allow).All(allowed => allowed));
        clock = 60_000;
        Assert.False(limiter.Allow());
        clock = 90_000;
        Assert.SequenceEqual([true, true, true, true, true, false], Attempts(6, limiter.Allow));
    }

    [Test("the sliding window counter forgets the previous count after a whole idle window")]
    public static void ForgetsThePreviousCountAfterAnIdleWindow()
    {
        long clock = 0;
        var limiter = new SlidingWindowCounter(limit: 4, windowMs: 1_000, now: () => clock);
        Attempts(4, limiter.Allow);
        clock = 2_100;
        Assert.SequenceEqual([true, true, true, true, false], Attempts(5, limiter.Allow));
    }
}
