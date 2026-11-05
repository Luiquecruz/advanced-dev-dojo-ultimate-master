# C#/.NET ecosystem and legacy map

Research date: **2026-11-05**. Audience: a backend developer coming from PHP/Magento. Scope: what exists, who supports it until when, and what to teach first. Market adoption is covered in a separate document; here, "adopted" is filled only when this research collected evidence, otherwise it reads "no evidence collected here".

## How to read this document

- **Class**: 1 = recommended for new projects, 2 = established and relevant in the market, 3 = legacy needed for maintenance or migration, 4 = discontinued, context only. Newness is not priority: a class 2 item can matter more for employability than a class 1 item.
- **Available**: the thing exists and can be installed today (verified on the cited page).
- **Supported**: who supports it and until when, as stated by the owner. "Not stated" means the cited page gives no date.
- **Adopted**: evidence of use. NuGet download counts were not collected, so almost every row says "no evidence collected here".
- Every claim about .NET links to a page opened during this research. Where a page was unavailable or did not state something, the row says so. One exception: the Magento / PHP column of section 12 is the author's background knowledge and is unsourced unless a link is given.
- Where two owner pages disagree (a date or a latest version), the row shows both and names each source.

### Sources that could not be fully verified

| Topic | What happened | Effect on conclusions |
| --- | --- | --- |
| .NET 11 GA date | The RC1 and RC2 posts on devblogs do not state a GA date. Only secondary coverage (search snippets, not opened) mentions launch at .NET Conf 2026 (starting Nov 10). | The doc states only what Microsoft's own pages say: EF Core 11 "scheduled for November 2026". |
| MassTransit v8 support end | The v9 announcement URL now redirects to `masstransit.massient.com`, and that page shows no licence terms, timeline or v8 end date. Third-party posts claim v8 support "through the end of 2026" (not verified). | v8 end of support is marked "not verified". |
| Fluent Assertions version boundary | Xceed's announcement (2025-01-13) names no versions. The NuGet page says only "This version is free for open-source projects and non-commercial use" for 8.11.0. That 8.0 is where the commercial line starts is an inference (a third-party package description on NuGet refers to "the commercial version of the FluentAssertions library (>= 8.0.0)"). | The doc states the terms for 8.11.0 only. The 8.0 boundary is marked as inferred, and 7.x terms are not verified. |
| AutoMapper / MediatR licence on NuGet | NuGet pages only link "License Info" without an expression. The launch post covers AutoMapper v15.0 and MediatR v13.0 only. | Licence facts come from the author's launch post. That the same terms apply to AutoMapper 16 / MediatR 14 is assumed, not verified. |
| AutoMapper vulnerable versions | NuGet flags versions "with high severity" but does not name the advisory. | The vulnerable versions are listed without an advisory ID. |
| ASP.NET MVC 5 / Web API 2 end dates | The ASP.NET support policy table was garbled in extraction. | Only the "Tool, 12 months notice" rule is stated, no date. |
| Microsoft written guidance on vertical slices / modular monolith | No learn.microsoft.com written guidance found; only an "On .NET Live" video page. | Marked "no Microsoft written guidance found". |

## 1. .NET platform support policy

