# Aspire for Local Orchestration

After this lesson you can describe an API, a worker, PostgreSQL and RabbitMQ in one C# AppHost, start them all with `aspire run`, and read their logs, traces and metrics in the Aspire dashboard. You will know what Aspire's service defaults wire up for you, how far its publish and deploy commands go, and the support model that comes with it: only the latest release is supported.

You need: 05/03 (configuration and connection strings), 10/03 (RabbitMQ), 10/05 (HTTP clients and resilience) and 11/01, 11/03 and 11/04 (Compose, hosting platforms, OpenTelemetry and health checks).

## One model for the whole local system

A backend rarely runs alone: an API, a worker, a database and a broker must start together, and each app needs the host names, ports and passwords of the others. With a hand-written `compose.yaml`, you copy those values into each app's settings and keep the two in sync by hand.

Aspire's answer: **the topology is C# code that also configures your apps.** The AppHost starts the containers and your .NET projects, generates connection strings and injects them as environment variables into each project that references a resource. The dashboard then shows every process's logs and traces in one place.

Aspire is **not your production platform**. Its overview says "Aspire isn't a cloud provider or production runtime." The AppHost orchestrates development and can generate deployment artifacts (below); in production, your apps run on App Service, Container Apps, Kubernetes or ECS (lesson 11/03), with configuration from that platform.

## The AppHost

`aspire new` creates a solution from a template. The AppHost is a small project whose entry file declares resources and the references between them:

```csharp
var builder = DistributedApplication.CreateBuilder(args);

var postgres = builder.AddPostgres("postgres").WithDataVolume();
var catalogDb = postgres.AddDatabase("catalogdb");
var messaging = builder.AddRabbitMQ("messaging").WithManagementPlugin();

var api = builder.AddProject<Projects.Catalog_Api>("api")
    .WithReference(catalogDb).WaitFor(catalogDb)
    .WithReference(messaging).WaitFor(messaging);

builder.AddProject<Projects.Orders_Worker>("worker")
    .WithReference(catalogDb).WaitFor(catalogDb)
    .WithReference(messaging).WaitFor(messaging);

builder.Build().Run();
```

- `AddPostgres` and `AddRabbitMQ` come from the hosting integrations `Aspire.Hosting.PostgreSQL` and `Aspire.Hosting.RabbitMQ`; `aspire add postgres` installs them. They run the official images in your container runtime.
- `WithReference(catalogDb)` gives the project a connection string named after the resource, `catalogdb`, as configuration.
- `WaitFor` delays the project's start until the resource is healthy. This is the Aspire version of Compose's `condition: service_healthy` from lesson 11/01.
- `Projects.Catalog_Api` is a generated type for the referenced project, so a renamed project is a compile error, not a wrong path.

## Consuming resources in the apps

On the app side, client integrations read that connection string and also add health checks and telemetry for the client:

```csharp
var builder = WebApplication.CreateBuilder(args);

builder.AddServiceDefaults();
builder.AddNpgsqlDbContext<CatalogDb>(connectionName: "catalogdb"); // Aspire.Npgsql.EntityFrameworkCore.PostgreSQL

var app = builder.Build();
app.MapDefaultEndpoints();
// ... endpoints
app.Run();
```

The app does not know where PostgreSQL runs. It asks for `catalogdb`, and in production the platform supplies `ConnectionStrings__catalogdb` the same way. Without the client integration, `builder.Configuration.GetConnectionString("catalogdb")` reads the same value.

## Service defaults

The `ServiceDefaults` project in the template is ordinary code you own. Its `AddServiceDefaults()` does four things:

- **OpenTelemetry** with ASP.NET Core, `HttpClient` and runtime instrumentation, exporting over OTLP when `OTEL_EXPORTER_OTLP_ENDPOINT` is set. This is the lesson 11/04 setup, already written.
- **Health checks**, with a `self` check tagged `live`; `MapDefaultEndpoints()` maps `/health` (all checks) and `/alive` (`live` only) in Development.
- **Service discovery**, so `http://api` resolves to the right local port.
- **Resilience** on every `HttpClient` through `AddStandardResilienceHandler()`, which retries transient failures.

Microsoft's OpenTelemetry docs suggest reusing the service defaults project even without the AppHost, as the quickest way to configure OTel.

## The dashboard

`aspire run` starts the AppHost and the dashboard: every resource and its state, console and structured logs, traces across the API, RabbitMQ and the worker, and metrics. It receives OTLP, so it is also published as a standalone container, `mcr.microsoft.com/dotnet/aspire-dashboard`, that any OTLP-emitting app can use. It is a developer tool: Microsoft says it is "a developer visualization tool, not a production monitoring tool."

## Publish and deploy

The same application model can produce deployment output. `aspire publish` writes target-specific artifacts with unresolved parameters, for another tool to apply. `aspire deploy` generates the output, resolves the parameters and applies it. Targets include Docker Compose, Kubernetes, AKS, Azure Container Apps and Azure App Service, each added in the AppHost, for example:

```csharp
builder.AddDockerComposeEnvironment("env");
```

The CLI reference marks `publish`, `deploy` and `destroy` as preview commands. Treat them as a fast way to a first environment, and review what they generate before it becomes your production pipeline.

## Common mistakes

- **Expecting `/health` in production.** The service defaults map `/health` and `/alive` only in Development, so a production probe gets 404 and the platform marks every replica unhealthy. Map your own health endpoints (lesson 11/04).
- **Shipping the AppHost as a production process.** It is a development orchestrator; in production nothing supervises your apps but the platform. Deploy the apps and use `aspire publish` for the artifacts.

## In practice

- **Use it for the inner loop.** Aspire pays off as soon as the local setup has more than one process plus infrastructure. One `aspire run` replaces a Compose file, hand-copied connection strings and a separate tracing setup.
- **Keep production configuration in the platform.** The apps read standard connection strings and OTLP settings, so they run the same with or without the AppHost.
- **Plan for upgrades.** Only the latest Aspire release is supported, and support for a version ends when the next one ships ("support for Aspire 8.0 ended when Aspire 8.1 was released"). The support page describes the cadence as "roughly a new major release every year with various minor releases throughout the year". Budget for `aspire update` (preview) as routine work, like any dependency update.
- **It is not only for .NET.** AppHosts can be C# or TypeScript, and they can orchestrate JavaScript, Python, Go, Java and other workloads.

## Status as of 2026-11-05

- Latest release: Aspire 13.6 (released 2026-09-29). The support page lists 13.6.2 (2026-10-20) as the latest patch, while GitHub marks 13.6.4 (2026-10-24) as Latest.
- Support policy (aspire.dev/support): "At any time, only the latest release of Aspire is supported by Microsoft."
- Naming: the product docs now call it "Aspire" rather than ".NET Aspire" and live at aspire.dev.
- `aspire publish`, `deploy`, `destroy` and `update` are marked preview in the CLI reference.

## Check yourself

1. What does `WithReference(catalogDb)` put into the API's configuration, and how does the API read it in production without the AppHost?
2. Why would a production readiness probe get 404 on `/health` with the unmodified template, and what do you change?
3. What does "only the latest release is supported" mean for a team's maintenance plan?
