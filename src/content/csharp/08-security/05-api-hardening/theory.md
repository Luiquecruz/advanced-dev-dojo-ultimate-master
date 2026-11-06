# API Hardening

After this lesson you can close the gaps that authentication and policies leave open: enforce HTTPS the way an API should, configure CORS without weakening the API, add rate limiting that behaves correctly behind a load balancer, keep secrets out of the repository, and walk through the OWASP API Security Top 10 against your own endpoints. A reverse proxy, gateway or WAF in front of the app is normal, but much of this is middleware inside the app, and its order in `Program.cs` decides whether it works.

You need: 05/05 (middleware order), 05/03 (layered configuration), 08/02 (the `sub` claim) and 08/03 (policies and ownership checks).

## HTTPS for APIs

Browser apps redirect HTTP to HTTPS and send HSTS. APIs are different, because their clients are programs:

- An API should **not listen on HTTP at all**, or reject HTTP requests with `400` without serving them. Microsoft warns against `RequireHttpsAttribute` on APIs that receive sensitive data: the redirect comes after the client has already sent the token in clear text, and many API clients do not follow redirects.
- HSTS (`UseHsts`) is a browser instruction. Default API projects do not include it, since phones, services and CLI tools ignore it. When you do send it (a site that serves both pages and API), its default `max-age` is 30 days and loopback hosts are excluded.
- When a reverse proxy terminates TLS, configure the forwarded headers middleware so the app knows the original scheme and client IP.

## CORS: relaxing, not protecting

CORS lets a browser page from another origin read your API's responses. It is **not a security feature**: it relaxes the browser's same-origin policy, and it does nothing against `curl`, a mobile app or a server. Allow only the origins you serve:

```csharp
builder.Services.AddCors(options =>
{
    options.AddPolicy("storefront", policy => policy
        .WithOrigins("https://shop.example.com")        // no trailing slash
        .WithMethods("GET", "POST")
        .WithHeaders("Content-Type", "Authorization"));
});

// ...
app.UseRouting();
app.UseCors("storefront");          // after UseRouting, before UseAuthorization
app.UseAuthentication();
app.UseAuthorization();
```

Rules that bite: an origin with a trailing slash never matches; `AllowAnyOrigin()` with `AllowCredentials()` is insecure and the CORS service returns an invalid response for it, and bypassing that check with `SetIsOriginAllowed(_ => true)` is just as insecure.

## Rate limiting

The built-in middleware (`Microsoft.AspNetCore.RateLimiting`) offers fixed window, sliding window, token bucket and concurrency limiters, partitioned by any key you choose:

```csharp
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.RateLimiting;

builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests; // default is 503
    options.AddPolicy("per-user", httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: httpContext.User.FindFirst("sub")?.Value ?? "anonymous",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 60,
                Window = TimeSpan.FromMinutes(1)
            }));
});

// ... after UseAuthentication(), so the partition can read the user
app.UseRateLimiter();
app.MapPost("/orders", () => Results.Accepted()).RequireRateLimiting("per-user");
```

What to know before you trust it:

- The default rejection status is **503**, which tells clients the server is down; set `429 Too Many Requests` and, in `OnRejected`, a `Retry-After` header from the lease metadata.
- `UseRateLimiter` must come after `UseRouting` when you use endpoint policies (`RequireRateLimiting`, `[EnableRateLimiting]`).
- Counters live **in memory, per instance**. Three instances behind a load balancer allow three times the limit. For one global limit use a gateway or a limiter backed by a shared store.
- Each partition key creates a limiter. Partitioning on unbounded user input (an arbitrary header) can exhaust memory, and Microsoft notes that partitioning by client IP is exposed to IP spoofing. The example partitions on `sub` (with `MapInboundClaims = false`, lesson 08/02; with the default mapping read `ClaimTypes.NameIdentifier`). RFC 9068 access tokens always carry it, other tokens may not: require it with `RequireClaim("sub")` in the authorization policy. Microsoft's samples use `User.Identity?.Name`, which is `null` unless `NameClaimType` matches a claim in the token, putting every signed-in user in the `"anonymous"` bucket. All anonymous callers share one bucket, which suits an API where almost everything requires sign-in.
- Rate limiting helps against abuse and accidental floods; it is not DDoS protection, which belongs to the hosting platform or a CDN/WAF.