Source: [.NET and .NET Core Support Policy](https://dotnet.microsoft.com/en-us/platform/support/policy/dotnet-core), [STS releases supported for 24 months (devblogs, 2025-09-16)](https://devblogs.microsoft.com/dotnet/dotnet-sts-releases-supported-for-24-months/).

| Rule | Value |
| --- | --- |
| LTS | Even-numbered releases, "free support and patches for three years" |
| STS | Odd-numbered releases, "free support and patches for two years" (24 months since .NET 9; previously 18). "12 months from when the successor release ships" |
| Cadence | One major release per November (see release dates below) |

| Version | Type | Released | Latest patch (on policy page) | End of support | Status on 2026-11-05 |
| --- | --- | --- | --- | --- | --- |
| .NET 11 | STS | Not GA. RC1 2026-09-08, RC2 2026-10-13, both "go-live" ([RC1](https://devblogs.microsoft.com/dotnet/dotnet-11-rc-1/), [RC2](https://devblogs.microsoft.com/dotnet/dotnet-11-rc-2/)) | n/a | n/a (STS rule implies two years after GA) | Next release, pre-GA |
| .NET 10 | LTS | 2025-11-11 | 10.0.14 | 2028-11-14 | Newest GA, supported |
| .NET 9 | STS | 2024-11-12 | 9.0.22 | 2026-11-10 | Supported, **ends in 5 days** |
| .NET 8 | LTS | 2023-11-14 | 8.0.33 | 2026-11-10 | Supported, **ends in 5 days** |
| .NET 7 | STS | 2022-11-08 | 7.0.20 | 2024-05-14 | Out of support |
| .NET 6 | LTS | 2021-11-08 | 6.0.36 | 2024-11-12 | Out of support |
| .NET 5, Core 3.1 and older | | | | 2022 or earlier | Out of support |

Track implication: target **.NET 10 (LTS) with C# 14**. After 2026-11-10, .NET 10 is the only GA version in support until .NET 11 ships. Mention .NET 11/C# 15 as "next", not as the baseline.

## 2. C# language versions

Sources: [Language versioning](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/language-versioning), [What's new in C# 14](https://learn.microsoft.com/en-us/dotnet/csharp/whats-new/csharp-14), [What's new in C# 15](https://learn.microsoft.com/en-us/dotnet/csharp/whats-new/csharp-15).

| Target framework | Default C# | Note |
| --- | --- | --- |
| .NET 11 | C# 15 | "The .NET 11 SDK is still prerelease" (C# 15 page, updated 2026-10-23) |
| .NET 10 | C# 14 | "C# 14 is the latest C# release" |
| .NET 9 | C# 13 | |
| .NET 8 | C# 12 | |
| .NET 6 / 7 | C# 10 / 11 | |
| .NET Framework (all) | C# 7.3 | Legacy code is written in an old dialect |

"Using a C# language version newer than the version associated with your target TFM is unsupported."

| Version | Features listed by Microsoft | Backend relevance |
| --- | --- | --- |
| C# 14 (.NET 10) | extension members (extension properties, static extensions), null-conditional assignment (`a?.B = x`), `nameof` on unbound generics, implicit `Span<T>` conversions, modifiers on simple lambda parameters, `field`-backed properties, partial events and constructors, user-defined compound assignment, file-based app directives | `field` keyword, `?.=` and extension members appear in new code; file-based apps (`dotnet run app.cs`) suit small exercises |
| C# 15 (.NET 11, preview SDK) | collection expression arguments (`[with(...), ..]`), union types (`union Pet(Cat, Dog, Bird)`), closed hierarchies (`closed` classes), extension indexers, labeled `break`/`continue`, non-virtual static interface members on older runtimes, memory safety (preview only) | Unions and closed hierarchies change domain modelling (exhaustive `switch`); teach as "coming", not baseline |

Core features a backend developer must know regardless of version (all present by C# 12 per the versioning table; the per-feature history page was not opened, so feature-to-version mapping before C# 14 is not cited here): nullable reference types, records, pattern matching and `switch` expressions, `async`/`await`, LINQ, generics, primary constructors, collection expressions, `required` members, top-level statements. The Options page sample uses `required` and primary constructors on .NET 10 ([Options pattern](https://learn.microsoft.com/en-us/dotnet/core/extensions/options)).

## 3. ASP.NET Core

| Item | Class | Available / what it is | Supported | Adopted | Source |
| --- | --- | --- | --- | --- | --- |
| Minimal APIs | 1 | `app.MapGet(...)`; "For new projects, we recommend using Minimal APIs" | With .NET (10 LTS to 2028-11-14) | no evidence collected here | [APIs overview](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/apis) |
| Controller-based APIs (`ControllerBase`, `[ApiController]`) | 2 | "Alternative approach", preferred for "large applications with complex business logic", teams familiar with MVC, or when needing model binder extensibility, `IModelValidator`, application parts/model, OData | With .NET | no evidence collected here | [APIs overview](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/apis) |
| Minimal API validation | 1 | .NET 10: `builder.Services.AddValidation()` with DataAnnotations, 400 on failure | With .NET 10 | no evidence collected here | [What's new in ASP.NET Core 10](https://learn.microsoft.com/en-us/aspnet/core/release-notes/aspnetcore-10.0) |
| Middleware pipeline | 1 | `app.Use...` ordered pipeline; order matters (e.g. `UseRateLimiter` after `UseRouting` for endpoint policies); "Do not use custom middleware components with long-running tasks"; do not change headers after the body started | With .NET | n/a | [Rate limiting](https://learn.microsoft.com/en-us/aspnet/core/performance/rate-limit), [Best practices](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/best-practices) |
| Built-in DI (`Microsoft.Extensions.DependencyInjection`) | 1 | Transient / Scoped / Singleton; "Do not resolve a scoped service directly from a singleton"; scope validation throws in Development; `AddDbContext` is scoped | With .NET | n/a | [Service lifetimes](https://learn.microsoft.com/en-us/dotnet/core/extensions/dependency-injection/service-lifetimes) |
| Configuration + Options pattern | 1 | `IOptions<T>` (singleton, no reload), `IOptionsSnapshot<T>` (scoped, per request), `IOptionsMonitor<T>` (singleton, change notifications); `ValidateDataAnnotations()`, `ValidateOnStart()` | With .NET | n/a | [Options pattern](https://learn.microsoft.com/en-us/dotnet/core/extensions/options) |
| Logging (`ILogger<T>`) | 1 | Platform logging API that OpenTelemetry collects from | With .NET | n/a | [Observability with OTel](https://learn.microsoft.com/en-us/dotnet/core/diagnostics/observability-with-otel) |
| Authentication / authorization | 1 | Separate concepts; built-in handlers; avoid ROPC grant; managed identities for Azure; Secret Manager for dev secrets; do not store production connection strings in env vars | With .NET | n/a | [Security topics](https://learn.microsoft.com/en-us/aspnet/core/security/) |
| ASP.NET Core Identity + `MapIdentityApi<TUser>()` | 1 (simple cases) | Cookie or bearer token endpoints for SPAs. Tokens "aren't standard JSON Web Tokens"; "meant primarily for simple scenarios", not a token server. Defaults: access token 1 h, refresh token 14 days. .NET 10 adds passkeys (WebAuthn/FIDO2) | With .NET | no evidence collected here | [Identity API for SPAs](https://learn.microsoft.com/en-us/aspnet/core/security/authentication/identity-api-authorization), [ASP.NET Core 10](https://learn.microsoft.com/en-us/aspnet/core/release-notes/aspnetcore-10.0) |
| Duende IdentityServer (OIDC server used by old SPA templates) | 2 | Third party; "might require you to pay a license fee for production use" | By Duende (terms not opened) | no evidence collected here | [Identity API for SPAs](https://learn.microsoft.com/en-us/aspnet/core/security/authentication/identity-api-authorization) |
| Rate limiting (`Microsoft.AspNetCore.RateLimiting`) | 1 | Fixed window, sliding window, token bucket, concurrency; partitions by user/IP/key. Counters are **per instance**: behind a load balancer the effective limit multiplies; use a gateway or shared store for a global limit; partitioning on user input is a DoS risk | With .NET (doc monikers from 7.0) | n/a | [Rate limiting](https://learn.microsoft.com/en-us/aspnet/core/performance/rate-limit) |
| OpenAPI (`Microsoft.AspNetCore.OpenApi`) | 1 | First-party document generation (`AddOpenApi`, `MapOpenApi`), transformers, build-time generation via `Microsoft.Extensions.ApiDescription.Server`. .NET 10 defaults to OpenAPI 3.1. Template maps it only in Development. UI needs a third-party package | With .NET | no evidence collected here | [OpenAPI overview](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/openapi/overview), [ASP.NET Core 10](https://learn.microsoft.com/en-us/aspnet/core/release-notes/aspnetcore-10.0) |
| Swashbuckle / NSwag | 2 | Third-party OpenAPI libraries; the current OpenAPI overview presents the first-party package instead. `Swashbuckle.AspNetCore` 10.3.1 (2026-10-19), MIT; `NSwag.AspNetCore` 14.7.1 (2026-04-20), MIT; neither page shows a deprecation notice | Community; no date | no evidence collected here | [NuGet Swashbuckle](https://www.nuget.org/packages/Swashbuckle.AspNetCore), [NuGet NSwag](https://www.nuget.org/packages/NSwag.AspNetCore), [OpenAPI overview](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/openapi/overview) |
| Performance and reliability rules | 1 | Do not block on `Task.Wait`/`.Result`; no `Task.Run` then await; async all the way; paginate; use `IHttpClientFactory`; `HttpContext` is not thread-safe and must not be captured in background work; never `async void`; use hosted services for background work | n/a | n/a | [Best practices](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/best-practices) |
| Common vulnerability guidance | 1 | XSS, SQL injection (EF parameters), CSRF/antiforgery, open redirect, CORS, HTTPS enforcement, data protection, NuGet supply chain | n/a | n/a | [Security topics](https://learn.microsoft.com/en-us/aspnet/core/security/) |

## 4. Data access

| Item | Class | Available (latest seen) | Supported | Adopted | Source |
| --- | --- | --- | --- | --- | --- |
| EF Core 10 | 1 | `Microsoft.EntityFrameworkCore` 10.0.14 (2026-10-25) | EF Core releases page: "November 10, 2028". The .NET policy page gives .NET 10 2028-11-14, and the EF page says EF Core support is "aligned with .NET releases and support". Microsoft's two pages differ by four days; this is not a typo here. Plan on the earlier date | no evidence collected here | [EF Core releases](https://learn.microsoft.com/en-us/ef/core/what-is-new/), [NuGet](https://www.nuget.org/packages/Microsoft.EntityFrameworkCore) |
| EF Core 9 / 8 | 2 | Both target .NET 8 | Until 2026-11-10 | no evidence collected here | [EF Core releases](https://learn.microsoft.com/en-us/ef/core/what-is-new/) |
| EF Core 11 | (next) | 11.0.0-rc.3 (2026-10-25); "scheduled for November 2026" | After GA, with .NET 11 | n/a | same |
| EF Core migrations | 1 | `dotnet ef migrations add`, `dotnet ef database update` (local dev). For deployment: migration bundles, or a reviewed SQL script when SQL approval is needed; Aspire has its own migrations integration | With EF Core | n/a | [Migrations overview](https://learn.microsoft.com/en-us/ef/core/managing-schemas/migrations/) |
| Change tracking vs no-tracking | 1 | Tracking snapshots entities and does identity resolution; `AsNoTracking` for read-only (Microsoft benchmark: 0.71x time, ~61% allocations in its sample) | With EF Core | n/a | [Efficient querying](https://learn.microsoft.com/en-us/ef/core/performance/efficient-querying) |
| EF query performance rules | 1 | Use indexes; project only needed columns; limit results; keyset pagination over `Skip/Take`; split queries against cartesian explosion; eager loading; "Because lazy loading makes it extremely easy to inadvertently trigger the N+1 problem, it is recommended to avoid it"; stream with `AsAsyncEnumerable`; raw SQL as last resort; always async, do not mix sync and async | n/a | n/a | [Efficient querying](https://learn.microsoft.com/en-us/ef/core/performance/efficient-querying) |
| Dapper | 2 | 2.1.89 (2026-09-23), Apache-2.0, "a simple micro-ORM used to simplify working with ADO.NET" | Community (owners marc.gravell, nick.craver); no date | no evidence collected here | [NuGet](https://www.nuget.org/packages/Dapper) |
| ADO.NET + `Microsoft.Data.SqlClient` | 2 | 7.1.1 (2026-09-29), MIT | Microsoft; no end date on page | no evidence collected here | [NuGet](https://www.nuget.org/packages/Microsoft.Data.SqlClient) |
| `System.Data.SqlClient` | 4 | 4.9.1 (2026-02-18): "deprecated. Please use Microsoft.Data.SqlClient instead" | Deprecated | context only | [NuGet](https://www.nuget.org/packages/System.Data.SqlClient) |
| SQL Server EF provider | 1/2 | `Microsoft.EntityFrameworkCore.SqlServer` (package page not opened); real-DB testing guidance references it | With EF Core | no evidence collected here | [Integration tests](https://learn.microsoft.com/en-us/aspnet/core/test/integration-tests) |
| PostgreSQL EF provider (Npgsql) | 1/2 | `Npgsql.EntityFrameworkCore.PostgreSQL` 10.0.3 (2026-07-10), PostgreSQL licence, targets EF Core 10; 11.0.0-rc.3 prerelease | Npgsql project; no date | no evidence collected here | [NuGet](https://www.nuget.org/packages/Npgsql.EntityFrameworkCore.PostgreSQL) |
| EF Core in-memory provider (for tests) | 4 (for testing) | Exists; "highly discouraged" as a fake; "only supported for legacy applications" | Legacy | context only | [Testing strategy](https://learn.microsoft.com/en-us/ef/core/testing/choosing-a-testing-strategy) |

PHP note: EF Core sits where Magento's resource models + collections sit, but the unit of work is the scoped `DbContext` per request.

## 5. Async and resource management

| Item | Class | Key rule (quoted or summarized from Microsoft) | Source |
| --- | --- | --- | --- |
| `async`/`await`, `Task`/`Task<T>` | 1 | Default return type for async methods; async all the way; no sync over async | [Best practices](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/best-practices), [ValueTask&lt;T&gt;](https://learn.microsoft.com/en-us/dotnet/api/system.threading.tasks.valuetask-1) |
| `ValueTask`/`ValueTask<T>` | 2 (advanced) | "the default choice for any asynchronous method should be to return a Task or Task<TResult>. Only if performance analysis proves it worthwhile should a ValueTask<TResult> be used". Never await twice, never call `AsTask` twice, never read `.Result` before completion | [ValueTask&lt;T&gt;](https://learn.microsoft.com/en-us/dotnet/api/system.threading.tasks.valuetask-1) |
| `CancellationToken` | 1 | Passed to every async API in Microsoft samples (rate limiter `OnRejected`, `BeginTransactionAsync(token)`); no dedicated page opened | [Rate limiting](https://learn.microsoft.com/en-us/aspnet/core/performance/rate-limit), [DisposeAsync](https://learn.microsoft.com/en-us/dotnet/standard/garbage-collection/implementing-disposeasync) |
| `IAsyncEnumerable<T>` / `await foreach` | 1 | Returning `IEnumerable<T>` from an action causes synchronous enumeration; `IAsyncEnumerable<T>` enumerates asynchronously (since ASP.NET Core 3.0); EF streams with `AsAsyncEnumerable` | [Best practices](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/best-practices), [Efficient querying](https://learn.microsoft.com/en-us/ef/core/performance/efficient-querying) |
| `System.Threading.Channels` | 2 | In-process producer/consumer FIFO; bounded (back pressure, `Wait`/`DropNewest`/`DropOldest`/`DropWrite`) or unbounded; part of the shared framework since .NET Core 3.0 | [Channels](https://learn.microsoft.com/en-us/dotnet/core/extensions/channels) |
| `IDisposable` / `IAsyncDisposable`, `using` / `await using` | 1 | `DisposeAsync` is called by `await using`; implementing only `IAsyncDisposable` can leak if consumers call `Dispose`; the DI container disposes services at the end of their lifetime | [DisposeAsync](https://learn.microsoft.com/en-us/dotnet/standard/garbage-collection/implementing-disposeasync) |

## 6. Testing

| Item | Class | Available (latest seen) | Supported / licence | Adopted | Source |
| --- | --- | --- | --- | --- | --- |
| xUnit.net v3 (`xunit.v3`) | 1 | 4.0.2 (2026-10-09), targets .NET 8 and .NET Framework 4.7.2+ | .NET Foundation project; supports VSTest and Microsoft.Testing.Platform | no evidence collected here | [NuGet](https://www.nuget.org/packages/xunit.v3), [xUnit releases](https://xunit.net/releases/), [Testing in .NET](https://learn.microsoft.com/en-us/dotnet/core/testing/) |
| xUnit.net v2 | 3 | 2.9.3; "Core Framework v2 is in maintenance mode" | Critical fixes only | no evidence collected here | [xUnit releases](https://xunit.net/releases/) |
| NUnit | 2 | 5.0.0 (2026-09-27), MIT | .NET Foundation project | no evidence collected here | [NuGet](https://www.nuget.org/packages/NUnit), [Testing in .NET](https://learn.microsoft.com/en-us/dotnet/core/testing/) |
| MSTest | 2 | 4.5.2 (2026-10-27), MIT | Microsoft | no evidence collected here | [NuGet](https://www.nuget.org/packages/MSTest), [Testing in .NET](https://learn.microsoft.com/en-us/dotnet/core/testing/) |
| TUnit | 2 (listed by Microsoft) | "entirely built on top of MTP and doesn't support VSTest" | Community | no evidence collected here | [Testing in .NET](https://learn.microsoft.com/en-us/dotnet/core/testing/) |
| Microsoft.Testing.Platform (MTP) vs VSTest | 1 | Two test platforms; Microsoft has a VSTest-to-MTP migration guide | Microsoft | n/a | [Testing in .NET](https://learn.microsoft.com/en-us/dotnet/core/testing/) |
| `WebApplicationFactory<TEntryPoint>` (`Microsoft.AspNetCore.Mvc.Testing`) | 1 | In-memory `TestServer`, `CreateClient()`, replace services via `ConfigureWebHost`/`ConfigureTestServices`; sample uses xUnit | With .NET | n/a | [Integration tests](https://learn.microsoft.com/en-us/aspnet/core/test/integration-tests) |
| Testcontainers for .NET | 1 | 4.16.0 (2026-10-08), MIT; throwaway Docker containers; modules include PostgreSQL, SQL Server, RabbitMQ (Kafka not shown on the home page) | Community | Referenced by the EF Core team's testing guide | [NuGet](https://www.nuget.org/packages/Testcontainers), [Site](https://dotnet.testcontainers.org/), [Testing strategy](https://learn.microsoft.com/en-us/ef/core/testing/choosing-a-testing-strategy) |
| Fluent Assertions 8.x | 2 (licence caveat) | 8.11.0 (2026-09-14). NuGet: "This version is free for open-source projects and non-commercial use"; commercial use needs a paid Xceed licence (announced 2025-01-13, no versions named). The 8.0 start of the commercial line is inferred, not stated by Xceed | Xceed | no evidence collected here | [NuGet](https://www.nuget.org/packages/FluentAssertions), [Xceed announcement](https://xceed.com/?p=2592) |

Microsoft's EF Core testing position (quote): "We recommend that developers have good test coverage of their application running against their actual production database system." If a double is needed, prefer a repository layer over SQLite or in-memory fakes ([Testing strategy](https://learn.microsoft.com/en-us/ef/core/testing/choosing-a-testing-strategy)). Note that the ASP.NET Core integration-tests page still shows SQLite in-memory as the in-memory option ([Integration tests](https://learn.microsoft.com/en-us/aspnet/core/test/integration-tests)). The two pages put the emphasis in different places; the EF Core page is the more specific one.

Browser constraint for Dev Dojo: Docker and Testcontainers cannot run in the browser, so lessons can teach the concept only.

## 7. Messaging and background processing

| Item | Class | Available (latest seen) | Supported / licence | Adopted | Source |
| --- | --- | --- | --- | --- | --- |
| `IHostedService` / `BackgroundService`, Worker Service template (`Microsoft.NET.Sdk.Worker`) | 1 | Hosted services run in Worker and web apps; registered as singletons, so create a scope (`IServiceScopeFactory`) to use scoped services such as `DbContext` | With .NET | n/a | [Hosted services](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/host/hosted-services), [Best practices](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/best-practices) |
| Hangfire (`Hangfire.Core`) | 2 | 1.8.25 (2026-08-28), LGPL-3.0 | Vendor; no date | no evidence collected here | [NuGet](https://www.nuget.org/packages/Hangfire.Core) |
| Quartz.NET (`Quartz`) | 2 | 4.7.2 (2026-11-04), Apache-2.0 | Community | no evidence collected here | [NuGet](https://www.nuget.org/packages/Quartz) |
| RabbitMQ (`RabbitMQ.Client`) | 2 | 7.2.2 (2026-08-05), Apache-2.0 OR MPL-2.0, "Copyright ... Broadcom" | Broadcom/RabbitMQ team | no evidence collected here | [NuGet](https://www.nuget.org/packages/RabbitMQ.Client) |
| Kafka (`Confluent.Kafka`) | 2 | 2.16.0 (2026-10-07), Apache-2.0, owner "confluent" | Confluent | no evidence collected here | [NuGet](https://www.nuget.org/packages/Confluent.Kafka) |
| Azure Service Bus (`Azure.Messaging.ServiceBus`) | 2 | 7.21.0 (2026-09-24), MIT, owners Microsoft/azure-sdk. ASP.NET Core best practices suggest brokers like Service Bus to offload long-running work | Microsoft | no evidence collected here | [NuGet](https://www.nuget.org/packages/Azure.Messaging.ServiceBus), [Best practices](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/best-practices) |
| MassTransit v9+ | 2 (licence caveat) | 9.2.5 (2026-10-30): "MassTransit is a commercial product that must be licensed"; company Massient, Inc.; "v9 is now a commercial product with full support" | Massient (terms on massient.com, not opened) | no evidence collected here | [NuGet](https://www.nuget.org/packages/MassTransit), [v9 announcement](https://masstransit.massient.com/introduction/v9-announcement), [Change log](https://masstransit.massient.com/support/upgrade) |
| MassTransit v8 | 3 | "Earlier versions are available under a permissive open source license" | End of v8 support: **not verified** | no evidence collected here | [NuGet](https://www.nuget.org/packages/MassTransit) |

### Licensing changes of popular libraries (vendor sources)

| Library | Change | Date | Free use | Old versions | Source |
| --- | --- | --- | --- | --- | --- |
| AutoMapper (v15.0+) and MediatR (v13.0+) | Dual licence RPL-1.5 + Lucky Penny Software Commercial License, tiered by developer count. The post names v15.0 / v13.0 only; terms for AutoMapper 16 / MediatR 14 are assumed to be the same, not verified | 2025-07-02 | Community edition: under USD 5M gross revenue, non-profits under USD 5M budget, education, non-production; licence key registration required | Prior releases keep their licence; archived repos | [Jimmy Bogard](https://www.jimmybogard.com/automapper-and-mediatr-commercial-editions-launch-today/). Latest seen: AutoMapper 16.2.0, MediatR 14.2.0 (both 2026-07-02) on [NuGet](https://www.nuget.org/packages/AutoMapper) / [NuGet](https://www.nuget.org/packages/MediatR). **Security:** NuGet flags AutoMapper 16.0.0, 16.1.0, 15.0.1 and 15.1.0 as having a vulnerability "with high severity" (advisory not named); 16.1.1, 16.2.0 and 15.1.3 are not flagged. Existing code pinned to a flagged version needs an upgrade |
| MassTransit (v9+) | Commercial, by Massient, Inc. | v9 is GA (9.2.5 on NuGet) | Not stated on the pages opened | v8 and earlier under permissive OSS licence | [NuGet](https://www.nuget.org/packages/MassTransit) |
| Fluent Assertions (8.x; boundary inferred) | Paid Xceed commercial licence for commercial use; the announcement names no versions, and NuGet states the terms for 8.11.0 ("This version") | Announced 2025-01-13 | Open-source and non-commercial | 7.x terms not verified | [Xceed](https://xceed.com/?p=2592), [NuGet](https://www.nuget.org/packages/FluentAssertions) |

Track implication: teach the patterns (mediator, mapping, message bus) with plain C# or first-party APIs first; present these libraries as "you will meet them in existing code, check the licence".

## 8. Containers, Aspire, observability, health, CI/CD

| Item | Class | Facts | Supported | Source |
| --- | --- | --- | --- | --- |
| Official images (`mcr.microsoft.com/dotnet/sdk`, `aspnet`, `runtime`, `runtime-deps`) | 1 | Distroless options: Azure Linux and Ubuntu Chiseled (non-root by default, no shell, no package manager) | Microsoft | [dotnet-docker README](https://github.com/dotnet/dotnet-docker/blob/main/README.md) |
| SDK container publishing | 1 | `dotnet publish /t:PublishContainer`; built into SDK 8.0.200+ (no package needed); `EnableSdkContainerSupport` for console apps | Microsoft | [SDK containers](https://learn.microsoft.com/en-us/dotnet/core/containers/overview) |
| Default container port 8080, non-root | 1 | Since .NET 8, images use port 8080 (`ASPNETCORE_HTTP_PORTS`) to work with the non-root `app` user | Microsoft | [Breaking change](https://learn.microsoft.com/en-us/dotnet/core/compatibility/containers/8.0/aspnet-port) |
| Aspire (formerly ".NET Aspire") | 1 (dev orchestration) | Latest 13.6: 13.6.4 marked Latest on GitHub (2026-10-24); the Aspire support page still lists 13.6.2 (2026-10-20) as the latest patch, so it lags GitHub; ServiceDefaults wire OpenTelemetry, health endpoints `/health` `/alive`, service discovery, HttpClient resilience; dashboard | "only the latest release of Aspire is supported by Microsoft"; 13.x minors roughly every 1-2 months | [Aspire support](https://aspire.dev/support/), [Releases](https://github.com/microsoft/aspire/releases), [OTel in .NET](https://learn.microsoft.com/en-us/dotnet/core/diagnostics/observability-with-otel) |
| OpenTelemetry .NET | 1 | .NET exposes `ILogger`, `Meter`, `ActivitySource`; OTel packages collect and export (OTLP, Prometheus, Zipkin); ASP.NET Core / HttpClient / SqlClient instrumentation | OpenTelemetry project (contrib repos) | [OTel in .NET](https://learn.microsoft.com/en-us/dotnet/core/diagnostics/observability-with-otel) |
| Health checks | 1 | `AddHealthChecks()`, `MapHealthChecks("/healthz")`; readiness vs liveness via tags; EF Core check `AddDbContextCheck` is Microsoft-maintained; `AspNetCore.Diagnostics.HealthChecks` is community, "Microsoft doesn't maintain or support" | Microsoft (core) | [Health checks](https://learn.microsoft.com/en-us/aspnet/core/host-and-deploy/health-checks) |
| CI with dotnet CLI | 1 | `actions/setup-dotnet`, then `dotnet restore`, `dotnet build --no-restore`, `dotnet test --no-restore`. The Microsoft sample still pins SDK 6.0.401 and `@v3` actions: outdated sample, current pattern | n/a | [GitHub Actions test workflow](https://learn.microsoft.com/en-us/dotnet/devops/dotnet-test-github-action) |

## 9. Architecture: Microsoft's own guidance

| Style | Class | Microsoft guidance | Source date / caveat | Source |
| --- | --- | --- | --- | --- |
| All-in-one monolith | 2 | Default template is a single-project monolith; separation by folders; grows into "spaghetti code" | e-book chapter ms.date 2021-12-12 | [Common web app architectures](https://learn.microsoft.com/en-us/dotnet/architecture/modern-web-apps-azure/common-web-application-architectures) |
| Layered / N-layer (UI, BLL, DAL) | 2 | Most common; drawback: business layer depends on data access at compile time | same | same |
| Clean Architecture (hexagonal / ports and adapters / onion) | 1 | "the most appropriate way to structure non-trivial monolithic applications"; Application Core + Infrastructure + UI; reference `ardalis/cleanarchitecture`, eShopOnWeb | same; e-book is dated | same |
| Vertical slices | 2 | **No Microsoft written guidance found**; only a video, "On .NET Live: Clean Architecture, Vertical Slices, and Modular Monoliths" | video only | [On .NET Live](https://learn.microsoft.com/en-us/shows/on-dotnet/on-dotnet-live-clean-architecture-vertical-slices-and-modular-monoliths-oh-my) |
| Modular monolith | 2 | **No Microsoft written guidance found** (same video). The e-book argues a monolith can be "a better option" than microservices when boundaries are unclear or scaling whole instances is enough | e-book 2021-12-12 | [Common web app architectures](https://learn.microsoft.com/en-us/dotnet/architecture/modern-web-apps-azure/common-web-application-architectures) |
| Microservices | 2 | ".NET Microservices" e-book is edition v7.0 (.NET 7, out of support); it says a .NET 8 edition and the new eShop sample are in progress. Current reference app `dotnet/eShop` is "services-based" with Aspire and targets .NET 10 | e-book dated (2022-01-10) | [Microservices e-book](https://learn.microsoft.com/en-us/dotnet/architecture/microservices/), [dotnet/eShop](https://github.com/dotnet/eShop) |

## 10. Legacy and migration

| Item | Class | Available | Supported (by whom, until when) | Adopted | Source |
| --- | --- | --- | --- | --- | --- |
| .NET Framework 4.8 / 4.8.1 | 3 | 4.8 (2019-04-18), 4.8.1 (2022-08-09) | Microsoft, as a **Windows component**: follows the lifecycle of the Windows version it is installed on; no fixed end date. 4.8.1 on Windows 10 20H2+, Windows 11, Server 2022/2025 | no evidence collected here | [Lifecycle](https://learn.microsoft.com/en-us/lifecycle/products/microsoft-net-framework), [FAQ](https://learn.microsoft.com/en-us/lifecycle/faq/dotnet-framework) |
| .NET Framework 4.6.2 | 3 | | End date on the lifecycle page: "1/13/2027 6:59:59 AM" (that is, end of 2027-01-12 Pacific). The page is dated 2023-01-25 | | [Lifecycle](https://learn.microsoft.com/en-us/lifecycle/products/microsoft-net-framework) |
| .NET Framework 3.5 SP1 | 3 | | Standalone product since Win10 1809 / Server 2019; end date 2029-01-09 | | same |
| .NET Framework 4.5.2 / 4.6 / 4.6.1 | 4 | | Retired 2022-04-26 (SHA-1) | | same |
| ASP.NET MVC 5, Web API 2, Web Pages 3, SignalR 2 | 3 | NuGet packages on .NET Framework | Classed as "Tools": "minimum of 12 months notification prior to the end of support". No end date extracted (table garbled) | | [ASP.NET support policy](https://dotnet.microsoft.com/en-us/platform/support/policy/aspnet) |
| ASP.NET Web Forms, modules, handlers | 3 | Part of .NET Framework | Follows .NET Framework policy. No ASP.NET Core equivalent; Microsoft's path is Blazor (e-book "Blazor for ASP.NET Web Forms Developers", edition v8.0) or the Copilot modernization agent | | [ASP.NET support policy](https://dotnet.microsoft.com/en-us/platform/support/policy/aspnet), [Blazor for Web Forms devs](https://learn.microsoft.com/en-us/dotnet/architecture/blazor-for-web-forms-developers/), [Tooling](https://learn.microsoft.com/en-us/aspnet/core/migration/fx-to-core/tooling) |
| ASP.NET Core 2.3 on .NET Framework | 4 (soon) | | Announced 2026-04-07: **end of support 2027-04-13**, "no longer recommended as a migration strategy" | | [ASP.NET support policy](https://dotnet.microsoft.com/en-us/platform/support/policy/aspnet) |
| WCF server (.NET Framework) | 3 | Part of .NET Framework | Follows .NET Framework | | [FAQ](https://learn.microsoft.com/en-us/lifecycle/faq/dotnet-framework) |
| CoreWCF (server on modern .NET) | 3 | 1.9 (2026-04-24) | Microsoft policy page: on .NET 10 until 2028-11-14; on .NET 8/9 until 2026-11-10; or six months after the next minor | | [CoreWCF policy](https://dotnet.microsoft.com/en-us/platform/support/policy/corewcf) |
| WCF Client (`System.ServiceModel.*`) | 3 | 10.x (2025-11-11), 8.x, 4.10 | 10.x until 2028-11-14 (.NET 10); 8.x and 4.10 until 2026-11-10 | | [WCF Client policy](https://dotnet.microsoft.com/en-us/platform/support/policy/wcf-client) |
| WPF on modern .NET | 3 (for this track) | Open-source, runs on .NET, Windows only | With .NET | | [WPF overview](https://learn.microsoft.com/en-us/dotnet/desktop/wpf/overview/) |
| WinForms on modern .NET | 3 (for this track) | Part of .NET (RC2 post lists Windows Forms changes in .NET 11) | With .NET (dedicated support page not opened) | | [.NET 11 RC2](https://devblogs.microsoft.com/dotnet/dotnet-11-rc-2/) |
| .NET Upgrade Assistant | 4 | Still documented | "officially deprecated" | | [Upgrade Assistant](https://learn.microsoft.com/en-us/dotnet/core/porting/upgrade-assistant-overview) |
| GitHub Copilot modernization agent | 1 (migration) | In Visual Studio 2026 and VS 2022 17.14.16+; plans and automates upgrades, commits each change | Microsoft | | [Upgrade Assistant](https://learn.microsoft.com/en-us/dotnet/core/porting/upgrade-assistant-overview), [Tooling](https://learn.microsoft.com/en-us/aspnet/core/migration/fx-to-core/tooling) |
| System.Web adapters | 1 (migration) | `Microsoft.AspNetCore.SystemWebAdapters` (+ `.FrameworkServices`, `.CoreServices`, `.Abstractions`): lets libraries using `System.Web.HttpContext` run on both stacks; remote session and remote authentication | Microsoft | | [System.Web adapters](https://learn.microsoft.com/en-us/aspnet/core/migration/fx-to-core/inc/systemweb-adapters), [Start incremental migration](https://learn.microsoft.com/en-us/aspnet/core/migration/fx-to-core/start) |
| Incremental migration with YARP | 1 (migration) | "Strangler Fig": new ASP.NET Core app proxies unmigrated routes to the Framework app via YARP; upgrade libraries leaf-first to .NET Standard 2.0 or multi-target; recommended for large production apps | Microsoft | | [Migration overview](https://learn.microsoft.com/en-us/aspnet/core/migration/fx-to-core/), [Start](https://learn.microsoft.com/en-us/aspnet/core/migration/fx-to-core/start) |

## 11. Summary classification

| Class | Items |
| --- | --- |
| 1 Recommended for new projects | .NET 10 + C# 14, minimal APIs, built-in DI, Options, `ILogger`, rate limiting, `Microsoft.AspNetCore.OpenApi`, Identity (simple cases), EF Core 10 + migrations, Npgsql/SQL Server providers, `async`/`Task`/`CancellationToken`/`IAsyncEnumerable`, `IAsyncDisposable`, xUnit v3, `WebApplicationFactory`, Testcontainers, `BackgroundService`, SDK container publish, chiseled images, OpenTelemetry, health checks, Aspire (dev), Clean Architecture (Microsoft's only written recommendation) |
| 2 Established | Controllers, Dapper, ADO.NET/`Microsoft.Data.SqlClient`, NUnit, MSTest, TUnit, Channels, `ValueTask`, Hangfire, Quartz.NET, RabbitMQ.Client, Confluent.Kafka, Azure Service Bus, MassTransit/MediatR/AutoMapper/Fluent Assertions (commercial now), layered, vertical slices, modular monolith, microservices, Duende IdentityServer |
| 3 Legacy for maintenance/migration | .NET Framework 4.8/4.8.1, MVC 5, Web API 2, Web Forms, WCF/CoreWCF/WCF Client, xUnit v2, MassTransit v8, WPF/WinForms (outside backend scope) |
| 4 Discontinued, context only | .NET 5/6/7 and older, `System.Data.SqlClient`, .NET Upgrade Assistant, .NET Framework 4.5.2-4.6.1, ASP.NET Core 2.3 on Framework (ends 2027-04-13), EF in-memory provider as a test fake |
| Next (not GA on research date) | .NET 11, C# 15 (unions, closed hierarchies), EF Core 11 |

## 12. PHP/Magento to C#/.NET: transferable concepts and traps

The Magento / PHP column is the author's background knowledge (for example, the PHP-FPM request lifecycle) and has no source unless a link is given. The .NET column and the traps link to the Microsoft pages they rely on.

| Topic | Magento / PHP | .NET | Trap |
| --- | --- | --- | --- |
| DI container | `di.xml` preferences, constructor injection, ObjectManager, generated factories/proxies | `IServiceCollection` in `Program.cs`, constructor injection, lifetimes Transient/Scoped/Singleton ([lifetimes](https://learn.microsoft.com/en-us/dotnet/core/extensions/dependency-injection/service-lifetimes)) | Magento objects are effectively per-request because the process dies. In .NET a singleton lives for the whole process: a scoped `DbContext` captured in a singleton is a bug (scope validation throws in Development). No ObjectManager equivalent should be used as a service locator |
| ORM / repositories | Resource models, collections, repositories, service contracts | EF Core `DbContext` + LINQ; repositories optional | Wrapping EF in a generic repository is not required; Microsoft recommends repositories mainly as a test seam and warns about their cost ([testing strategy](https://learn.microsoft.com/en-us/ef/core/testing/choosing-a-testing-strategy)). Lazy loading reproduces the N+1 problem known from Magento collections in loops ([efficient querying](https://learn.microsoft.com/en-us/ef/core/performance/efficient-querying)) |
| Schema changes | Declarative schema (`db_schema.xml`), data patches | EF Core migrations (code-first, model snapshot, history table), bundles or SQL scripts in deployment ([migrations](https://learn.microsoft.com/en-us/ef/core/managing-schemas/migrations/)) | Migrations are generated diffs to review, not a declared target state |
| Events / observers / plugins | `events.xml` observers, around/before/after plugins | Middleware for the HTTP pipeline; endpoint filters; C# events; domain events in Clean Architecture's core ([architectures](https://learn.microsoft.com/en-us/dotnet/architecture/modern-web-apps-azure/common-web-application-architectures)); there is no interception of arbitrary public methods built in | Middleware order is explicit code, not config merge; a plugin-style "intercept any public method" needs decorators registered in DI |
| Packages | Composer, `composer.json`, Packagist, PSR-4 | NuGet `PackageReference` in `.csproj`; `dotnet restore` | Licences changed on popular packages (MediatR, AutoMapper, MassTransit, Fluent Assertions): check before adding, as you would with Magento Marketplace extensions |
| Request lifecycle | PHP-FPM: boot, handle one request, discard all state | Long-running ASP.NET Core host; thread pool serves many concurrent requests | Static fields and singletons are shared across requests and threads; `HttpContext` is not thread-safe and must not be stored or used after the request; blocking (`.Result`) causes thread-pool starvation ([best practices](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/best-practices)) |
| Background work | Cron (`crontab.xml`), message queue consumers (`queue_consumer.xml`) | `BackgroundService` in the same host or a Worker Service; Hangfire/Quartz for scheduling; brokers for queues ([hosted services](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/host/hosted-services)) | Hosted services are singletons: create a scope per unit of work |
| Configuration | `env.php`, `config.php`, `core_config_data` with scopes | `appsettings.json` + environment overrides + Options classes, validated on start ([options](https://learn.microsoft.com/en-us/dotnet/core/extensions/options)) | `IOptions<T>` does not reload; use `IOptionsMonitor<T>` for live changes. Do not store production secrets in plain config ([security](https://learn.microsoft.com/en-us/aspnet/core/security/)) |
| Typing | Type declarations checked at call time ("otherwise a TypeError is thrown"); without `declare(strict_types=1)` scalars are coerced; strict mode is per file and only for scalars ([PHP type declarations](https://www.php.net/manual/en/language.types.declarations.php)) | Static compile-time typing, generics, nullable reference types, `async` return types. Nullable reference types are "entirely a compile-time feature" and recent templates set `<Nullable>enable</Nullable>` ([nullable reference types](https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/null-safety/nullable-reference-types)) | Compiler errors replace many runtime checks; `null` mistakes produce compiler warnings only, and the runtime behaviour is unchanged, so ignored warnings still end in a `NullReferenceException` |
| Caching / scaling | Full page cache, Varnish, Redis | Memory or distributed cache; per-instance state | In-process state (rate limiter counters, memory cache) does not span instances ([rate limiting](https://learn.microsoft.com/en-us/aspnet/core/performance/rate-limit)) |
