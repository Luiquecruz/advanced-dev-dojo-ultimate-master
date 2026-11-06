using System.Text.RegularExpressions;
using Dojo;

public static class AiGatewayTests
{
    private const string Tenant = "acme";
    private const string Model = "small";
    private const string SystemPrompt = "You are the Acme support assistant.";
    private static readonly string[] Vocabulary = ["reset", "password", "account", "refund", "order", "cancel"];
    private static readonly Regex Word = new("[a-z]+");

    private static double[] Embed(string text)
    {
        var words = Word.Matches(text.ToLowerInvariant()).Select(match => match.Value).ToList();
        return Vocabulary.Select(term => (double)words.Count(word => word == term)).ToArray();
    }

    private static string AcmeScope() => SemanticCache.ScopeKey(Tenant, Model, SystemPrompt);

    private static CompletionRequest AcmeRequest(string prompt) => new(Tenant, Model, SystemPrompt, prompt);

    private static Provider Answering(string name, string answer, List<string>? calls = null) =>
        new(name, _ => { calls?.Add(name); return Task.FromResult(answer); });

    private static Provider Failing(string name, Exception error, List<string>? calls = null) =>
        new(name, _ => { calls?.Add(name); return Task.FromException<string>(error); });

    [Test("the scope key encodes tenant, model and system prompt as a JSON array, so no two scopes collide")]
    public static void EncodesTheScopeAsAJsonArray()
    {
        Assert.Equal("""["acme","small","Be brief."]""", SemanticCache.ScopeKey("acme", "small", "Be brief."));
        Assert.NotEqual(SemanticCache.ScopeKey("a", "b|c", ""), SemanticCache.ScopeKey("a|b", "c", ""));
    }

    [Test("lookup returns the answer of the most similar entry once it reaches the threshold, embedding each prompt once")]
    public static void ReturnsTheMostSimilarEntry()
    {
        var embedded = new List<string>();
        var cache = new SemanticCache(threshold: 0.8, embed: text => { embedded.Add(text); return Embed(text); });
        var scope = AcmeScope();
        cache.Store(scope, "How do I reset my password?", "password answer");
        cache.Store(scope, "How do I reset my account password?", "account password answer");
        Assert.Equal(2, embedded.Count);
        Assert.Equal("account password answer", cache.Lookup(scope, "reset the password on my account"));
        Assert.Equal("password answer", cache.Lookup(scope, "password reset, please"));
        Assert.Equal(4, embedded.Count);
        Assert.Null(cache.Lookup(scope, "Where is my refund?"));
        var strict = new SemanticCache(threshold: 0.9, embed: Embed);
        strict.Store(scope, "How do I reset my password?", "password answer");
        Assert.Null(strict.Lookup(scope, "reset my account password"));
        // the similarity of these two prompts is exactly 0.5, so it reaches a threshold of 0.5
        var boundary = new SemanticCache(threshold: 0.5, embed: Embed);
        boundary.Store(scope, "Where is my refund?", "refund answer");
        Assert.Equal("refund answer", boundary.Lookup(scope, "Should I cancel my account or refund my order?"));
    }

    // beginner mistake: matching on prompt similarity alone, so a cached answer leaks to another tenant, model or system prompt
    [Test("lookup only searches the entries stored under exactly the same scope")]
    public static void SearchesOnlyTheSameScope()
    {
        var cache = new SemanticCache(threshold: 0.8, embed: Embed);
        const string prompt = "How do I reset my password?";
        cache.Store(AcmeScope(), prompt, "Acme: open Settings, then Security.");
        Assert.Equal("Acme: open Settings, then Security.", cache.Lookup(AcmeScope(), prompt));
        Assert.Null(cache.Lookup(SemanticCache.ScopeKey("globex", Model, SystemPrompt), prompt), "another tenant");
        Assert.Null(cache.Lookup(SemanticCache.ScopeKey(Tenant, "large", SystemPrompt), prompt), "another model");
        Assert.Null(cache.Lookup(SemanticCache.ScopeKey(Tenant, Model, "Answer in French."), prompt), "another system prompt");
    }

    [Test("complete answers a miss from the first provider, stores it and serves similar prompts of the same scope from the cache")]
    public static async Task ServesSimilarPromptsFromTheCache()
    {
        var requests = new List<CompletionRequest>();
        var primary = new Provider("primary", incoming => { requests.Add(incoming); return Task.FromResult($"primary: {incoming.Prompt}"); });
        var gateway = new Gateway(providers: [primary], cache: new SemanticCache(threshold: 0.8, embed: Embed));
        var request = AcmeRequest("How do I reset my password?");
        Assert.Equal(new Completion("primary: How do I reset my password?", "primary", Cached: false), await gateway.CompleteAsync(request));
        Assert.SequenceEqual([request], requests);
        Assert.Equal(new Completion("primary: How do I reset my password?", "cache", Cached: true), await gateway.CompleteAsync(request with { Prompt = "password reset, please" }));
        Assert.Equal(1, requests.Count);
        Assert.Equal(new Completion("primary: How do I reset my password?", "primary", Cached: false), await gateway.CompleteAsync(request with { Tenant = "globex" }));
        Assert.Equal(2, requests.Count);
    }

    [Test("complete moves to the next provider on 429, 5xx and timeouts, in order")]
    public static async Task FallsBackInOrder()
    {
        var calls = new List<string>();
        var gateway = new Gateway(
            providers:
            [
                Failing("first", new ProviderException(429), calls),
                Failing("second", new ProviderException(500), calls),
                Failing("third", new ProviderException(503), calls),
                Failing("fourth", new TimeoutException("provider timed out"), calls),
                Answering("backup", "backup answer", calls),
            ],
            cache: new SemanticCache(threshold: 0.8, embed: Embed));
        Assert.Equal(new Completion("backup answer", "backup", Cached: false), await gateway.CompleteAsync(AcmeRequest("Where is my order?")));
        Assert.SequenceEqual(["first", "second", "third", "fourth", "backup"], calls);
    }

    [Test("complete hands a non-retryable error straight to the caller, reports the last error when every provider fails, and caches no failure")]
    public static async Task ReportsErrorsAndCachesNoFailure()
    {
        var cache = new SemanticCache(threshold: 0.8, embed: Embed);
        var request = AcmeRequest("Cancel my order");
        var backupCalls = new List<string>();
        Exception[] errors = [new ProviderException(400), new InvalidOperationException("invalid tool definition")];
        foreach (var error in errors)
        {
            var gateway = new Gateway(providers: [Failing("primary", error), Answering("backup", "backup answer", backupCalls)], cache: cache);
            var thrown = await Assert.ThrowsAsync<Exception>(() => gateway.CompleteAsync(request));
            Assert.True(ReferenceEquals(error, thrown), $"expected the primary's own {error.GetType().Name} ({error.Message}), got {thrown.GetType().Name} ({thrown.Message})");
        }
        Assert.SequenceEqual([], backupCalls);
        var last = new ProviderException(502);
        var outage = new Gateway(providers: [Failing("primary", new ProviderException(503)), Failing("secondary", last)], cache: cache);
        var reported = await Assert.ThrowsAsync<ProviderException>(() => outage.CompleteAsync(request));
        Assert.True(ReferenceEquals(last, reported), $"expected the last provider's error ({last.Message}), got {reported.Message}");
        var recovered = new Gateway(providers: [Answering("primary", "fresh answer")], cache: cache);
        Assert.Equal(new Completion("fresh answer", "primary", Cached: false), await recovered.CompleteAsync(request));
    }
}
