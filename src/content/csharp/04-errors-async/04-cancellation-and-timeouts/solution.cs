using System.Threading;

public static class Reindexer
{
    public static async Task<int> RunAsync(IReadOnlyList<int> productIds, Func<int, CancellationToken, Task> indexOne, CancellationToken cancellationToken)
    {
        int done = 0;
        foreach (int id in productIds)
        {
            cancellationToken.ThrowIfCancellationRequested();
            await indexOne(id, cancellationToken);
            done++;
        }
        return done;
    }
}

public static class Deadline
{
    public static async Task<T> WithTimeoutAsync<T>(Func<CancellationToken, Task<T>> operation, TimeSpan timeout, CancellationToken cancellationToken)
    {
        using var timeoutSource = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        timeoutSource.CancelAfter(timeout);

        try
        {
            return await operation(timeoutSource.Token);
        }
        catch (OperationCanceledException ex) when (timeoutSource.IsCancellationRequested && !cancellationToken.IsCancellationRequested)
        {
            throw new TimeoutException($"The operation did not finish within {timeout.TotalMilliseconds} ms.", ex);
        }
    }
}
