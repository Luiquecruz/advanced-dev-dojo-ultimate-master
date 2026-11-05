# Microservices Trade-offs

After this lesson you can decide between a monolith, a modular monolith and microservices with concrete criteria, name what a split costs in consistency, testing and operations, and recognize what a .NET service needs once a method call becomes a network call.

You need: 07/06 (transactions), 10/04 (outbox and idempotent consumers), 10/05 (typed HTTP clients and the standard resilience handler), 11/04 (distributed tracing) and lesson 02 of this module (the modular monolith).

## One transaction, then a network call

In a monolith, checkout reserves stock, creates the order and writes the payment record in one database transaction (07/06): if any step fails, all of it rolls back. A busy monolith scales by cloning: more copies of the same app behind a load balancer, one database.

Split Inventory into its own service and that transaction is gone. Checkout now sends a request over the network that can time out after the stock was reserved, or succeed twice on a retry. Microservices are not modules in separate containers: they are separate programs with separate databases, and every former method call becomes a distributed systems problem.

## What a microservice is

The Azure Architecture Center describes microservices as small, autonomous services, each implementing a single business capability within a bounded context, owned by a small team, **deployed independently**, and **persisting its own data**. Services talk through well-defined APIs or messages and never share a database schema. Independent deployment and data ownership are the defining traits; running in containers is not.

## What you buy

- **Independent deployment:** one team ships its service without a full-system release.
- **Independent scaling:** scale the catalog read path, not the admin.
- **Fault isolation:** one failing service need not take down the rest, if callers handle faults.
- **Team autonomy:** a team owns code, schema and pipeline end to end.

## What you pay

The same Azure page lists the challenges: more moving parts, harder testing across service dependencies, network latency and chatty calls, data integrity without ACID transactions across services, versioning without breaking callers, correlated logging, and the need for a mature DevOps culture and distributed-systems skills. Concretely, what you used to get for free you now build:

| In a monolith | Across services |
| --- | --- |
| One transaction | Eventual consistency: outbox, idempotent consumers, compensation (10/04) |
| A method call | An HTTP or gRPC call with timeouts, retries and a circuit breaker |
| A join | API composition or a local copy of the other service's data |
| A stack trace | Distributed tracing with OpenTelemetry (11/04) |
| Rename a method | A versioned contract and coordinated consumers |

## A method call becomes a network call

In the modular monolith of lesson 02, Ordering reads stock in-process:

```csharp
var available = await stockReader.GetAvailableAsync(sku, ct); // IStockReader, same process
```

As a service, the same call needs a typed `HttpClient` with resilience. `Microsoft.Extensions.Http.Resilience` adds a standard pipeline (rate limiter, total timeout, retry, circuit breaker, attempt timeout):

```csharp
builder.Services.AddHttpClient<InventoryClient>(client =>
        client.BaseAddress = new Uri(builder.Configuration["Services:Inventory"]!)) // e.g. "https://inventory.internal/"
    .AddStandardResilienceHandler(options =>
        options.Retry.DisableForUnsafeHttpMethods()); // never blindly retry POST/PUT/DELETE

internal sealed class InventoryClient(HttpClient http)
{
    public async Task<int> GetAvailableAsync(string sku, CancellationToken ct)
    {
        var stock = await http.GetFromJsonAsync<StockResponse>($"stock/{Uri.EscapeDataString(sku)}", ct);
        return stock?.Available ?? 0;
    }
}

internal sealed record StockResponse(string Sku, int Available);
```

Keep a trailing slash on the base address so relative paths such as `stock/...` append to it. The typed client, `AddStandardResilienceHandler` and its default timeouts and retries are taught in 10/05; what matters here is that those retries apply to every HTTP method, so a call with side effects needs `DisableForUnsafeHttpMethods()` or an idempotent endpoint. Even with all of that, the caller must decide what "inventory is down" means for checkout. That decision is business logic, not plumbing.

## Decision criteria

Prefer **a monolith or modular monolith** when:

- the boundaries are still unclear; Microsoft's e-book notes that early in a product "you might not have a clear idea where the natural functional boundaries are";
- scaling the whole application by cloning instances is simple and cheap enough;
- one or two teams work on the code;
- the operations staff and tooling for many pipelines, tracing and on-call do not exist yet.

Consider **extracting a service** when several of these hold:

- a module has a stable boundary, its own data and few synchronous calls to others;
- it needs a different scaling profile, release cadence, runtime or compliance boundary;
- a separate team owns it and is blocked by the shared release;
- the platform (CI/CD per service, tracing, centralized logs, a broker) already works.

Microsoft's guide to service boundaries adds the checks: no chatty calls between services (chattiness suggests they belong together), no two services that must be deployed together, and boundaries that avoid data-consistency problems. When in doubt, start coarse: splitting one service in two is easier than refactoring functionality across several.

## Common mistakes

- **Services that share one database schema.** Catalog, Inventory and Ordering read each other's tables, so a column change breaks three services and they must deploy together: network cost without autonomy. Each service owns its data.
- **A chain of synchronous calls.** A request that crosses five services in a row is slower and less available than any one of them; one slow service stalls all. Prefer events, or fewer, larger services.
- **Retrying a `POST` that has side effects.** The first attempt reserved stock, timed out, and the retry reserves it again. Disable retries for unsafe methods or make the endpoint idempotent.
- **A shared domain library.** Every service upgrades together. Share contracts, not domain code.

## In practice

- **The usual path is incremental.** Build a modular monolith, keep module boundaries honest, extract the one module that has a real reason to leave, and route traffic to it gradually (the Strangler Fig approach of 13/04).
- **Share contracts, not code.** The Azure guide lists shared libraries as an antipattern because they couple releases; share message and API schemas instead.
- **Reference app:** `dotnet/eShop` is Microsoft's current services-based sample, on .NET 10 with Aspire, running PostgreSQL, Redis and RabbitMQ. It references MediatR 13.1.0, which falls under the RPL-1.5/commercial licence from lesson 04, so check the licence before you copy its dependencies.

## Status as of 2026-11-05

- The ".NET Microservices: Architecture for Containerized .NET Applications" e-book is edition v7.0 (ASP.NET Core 7, page dated 2022-01-10) and has carried a note that a .NET 8 edition is being created since 2024; no newer edition is published as of 2026-11-05. .NET 7 is out of support; read it for patterns, not for API versions.
- The Azure Architecture Center microservices style page is dated 2025-06-30; the HTTP resilience page, which documents the standard handler and `DisableForUnsafeHttpMethods()`, is dated 2026-02-24.

## Check yourself

- Which three things did the monolith's checkout get for free from one database that a split Inventory service would have to rebuild?
- Two services call each other on every request and always deploy together. What does that tell you about the boundary?
- Why does the standard resilience handler's retry need to be disabled or made safe for `POST`?
- List the criteria that would make you extract the Inventory module from your modular monolith.