## Secrets

Microsoft's rule is short: never store passwords or other sensitive data in source code or configuration files, and do not use production secrets in development.

```bash
dotnet user-secrets init
dotnet user-secrets set "ConnectionStrings:Catalog" "Host=localhost;Username=app;Password=dev-only"
```

The Secret Manager keeps values in `secrets.json` in your user profile, outside the repository, and `WebApplication.CreateBuilder` loads them only in the `Development` environment. It does **not** encrypt them: it is a development convenience. Environment variables keep secrets out of files but are stored as plain text, and anyone who compromises the machine or process can read them. In production, read secrets from a managed store such as Azure Key Vault (it has a configuration provider) or your cloud's equivalent, and prefer managed identities over connection strings with passwords where the platform supports them.

## OWASP API Security Top 10 (2023)

A checklist to walk through for every API, with where ASP.NET Core helps:

| Risk | What to do in ASP.NET Core |
| --- | --- |
| API1 Broken Object Level Authorization | ownership checks per record (lesson 08/03) |
| API2 Broken Authentication | validate tokens fully (lesson 08/02), Identity lockout (lesson 08/04) |
| API3 Broken Object Property Level Authorization | request and response DTOs, never bind or return entities directly |
| API4 Unrestricted Resource Consumption | rate limiting, paging limits, request size limits |
| API5 Broken Function Level Authorization | named policies on admin endpoints, a fallback policy |
| API6 Unrestricted Access to Sensitive Business Flows | per-user limits on flows such as checkout or coupon redemption |
| API7 Server Side Request Forgery | validate or allow-list URLs the API fetches |
| API8 Security Misconfiguration | HTTPS only, strict CORS, no developer exception page in production |
| API9 Improper Inventory Management | an OpenAPI document of every endpoint (lesson 06/04), retire old versions |
| API10 Unsafe Consumption of APIs | validate data from third-party APIs as if it were user input |

## Common mistakes

- **`AllowAnyOrigin()` "just for now".** Scripts on any site can read your API's responses in a visitor's browser, and combined with credentials the CORS service refuses the policy. List exact origins with `WithOrigins`.
- **`UseRateLimiter` before `UseAuthentication`.** The partition sees no user, so every caller shares the `"anonymous"` bucket and one heavy client throttles everyone. Register it after authentication.
- **Testing limits on one instance and deploying five.** Counters are per instance, so the real limit is five times the configured one. Enforce a global limit at a gateway.
- **`UseHttpsRedirection` as an API's only HTTPS measure.** The token crossed the network in clear text before the redirect. Do not listen on HTTP, or reject it with `400`.

## In practice

- Write the order down once and keep it: forwarded headers, exception handler, routing, CORS, authentication, authorization, rate limiter, endpoints. Review middleware order in every pull request that touches `Program.cs`.
- Return `429` with `Retry-After`, log rejections, and load-test limits before production, as Microsoft advises.
- Add secret scanning to CI so a leaked key fails the build, and rotate any secret that reached Git; a secret committed to `appsettings.json` stays in the history for good.

## Check yourself

1. Why is redirecting HTTP to HTTPS not enough for an API, and what should it do instead?
2. A teammate says "we enabled CORS, so other sites can't call our API". What is wrong with that sentence?
3. Your limit is 100 requests per minute and the API runs on four instances. What is the real limit, and how would you enforce one global limit?
4. Pick three OWASP API risks and name the concrete check you would add to the catalog API for each.
