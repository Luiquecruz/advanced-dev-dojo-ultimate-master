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

        TimeSpan wait = firstDelay;
        for (int attempt = 1; ; attempt++)
        {
            try
            {
                await handle(envelope, cancellationToken);
                processed.Add(envelope.MessageId);
                return Outcome.Processed;
            }
            catch (PoisonMessageException)
            {
                DeadLetters.Add(envelope);
                return Outcome.DeadLettered;
            }
            catch (Exception exception) when (exception is not OperationCanceledException)
            {
                if (attempt >= maxAttempts)
                {
                    DeadLetters.Add(envelope);
                    return Outcome.DeadLettered;
                }
            }

            await delay(wait, cancellationToken);
            wait *= 2;
        }
    }
}
