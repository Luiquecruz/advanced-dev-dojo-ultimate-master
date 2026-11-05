# Project P6: Ship It

This project closes the core of the track. You take the solution as P5 left it (`Catalog.Core`, `Catalog.Infrastructure`, `Catalog.Api`, `Orders.Worker` and the P4 test projects), and make it deliverable without changing an endpoint, a status code or the stock model: a container image for each, a CI pipeline that builds, tests and publishes those images, OpenTelemetry traces that follow one order from the HTTP request through RabbitMQ into the worker, and health checks a platform can probe. Plan for about 9 hours on your machine with the .NET 10 SDK and Docker. Acceptance is self-assessed against the criteria below.

## Coming from PHP/Magento

This is the step where a Magento project gets its deployment pipeline and its New Relic setup. The goal transfers. The shape does not:

- you ship **two images** (API and worker), not a code folder for nginx and PHP-FPM;
- the pipeline **compiles and tests** before it packages anything, and promotes one image per commit;
- tracing is **wired in code** through OpenTelemetry instead of an agent extension, and a broker hop has to carry the trace context explicitly;
- the worker is its own process, so it needs its own telemetry and its own idea of health.

## Goal

From a clean clone, one command starts the whole system locally, and one pull request proves it builds, passes its tests and produces images. When you place an order, you can see one trace that spans the API request, the publish and the worker's processing. `/health` tells you whether the API can reach its database.

## Features

- **Images.** A container image for `Catalog.Api` and one for `Orders.Worker`, each from a multi-stage Dockerfile (lesson 01) that `compose.yaml` references with `build:` (`context: .` at the solution root, `dockerfile:` the project's path). Each Dockerfile copies the `.csproj` of its app and of every project it references (`Catalog.Core`, `Catalog.Infrastructure`) before `dotnet restore`, or a clean build cannot resolve them. Compose cannot run `dotnet publish /t:PublishContainer`, so the Dockerfiles are what make criterion 2 work from a clean clone; the pipeline may still publish with `/t:PublishContainer` (lesson 02) as long as its images also meet criterion 3. Both run as non-root; the API listens on 8080.
- **Compose.** A `compose.yaml` with the API, the worker, PostgreSQL, RabbitMQ and an OTLP backend that accepts traces, metrics and logs, for example the standalone Aspire dashboard (`mcr.microsoft.com/dotnet/aspire-dashboard`). Jaeger stores traces only, so if you choose it, add a metrics and a logs backend (for example Prometheus and Loki behind an OpenTelemetry Collector) for criterion 6. Health-gated start-up uses `depends_on` with `condition: service_healthy`.
- **Pipeline.** GitHub Actions (or Azure DevOps): restore with `--locked-mode`, build, test (unit, `WebApplicationFactory` and Testcontainers tests from P4), and publish both images tagged with the commit SHA on `main` only (lesson 02).
- **Tracing and metrics.** OpenTelemetry in both apps with OTLP export configured by `OTEL_EXPORTER_OTLP_ENDPOINT`, ASP.NET Core and `HttpClient` instrumentation, an `ActivitySource` per app registered with `AddSource`, and context injected into and extracted from the RabbitMQ message headers (lesson 04). Add one custom counter, such as `orders.placed`.
- **Health.** `/health/live` with no dependency checks and `/health/ready` (or `/health`) with `AddDbContextCheck<CatalogDbContext>()`.

A tiny shared helper keeps the two apps consistent:

```csharp
public static class Telemetry
{
    public const string OrdersSource = "Catalog.Orders";
    public const string WorkerSource = "Orders.Worker";
}
```

## Acceptance criteria

1. **Pipeline:** open a pull request; the CI run is green and shows the restore, build and test steps. The image publish step is skipped on the PR and runs after the merge to `main`. The registry then lists both images tagged with the merge commit's SHA.
2. **Compose:** `docker compose up --build` from a clean clone starts all services with no manual step. `docker compose ps` shows every service running, and PostgreSQL and RabbitMQ healthy.
3. **Non-root on 8080:** `curl -i http://localhost:5000/health/live` (host port 5000 mapped to container port 8080) returns `200` with body `Healthy`. `docker inspect --format '{{.Config.User}}'` on each image prints a non-root user (a name or UID, not empty and not `root`).
4. **Readiness reports the database:** `curl -i http://localhost:5000/health/ready` returns `200 Healthy`. After `docker compose stop db` it returns `503 Unhealthy`, and after `docker compose start db` it returns `200` again, without restarting the API.
5. **One trace end to end:** `POST /orders` with a token and a valid body returns `202 Accepted`, as in P5. In the OTLP backend, the trace for that request contains the ASP.NET Core server span, the producer span for the publish, and the worker's consumer span as its descendant, all with the same trace id.
6. **Metrics and logs:** the backend shows the `orders.placed` counter increasing, and the worker's log line for that order carries the same trace id.

## Suggested steps

1. Add a Dockerfile to both projects and run each image alone with `docker run -p 5000:8080`.
2. Write `compose.yaml` for PostgreSQL and RabbitMQ with health checks, then add the API and worker with connection strings in environment variables (`ConnectionStrings__Catalog`). User secrets are not loaded in a container, so pass the bearer settings the same way: `Authentication__Schemes__Bearer__ValidIssuer` and `__ValidAudiences__0` from `appsettings.Development.json`, and `__SigningKeys__0__Issuer` plus `__SigningKeys__0__Value` (the key `dotnet user-jwts key` prints) from an uncommitted `.env` file. Tokens from `dotnet user-jwts create` then work against the container.
3. Add the OTLP backend to Compose and set `OTEL_EXPORTER_OTLP_ENDPOINT` and `OTEL_SERVICE_NAME` on both apps.
4. Wire OpenTelemetry in the API, check you see request spans, then add the custom `ActivitySource` and counter.
5. Inject the context in the publisher and extract it in the consumer; verify the worker span appears under the API trace.
6. Add the health checks and test criterion 4 by stopping the database.
7. Write the workflow: build and test on pull requests first, then the publish job on `main`. Make the job a required check on the branch.

## Stretch goals

- Run the same system with an Aspire AppHost (lesson 05) and compare it with your Compose file.
- Generate Kubernetes manifests (or `aspire publish` output) with liveness and readiness probes pointing at your endpoints.
- Add a migration bundle step to the pipeline that applies EF Core migrations before deploy (module 07/03).
- Sign or scan the images in CI, or publish a tarball with `ContainerArchiveOutputPath` and scan it.

## Where to get help

- Lessons 11/01 to 11/05, and the P5 project lesson (10/05) for the worker and the broker setup.
- [Containerize an app with dotnet publish](https://learn.microsoft.com/en-us/dotnet/core/containers/sdk-publish) and [Health checks in ASP.NET Core](https://learn.microsoft.com/en-us/aspnet/core/host-and-deploy/health-checks).
- [Use OpenTelemetry with OTLP and the Aspire Dashboard](https://learn.microsoft.com/en-us/dotnet/core/diagnostics/observability-otlp-example).

## Check yourself

1. Stopping the database makes readiness fail but leaves liveness green. Why is that the behaviour you want from a platform's point of view?
2. If the worker span shows up as a separate trace, which three places do you check?
3. Why does the pipeline publish images only on `main`, and what tag identifies the build that is running?
