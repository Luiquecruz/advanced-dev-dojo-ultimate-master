using System.Text.Json;
using System.Text.RegularExpressions;

// Top-level statements: Run executes these lines and prints the results; the tests ignore them.
var gateway = new Gateway(
    providers:
    [
        new Provider("primary", _ => Task.FromException<string>(new ProviderException(503, "overloaded"))),
        new Provider("secondary", incoming => Task.FromResult($"secondary answers: {incoming.Prompt}")),
    ],
    cache: new SemanticCache(threshold: 0.8, embed: DemoEmbed));
var request = new CompletionRequest("acme", "small", "You are the Acme support assistant.", "How do I reset my password?");
try
{
    Console.WriteLine(await gateway.CompleteAsync(request));
    Console.WriteLine(await gateway.CompleteAsync(request with { Prompt = "password reset, please" }));
    Console.WriteLine(await gateway.CompleteAsync(request with { Tenant = "globex" }));
}
catch (Exception error)
{
    Console.WriteLine($"request failed: {error.Message}");
}

static double[] DemoEmbed(string text)
{
    string[] vocabulary = ["reset", "password", "refund", "order"];
    var words = Regex.Matches(text.ToLowerInvariant(), "[a-z]+").Select(match => match.Value).ToList();
    return vocabulary.Select(term => (double)words.Count(word => word == term)).ToArray();
}

public record CompletionRequest(string Tenant, string Model, string SystemPrompt, string Prompt);

public record Completion(string Answer, string Provider, bool Cached);

public record Provider(string Name, Func<CompletionRequest, Task<string>> CallAsync);

public class ProviderException(int status, string? message = null) : Exception(message ?? $"provider answered {status}")
{
    public int Status { get; } = status;
}

public class SemanticCache
{
    private readonly double _threshold;
    private readonly Func<string, double[]> _embed;
    private readonly List<CacheEntry> _entries = [];

    public SemanticCache(double threshold, Func<string, double[]> embed)
    {
        _threshold = threshold;
        _embed = embed;
    }

    public static double CosineSimilarity(double[] a, double[] b)
    {
        var lengths = Math.Sqrt(Dot(a, a)) * Math.Sqrt(Dot(b, b));
        return lengths == 0 ? 0 : Dot(a, b) / lengths;
    }

    public static string ScopeKey(string tenant, string model, string systemPrompt)
    {
        // TODO: encode tenant, model and system prompt as JsonSerializer.Serialize(new[] { tenant, model, systemPrompt })
        return tenant;
    }

    public string? Lookup(string scope, string prompt)
    {
        var vector = _embed(prompt);
        // TODO: compare only the entries stored under the same scope, and return the most similar one, not the first above the threshold
        var match = _entries.FirstOrDefault(entry => CosineSimilarity(vector, entry.Vector) >= _threshold);
        return match?.Answer;
    }

    public void Store(string scope, string prompt, string answer) => _entries.Add(new CacheEntry(scope, _embed(prompt), answer));

    private static double Dot(double[] a, double[] b) => a.Zip(b, (x, y) => x * y).Sum();

    private record CacheEntry(string Scope, double[] Vector, string Answer);
}

public class Gateway
{
    private readonly IReadOnlyList<Provider> _providers;
    private readonly SemanticCache _cache;

    public Gateway(IReadOnlyList<Provider> providers, SemanticCache cache)
    {
        _providers = providers;
        _cache = cache;
    }

    public async Task<Completion> CompleteAsync(CompletionRequest request)
    {
        var scope = SemanticCache.ScopeKey(request.Tenant, request.Model, request.SystemPrompt);
        if (_cache.Lookup(scope, request.Prompt) is string hit)
        {
            return new Completion(hit, "cache", Cached: true);
        }
        // TODO: try the providers in order: move on after a retryable error (IsRetryable), let any other error reach the caller at once,
        // and throw the last error when every provider failed
        var provider = _providers[0];
        var answer = await provider.CallAsync(request);
        _cache.Store(scope, request.Prompt, answer);
        return new Completion(answer, provider.Name, Cached: false);
    }

    private static bool IsRetryable(Exception error)
    {
        // TODO: a ProviderException with Status 429 or 500-599, or a TimeoutException, is retryable
        return false;
    }
}
