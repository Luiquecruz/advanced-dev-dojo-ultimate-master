using System.Threading;

public sealed record AccessToken(string Value);

public interface ITokenIssuer
{
    Task<AccessToken> IssueAsync(CancellationToken cancellationToken);
}

public sealed class TokenCache(ITokenIssuer issuer)
{
    private readonly SemaphoreSlim _refreshGate = new(1, 1);
    private AccessToken? _token;

    public async Task<AccessToken> GetAsync(CancellationToken cancellationToken)
    {
        if (_token is { } current)
        {
            return current;
        }

        await _refreshGate.WaitAsync(cancellationToken);
        try
        {
            _token ??= await issuer.IssueAsync(cancellationToken);
            return _token;
        }
        finally
        {
            _refreshGate.Release();
        }
    }

    public void Invalidate() => _token = null;
}

public static class Limited
{
    public static async Task<T[]> RunAllAsync<T>(IReadOnlyList<Func<Task<T>>> jobs, int maxConcurrency)
    {
        ArgumentOutOfRangeException.ThrowIfLessThan(maxConcurrency, 1);

        using var slots = new SemaphoreSlim(maxConcurrency, maxConcurrency);

        async Task<T> RunOneAsync(Func<Task<T>> job)
        {
            await slots.WaitAsync();
            try
            {
                return await job();
            }
            finally
            {
                slots.Release();
            }
        }

        var tasks = new List<Task<T>>();
        foreach (Func<Task<T>> job in jobs)
        {
            tasks.Add(RunOneAsync(job));
        }
        return await Task.WhenAll(tasks);
    }
}
