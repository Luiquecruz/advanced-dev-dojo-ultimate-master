using Dojo;
using System.Threading;

public static class ReliableConsumerTests
{
    private static readonly TimeSpan Second = TimeSpan.FromSeconds(1);

    private static Envelope NewMessage() => new(Guid.NewGuid(), """{"orderId":42}""");

    private static Func<TimeSpan, CancellationToken, Task> Recorder(List<TimeSpan> delays) =>
        (duration, token) => { delays.Add(duration); return Task.CompletedTask; };

    /// <summary>A handler that throws <paramref name="failure"/> on its first <paramref name="failures"/> calls.</summary>
    private static Func<Envelope, CancellationToken, Task> FailingTimes(int failures, Func<Exception> failure, List<int> calls) =>
        (envelope, token) =>
        {
            calls.Add(calls.Count + 1);
            return calls.Count <= failures ? throw failure() : Task.CompletedTask;
        };

    [Test("A new message is processed once, and a redelivery is a duplicate, even for another consumer on the same store")]
    public static async Task DeduplicatesThroughTheStore()
    {
        var store = new InMemoryProcessedStore();
        var calls = new List<int>();
        var delays = new List<TimeSpan>();
        Envelope message = NewMessage();

        var first = new ReliableConsumer(store, FailingTimes(0, () => new TimeoutException(), calls), Recorder(delays), 3, Second);
        var second = new ReliableConsumer(store, FailingTimes(0, () => new TimeoutException(), calls), Recorder(delays), 3, Second);

        Assert.Equal(Outcome.Processed, await first.ConsumeAsync(message, CancellationToken.None));
        Assert.Equal(Outcome.Duplicate, await first.ConsumeAsync(message, CancellationToken.None));
        Assert.Equal(Outcome.Duplicate, await second.ConsumeAsync(message, CancellationToken.None));
        Assert.Equal(1, calls.Count);
    }

    [Test("Transient failures are retried after doubling delays (1 s, 2 s, 4 s) until the handler succeeds")]
    public static async Task RetriesWithBackoff()
    {
        var calls = new List<int>();
        var delays = new List<TimeSpan>();
        var consumer = new ReliableConsumer(new InMemoryProcessedStore(), FailingTimes(3, () => new TimeoutException(), calls), Recorder(delays), 5, Second);

        Assert.Equal(Outcome.Processed, await consumer.ConsumeAsync(NewMessage(), CancellationToken.None));
        Assert.Equal(4, calls.Count);
        Assert.SequenceEqual([Second, 2 * Second, 4 * Second], delays);
        Assert.Equal(0, consumer.DeadLetters.Count);
    }

    [Test("After maxAttempts failed attempts the message is dead-lettered, without a wait after the last one")]
    public static async Task DeadLettersAfterMaxAttempts()
    {
        var calls = new List<int>();
        var delays = new List<TimeSpan>();
        var consumer = new ReliableConsumer(new InMemoryProcessedStore(), FailingTimes(int.MaxValue, () => new TimeoutException(), calls), Recorder(delays), 3, Second);
        Envelope message = NewMessage();

        Assert.Equal(Outcome.DeadLettered, await consumer.ConsumeAsync(message, CancellationToken.None));
        Assert.Equal(3, calls.Count);
        Assert.SequenceEqual([Second, 2 * Second], delays);
        Assert.SequenceEqual([message], consumer.DeadLetters);
    }

    [Test("A poison message is dead-lettered at once, with no retry and no delay")]
    public static async Task PoisonGoesStraightToDeadLetters()
    {
        var calls = new List<int>();
        var delays = new List<TimeSpan>();
        var consumer = new ReliableConsumer(new InMemoryProcessedStore(), FailingTimes(int.MaxValue, () => new PoisonMessageException("unknown SKU"), calls), Recorder(delays), 5, Second);

        Assert.Equal(Outcome.DeadLettered, await consumer.ConsumeAsync(NewMessage(), CancellationToken.None));
        Assert.Equal(1, calls.Count);
        Assert.Equal(0, delays.Count);
        Assert.Equal(1, consumer.DeadLetters.Count);
    }

    // beginner mistake: adding the id to the processed store before the handler has succeeded
    [Test("A message that failed is not marked processed, so its fixed resubmission is processed")]
    public static async Task FailedMessageCanBeResubmitted()
    {
        var store = new InMemoryProcessedStore();
        var calls = new List<int>();
        var consumer = new ReliableConsumer(store, FailingTimes(1, () => new PoisonMessageException("missing SKU"), calls), Recorder([]), 3, Second);
        Envelope message = NewMessage();

        Assert.Equal(Outcome.DeadLettered, await consumer.ConsumeAsync(message, CancellationToken.None));
        Assert.False(store.Contains(message.MessageId), "a dead-lettered message is not marked processed");
        Assert.Equal(Outcome.Processed, await consumer.ConsumeAsync(message, CancellationToken.None));
        Assert.True(store.Contains(message.MessageId), "a processed message is marked");
    }

    [Test("Cancellation propagates as OperationCanceledException, without retry or dead letter")]
    public static async Task CancellationIsNotRetried()
    {
        var calls = new List<int>();
        var delays = new List<TimeSpan>();
        var consumer = new ReliableConsumer(new InMemoryProcessedStore(), FailingTimes(int.MaxValue, () => new OperationCanceledException(), calls), Recorder(delays), 3, Second);

        await Assert.ThrowsAsync<OperationCanceledException>(() => consumer.ConsumeAsync(NewMessage(), CancellationToken.None));
        Assert.Equal(1, calls.Count);
        Assert.Equal(0, delays.Count);
        Assert.Equal(0, consumer.DeadLetters.Count);
    }
}
