# Observability with OpenTelemetry and Health Checks

After this lesson you can make a .NET API and worker observable in production. You will export traces, metrics and logs with OpenTelemetry over OTLP, add your own spans and counters, carry one trace from an HTTP request through a message broker into a worker, and expose liveness and readiness health checks that a platform can probe.

You need: 05/04 (`ILogger`), 05/05 (middleware), 10/03 (RabbitMQ), 10/05 (`HttpClient`) and lesson 03 of this module (probes and replicas).

## Instrumentation is part of the platform

.NET has its own instrumentation APIs: `ILogger` (05/04) for logs, `System.Diagnostics.Metrics.Meter` for metrics, and `System.Diagnostics.ActivitySource`/`Activity` for traces. ASP.NET Core, `HttpClient` and many libraries already emit through them. **OpenTelemetry** (OTel) is the vendor-neutral SDK that collects those signals and exports them, usually over **OTLP** (the OpenTelemetry protocol), to any backend: Azure Monitor, Grafana, Jaeger, Datadog, New Relic and others.

**Nothing is collected until you register it.** No agent watches the process unless you install one (an auto-instrumentation startup hook does exist). With no listener for a source, `StartActivity` returns `null`, and the span silently does not exist.

## The three signals

- **Traces**: a tree of spans (`Activity` objects) sharing one trace id. They answer "where did this request spend its time, across services?"
- **Metrics**: aggregated numbers such as request rate, latency histograms and orders placed. They are cheap to keep for months, and alerts are built on them.
- **Logs**: individual events, structured, and correlated to the trace that was active when they were written.

## Wiring OpenTelemetry

Packages: `OpenTelemetry.Extensions.Hosting`, `OpenTelemetry.Exporter.OpenTelemetryProtocol`, `OpenTelemetry.Instrumentation.AspNetCore`, `OpenTelemetry.Instrumentation.Http`.

```csharp
using System.Diagnostics;
using System.Diagnostics.Metrics;
using OpenTelemetry;
using OpenTelemetry.Metrics;
using OpenTelemetry.Resources;
using OpenTelemetry.Trace;

var builder = WebApplication.CreateBuilder(args);

var ordersSource = new ActivitySource("Catalog.Orders");
var ordersMeter = new Meter("Catalog.Orders");
var ordersPlaced = ordersMeter.CreateCounter<long>("orders.placed");

builder.Logging.AddOpenTelemetry(logging =>
{
    logging.IncludeFormattedMessage = true;
    logging.IncludeScopes = true;
});

builder.Services.AddOpenTelemetry()
    .ConfigureResource(resource => resource.AddService("catalog-api"))
    .WithTracing(tracing => tracing
        .AddAspNetCoreInstrumentation()
        .AddHttpClientInstrumentation()
        .AddSource(ordersSource.Name))
    .WithMetrics(metrics => metrics
        .AddAspNetCoreInstrumentation()
        .AddMeter(ordersMeter.Name))
    .UseOtlpExporter();
```

`UseOtlpExporter()` sends all three signals to the endpoint in `OTEL_EXPORTER_OTLP_ENDPOINT`, for example `http://otel-collector:4317`. That is configuration, so the same image talks to a local Aspire dashboard in development and to your vendor's collector in production. `AddService` names the resource: every span and metric is tagged `catalog-api`, which is how a backend tells your services apart.

## Your own spans and counters

```csharp
// ... PlaceOrder and OrderService are your own types
app.MapPost("/orders", async (PlaceOrder command, OrderService orders, ILogger<Program> logger) =>
{
    using var activity = ordersSource.StartActivity("place order");
    activity?.SetTag("order.sku", command.Sku);

    var id = await orders.PlaceAsync(command);
    ordersPlaced.Add(1);
    logger.LogInformation("Order {OrderId} placed for {Sku}", id, command.Sku);

    return Results.Created($"/orders/{id}", new { id });
});
```

The `?.` matters: the activity is `null` when nothing listens. The log line carries the current trace and span ids, so the backend can jump from the log to the trace.

## One trace across a message broker

Over HTTP, propagation is automatic: the `HttpClient` instrumentation writes the W3C `traceparent` header and ASP.NET Core reads it and makes it the parent of the request span. RabbitMQ.Client 7 does part of this too. It has its own activity sources, `RabbitMQ.Client.Publisher` and `RabbitMQ.Client.Subscriber`, and once you `AddSource("RabbitMQ.Client.*")` it writes the W3C context into the message headers on publish (through `DistributedContextPropagator.Current`) and reads it on delivery. The prerelease `RabbitMQ.Client.OpenTelemetry` package only wires that into OpenTelemetry's propagators. The catch: the client's consumer span is **linked** to the producer context, not parented by it, so your worker's processing span starts a new trace that merely points back. When you need one parent-child chain from the HTTP request into the worker, you **inject** the context yourself when publishing and **extract** it when consuming, as the OpenTelemetry .NET RabbitMQ example does:

```csharp
using System.Diagnostics;
using System.Text;
using OpenTelemetry;
using OpenTelemetry.Context.Propagation;
using RabbitMQ.Client;

// ... channel, body, ea and workerSource come from the surrounding code
// Producer (API): a Producer span, then inject its context into the headers.
using var send = ordersSource.StartActivity("publish order-placed", ActivityKind.Producer);
var props = new BasicProperties { Headers = new Dictionary<string, object?>() };
Propagators.DefaultTextMapPropagator.Inject(
    new PropagationContext(send?.Context ?? default, Baggage.Current), props,
    (p, key, value) => p.Headers![key] = value);
await channel.BasicPublishAsync("", "order-placed", false, props, body);

// Consumer (worker): extract the parent and start a Consumer span under it.
var parent = Propagators.DefaultTextMapPropagator.Extract(default, ea.BasicProperties,
    (p, key) => p.Headers?.TryGetValue(key, out var v) == true && v is byte[] bytes
        ? [Encoding.UTF8.GetString(bytes)] : []);
Baggage.Current = parent.Baggage;
using var receive = workerSource.StartActivity("process order-placed", ActivityKind.Consumer, parent.ActivityContext);
```

The worker must register its own source with `AddSource`, and export to the same backend. Then one trace shows the HTTP request, the publish and the worker span, with the queue time between them. If a link is enough for you, the client's built-in sources save the manual code; check how your backend displays links before you choose.

## Health checks

```csharp
using Microsoft.AspNetCore.Diagnostics.HealthChecks;

builder.Services.AddHealthChecks()
    .AddDbContextCheck<CatalogDb>(tags: ["ready"]); // Microsoft.Extensions.Diagnostics.HealthChecks.EntityFrameworkCore

app.MapHealthChecks("/health/live", new HealthCheckOptions { Predicate = _ => false });
app.MapHealthChecks("/health/ready", new HealthCheckOptions
{
    Predicate = check => check.Tags.Contains("ready")
});
```

`/health/live` runs no checks: it answers `Healthy` while the process can serve requests, which is all a liveness probe should ask. `/health/ready` checks the database. The default response is plain text (`Healthy`, `Degraded` or `Unhealthy`), and `Unhealthy` returns **503**, which is what probes and load balancers look at (lesson 03). The popular `AspNetCore.HealthChecks.*` packages for Redis, RabbitMQ and others are community projects that Microsoft does not maintain or support.

## Common mistakes

- **A source missing from `AddSource`.** You create `new ActivitySource("Catalog.Orders")`, but only the ASP.NET Core spans arrive: `StartActivity` returns `null` and an `activity.SetTag` without `?.` throws `NullReferenceException`. Register every source and meter name, and use `activity?.`.
- **Liveness that checks the database.** A database outage restarts every replica in a loop. Check dependencies in readiness only.
- **Log files inside containers.** They vanish with the replica and nobody reads them. Write to stdout and export through OpenTelemetry.
- **A hard-coded exporter endpoint.** The image then only works against one backend. Read `OTEL_EXPORTER_OTLP_ENDPOINT` from configuration.

## In practice

- **Export through a collector.** Send OTLP to an OpenTelemetry Collector or your vendor's agent, not straight to many backends from every app. For Application Insights, the Azure Monitor OpenTelemetry distro (`UseAzureMonitor()`) plugs into the same pipeline.
- **Name things once.** Use one `ActivitySource` and `Meter` name per service or component, constants shared with `AddSource`/`AddMeter`, and OpenTelemetry semantic-convention tag names where they exist.
- **Keep health checks out of traces.** Aspire's template filters `/health` and `/alive` from ASP.NET Core tracing, otherwise probes dominate your trace list.
- **Watch cardinality.** Never tag metrics with ids or SKUs, which create one time series per value. Put those on spans and logs.

## Status as of 2026-11-05

- Microsoft's OTLP example pins OpenTelemetry packages at 1.19.x and says to use the latest versions, because the OTel APIs keep evolving.
- `RabbitMQ.Client.OpenTelemetry` is at 1.0.0-rc.2 (2025-11-14) on NuGet, still a prerelease.

## Check yourself

1. You call `StartActivity` in a worker and no span appears in the backend. What two things do you check first?
2. RabbitMQ.Client 7 already propagates the trace context. Why does the lesson still inject and extract it by hand?
3. What should `/health/live` and `/health/ready` each check, and what goes wrong if both check the database?
