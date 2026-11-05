using System.Threading;

public static class Reindexer
{
    public static async Task<int> RunAsync(IReadOnlyList<int> productIds, Func<int, CancellationToken, Task> indexOne, CancellationToken cancellationToken)
    {
        int done = 0;
        foreach (int id in productIds)
        {
            // TODO: stop before the next item once cancellation is requested, and pass the caller's token on.
            await indexOne(id, CancellationToken.None);
            done++;
        }
        return done;
    }
}

public static class Deadline
{
    public static async Task<T> WithTimeoutAsync<T>(Func<CancellationToken, Task<T>> operation, TimeSpan timeout, CancellationToken cancellationToken)
    {
        // TODO: link the caller's token with a deadline of your own (CancelAfter), pass the linked token to the operation,
        // and turn a cancellation caused by your deadline (not by the caller) into a TimeoutException.
        return await operation(cancellationToken);
    }
}
