using System.Threading;

public sealed record Envelope(Guid MessageId, string Body);

public interface IProcessedStore
{
    bool Contains(Guid messageId);
    void Add(Guid messageId);
}

public sealed class InMemoryProcessedStore : IProcessedStore
{
    private readonly HashSet<Guid> _ids = new();

    public bool Contains(Guid messageId) => _ids.Contains(messageId);

    public void Add(Guid messageId) => _ids.Add(messageId);
}

public sealed class PoisonMessageException(string message) : Exception(message);

public enum Outcome { Processed, Duplicate, DeadLettered }

public sealed class ReliableConsumer(
    IProcessedStore processed,
    Func<Envelope, CancellationToken, Task> handle,
    Func<TimeSpan, CancellationToken, Task> delay,
    int maxAttempts,
    TimeSpan firstDelay)
{
    public List<Envelope> DeadLetters { get; } = [];

    public async Task<Outcome> ConsumeAsync(Envelope envelope, CancellationToken cancellationToken)
    {
        if (processed.Contains(envelope.MessageId))
        {
            return Outcome.Duplicate;
        }

        // TODO: mark the id only after the handler succeeds, retry transient failures with doubling delays
        // (await delay(...), starting at firstDelay, up to maxAttempts attempts), and dead-letter poison
        // messages and messages that run out of attempts. Let OperationCanceledException through.
        processed.Add(envelope.MessageId);
        await handle(envelope, cancellationToken);
        return Outcome.Processed;
    }
}
