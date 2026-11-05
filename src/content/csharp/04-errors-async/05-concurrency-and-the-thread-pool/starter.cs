using System.Threading;

public sealed record AccessToken(string Value);

public interface ITokenIssuer
{
    Task<AccessToken> IssueAsync(CancellationToken cancellationToken);
}

public sealed class TokenCache(ITokenIssuer issuer)
{
    private AccessToken? _token;

    public async Task<AccessToken> GetAsync(CancellationToken cancellationToken)
    {
        // TODO: callers that arrive while a token is being issued must wait for it instead of asking for their own.
        // Guard the refresh with a SemaphoreSlim(1, 1): WaitAsync with the token, check again inside, Release in finally.
        _token ??= await issuer.IssueAsync(cancellationToken);
        return _token;
    }

    public void Invalidate() => _token = null;
}

public static class Limited
{
    public static async Task<T[]> RunAllAsync<T>(IReadOnlyList<Func<Task<T>>> jobs, int maxConcurrency)
    {
        // TODO: reject a maxConcurrency below 1, and never run more than maxConcurrency jobs at the same time.
        var tasks = new List<Task<T>>();
        foreach (Func<Task<T>> job in jobs)
        {
            tasks.Add(job());
        }
        return await Task.WhenAll(tasks);
    }
}
