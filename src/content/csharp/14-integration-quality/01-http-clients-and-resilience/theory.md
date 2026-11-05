# HTTP Clients and Resilience

After this lesson you can call an external API from a .NET service the way production teams do: through `IHttpClientFactory` and a typed client, with outgoing middleware for cross-cutting work such as API keys, and with the standard resilience handler from `Microsoft.Extensions.Http.Resilience`. You will also know when a retry is unsafe and what to do about it.

## Coming from PHP/Magento

A Magento integration (an ERP, a payment provider, a shipping API) usually wraps Guzzle: a client class under `Model/Api`, a `HandlerStack` with `Middleware::retry`, `Middleware::mapRequest` to add the auth header, and `Middleware::log`. Each PHP-FPM request builds the client, sends a few calls and dies, so a badly managed client costs little.

The ideas transfer almost one to one: a `DelegatingHandler` is a Guzzle middleware, and the resilience handler is your retry middleware with a timeout and a circuit breaker added. The trap is the lifetime. A .NET API is one long-running process. `new HttpClient()` per call leaks sockets (module 04 lesson 02), and one static client kept forever never sees DNS changes. Retries also cost more: a .NET process serves many requests at once, so three retries per call during an outage triple the load on a dependency that is already struggling.

## Typed clients

`AddHttpClient<T>` registers a typed client: a class that receives a configured `HttpClient` in its constructor and exposes methods that mean something to your domain.

```csharp
using System.Net.Http.Json;

builder.Services.AddHttpClient<ErpClient>(client =>
{
    client.BaseAddress = new Uri(builder.Configuration["Erp:BaseUrl"]!); // e.g. "https://erp.example.com/api/"
    client.DefaultRequestHeaders.UserAgent.ParseAdd("catalog-api");
});

public sealed class ErpClient(HttpClient http)
{
    public async Task<ErpStock?> GetStockAsync(string sku, CancellationToken ct) =>
        await http.GetFromJsonAsync<ErpStock>($"stock/{Uri.EscapeDataString(sku)}", ct);
}

public sealed record ErpStock(string Sku, int Quantity);
```

What the factory does for you:

- **Handler pooling.** Each `HttpClient` it creates is cheap and short-lived; the expensive part, the `HttpMessageHandler` with its connection pool, is cached and recycled. The default handler lifetime is two minutes (`SetHandlerLifetime` changes it), which is how the client reacts to DNS changes.
- **Lifetime rules.** The typed client is registered as **transient**. Do not capture it in a singleton: the singleton keeps one handler forever and loses the DNS benefit. In a singleton, inject `IHttpClientFactory` and call `CreateClient`, or configure `SocketsHttpHandler.PooledConnectionLifetime`.
- **Named clients** (`AddHttpClient("erp", ...)` plus `CreateClient("erp")`) do the same with a string key. Keep the number of names bounded; never build a name from user input.

## Outgoing middleware: `DelegatingHandler`

This is your `Middleware::mapRequest`. A handler wraps the next one and sees every request and response.

```csharp
using Microsoft.Extensions.Options;

public sealed class ErpApiKeyHandler(IOptions<ErpOptions> options) : DelegatingHandler
{
    protected override Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request, CancellationToken cancellationToken)
    {
        request.Headers.Add("X-Api-Key", options.Value.ApiKey);
        return base.SendAsync(request, cancellationToken);
    }
}

public sealed class ErpOptions
{
    public string ApiKey { get; set; } = "";
}

// Program.cs
builder.Services.AddTransient<ErpApiKeyHandler>();
builder.Services.AddHttpClient<ErpClient>(/* ... */)
    .AddHttpMessageHandler<ErpApiKeyHandler>();
```

Handlers run in the order you add them, each wrapping the next. A delegating handler **must** be registered as transient; a singleton handler throws `InvalidOperationException` when it is reused. Handlers live in their own DI scope, tied to the handler lifetime, not to the incoming request, so never cache request data such as `HttpContext` values in a handler.

## The standard resilience handler

```csharp
builder.Services.AddHttpClient<ErpClient>(/* ... */)
    .AddHttpMessageHandler<ErpApiKeyHandler>()
    .AddStandardResilienceHandler(options =>
    {
        options.Retry.DisableForUnsafeHttpMethods();
    });
```

You met these defaults in module 04 lesson 04 and the handler in module 12 lesson 05; this section explains them. One call adds five strategies, outermost first: a rate limiter (1,000 concurrent permits, no queue), a 30-second total timeout, a retry (three retries, exponential backoff with jitter, 2-second base delay), a circuit breaker (opens at a 10% failure ratio with at least 100 calls in 30 seconds, for 5 seconds) and a 10-second timeout per attempt. Retries and the breaker react to `HttpRequestException`, Polly's `TimeoutRejectedException`, 5xx, 408 and 429, and the retry honors a `Retry-After` header by default (`ShouldRetryAfterHeader`). Microsoft's guidance is one resilience handler per client: do not stack two. For your own mix of strategies use `AddResilienceHandler("name", builder => ...)`, and `AddStandardHedgingHandler()` sends parallel attempts for slow reads.

## When a retry is unsafe

The retry applies to **every HTTP method** by default. Retrying a `POST /orders` that timed out after the server committed it creates a second order. `DisableForUnsafeHttpMethods()` turns retries off for `POST`, `PATCH`, `PUT`, `DELETE` and `CONNECT`; `DisableFor(HttpMethod.Post)` targets specific methods. Note that RFC 9110 defines `PUT` and `DELETE` as idempotent; the helper is stricter than the RFC, which is usually what you want for a third-party API you cannot inspect.

When a write must be retried, make it idempotent first: send a client-generated key (many payment APIs accept an `Idempotency-Key` header, still an IETF draft) or use a natural key the server deduplicates on, exactly like the idempotent consumers of module 10 lesson 04.

## In practice

- One typed client per external system, in an infrastructure folder, returning your own types. Callers never see `HttpResponseMessage`.
- Put base URLs and keys in options (module 05 lesson 03), keys in a secret store, never in code. Use `RedactLoggedHeaders` so the factory's logging does not write the key.
- `ConfigureHttpClientDefaults(b => b.AddStandardResilienceHandler())` gives every client a baseline; a client that needs something else calls `RemoveAllResilienceHandlers()` first. Aspire's ServiceDefaults does this for you (module 11 lesson 05).
- Decide what failure means for the business. An open breaker throws quickly; the caller still needs a fallback, a cached value or a clear 503.
- Try it locally: point a typed client at a local endpoint that returns 503 on most calls, log each attempt in a `DelegatingHandler`, and watch the retries, the backoff and the breaker opening.
- Common mistakes: `new HttpClient()` in a method, a typed client inside a singleton, a retry on a non-idempotent `POST`, a 100-second `HttpClient.Timeout` hiding behind the 30-second pipeline (module 04 lesson 04), and resilience handlers stacked on top of each other.

## Status as of 2026-11-05

- `Microsoft.Extensions.Http.Resilience` 10.11.0 is the latest stable package on NuGet; the defaults above come from Microsoft's HTTP resilience page dated 2026-02-24.
- The `Idempotency-Key` header is `draft-ietf-httpapi-idempotency-key-header`, revision 08 (2026-10-22), not yet an RFC.

## Check yourself

1. Why is a typed client captured by a singleton a problem, and what are the two fixes Microsoft documents?
2. Which defaults of the standard resilience handler would you change for a slow ERP export endpoint, and how?
3. A `POST` to a payment provider times out. Under which conditions is it safe to retry it?
