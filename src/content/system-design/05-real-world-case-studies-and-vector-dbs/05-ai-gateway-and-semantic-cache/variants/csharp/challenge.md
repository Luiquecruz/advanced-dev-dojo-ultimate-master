Build the part of an AI gateway that runs before any model is called: a semantic cache that is scoped, so one tenant never receives another tenant's answer, and a `CompleteAsync` method that serves cache hits and falls back across providers on retryable errors. There is no network and no model here: `embed` and the providers are plain delegates that the tests inject.

```csharp
public record CompletionRequest(string Tenant, string Model, string SystemPrompt, string Prompt);
public record Completion(string Answer, string Provider, bool Cached);
public record Provider(string Name, Func<CompletionRequest, Task<string>> CallAsync);

// already written in the starter: Status holds the HTTP status the provider answered
public class ProviderException(int status, string? message = null) : Exception(message ?? $"provider answered {status}")
{
    public int Status { get; } = status;
}

public class SemanticCache
{
    public SemanticCache(double threshold, Func<string, double[]> embed);
    public static double CosineSimilarity(double[] a, double[] b);   // already written in the starter
    public static string ScopeKey(string tenant, string model, string systemPrompt);
    public string? Lookup(string scope, string prompt);
    public void Store(string scope, string prompt, string answer);
}

public class Gateway
{
    public Gateway(IReadOnlyList<Provider> providers, SemanticCache cache);
    public Task<Completion> CompleteAsync(CompletionRequest request);
}
```

The tests pass `threshold`, `embed`, `providers` and `cache` by name.

**`SemanticCache.ScopeKey(tenant, model, systemPrompt)`** returns `JsonSerializer.Serialize(new[] { tenant, model, systemPrompt })`, for example `["acme","small","Be brief."]`. Every field changes the key, and a field that contains a separator such as `|` cannot collide with another combination of fields.

**`new SemanticCache(threshold, embed)`** starts empty.

- `Store(scope, prompt, answer)` calls `embed(prompt)` once and keeps the vector together with the scope and the answer.
- `Lookup(scope, prompt)` calls `embed(prompt)` at most once and compares that vector, with `CosineSimilarity`, against the entries stored under **exactly the same `scope` string**, and only those. It returns the answer of the **most similar** entry when its similarity is at least `threshold` (`>=`), otherwise `null` (no entry in the scope, or the best one is below the threshold). The first entry stored wins a tie. Stored prompts are never embedded again.

**`new Gateway(providers, cache)`** has one method, `await CompleteAsync(request)`, which:

1. Looks up `request.Prompt` under `ScopeKey(request.Tenant, request.Model, request.SystemPrompt)`. On a hit it returns `new Completion(answer, "cache", Cached: true)` without calling any provider.
2. Otherwise awaits `provider.CallAsync(request)` for each provider in order. The first answer is stored in the cache under the same scope and prompt, and `CompleteAsync` returns `new Completion(answer, provider.Name, Cached: false)`.
3. Treats an exception as **retryable** when it is a `ProviderException` whose `Status` is `429` or from `500` to `599`, or a `TimeoutException` (what `Task.WaitAsync` throws when a call takes too long). After a retryable exception it moves to the next provider. Any other exception (a `ProviderException` with status `400`, an `InvalidOperationException`) reaches the caller at once, and the remaining providers are not called. When every provider fails with a retryable exception, `CompleteAsync` throws the **last** one, the same exception object. A failed request stores nothing.

Matching on prompt similarity alone is not enough: an entry stored for one tenant, model or system prompt must never answer another. In production `embed` is a call to an embedding model and each provider is an HTTP client with a timeout and a circuit breaker; here they are plain delegates, so the tests control every result.
