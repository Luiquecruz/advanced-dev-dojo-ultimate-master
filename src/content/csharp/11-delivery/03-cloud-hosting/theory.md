# Cloud Hosting for a .NET API

After this lesson you can place a containerized .NET API on a cloud platform and defend the choice. You will compare Azure App Service, Azure Container Apps and AKS on Azure, and ECS on Fargate, Lambda and EKS on AWS, by what each one runs for you and what it leaves to you. You will also know the Kubernetes vocabulary that job postings assume. This lesson works at concept level from each vendor's own docs; it does not walk through any portal.

## Coming from PHP/Magento

Magento in production is either Adobe's managed cloud offering or your own servers: several web nodes running nginx and PHP-FPM behind a load balancer, with MySQL, Redis for sessions and cache, and Varnish in front. You already know the core lesson of scaling out: the web nodes must be **stateless**, and anything shared goes to Redis or the database.

That lesson transfers completely. A new trap comes from the long-running .NET host (module 05/01). In PHP, a request leaves nothing behind. In .NET, each instance keeps state in memory for its whole life, and three things silently multiply when the platform runs several replicas:

- `IMemoryCache` entries and rate-limiter counters are **per instance** (module 07/07 and 08/05);
- files written to local disk exist on one replica only, and vanish when it is replaced;
- a `BackgroundService` running a nightly job (module 10/01) runs **once per replica**. Magento's cron is configured on one node; a hosted service has no such switch.

## The decision axis: how much platform do you operate?

| You provide | Azure | AWS |
| --- | --- | --- |
| Code or an image; the platform runs web apps | App Service | ECS Express Mode (image only) |
| An image; serverless containers with event scaling | Container Apps | ECS on Fargate |
| A function per event | Azure Functions | Lambda (`dotnet10` runtime) |
| A Kubernetes cluster you configure | AKS | EKS |

Moving down the table gives you more control and more work. For a single API plus a worker, the first two rows are usually enough.

## Azure App Service

App Service hosts web apps and APIs from code or from a custom container, on Linux or Windows. It manages the OS and runtime patching, and adds staging slots for swap deployments, autoscale, custom domains and managed certificates. For a custom container that listens on 8080, set `WEBSITES_PORT` if the platform does not detect the port. This is the closest to "upload the app and it runs".

Any platform with a load balancer in front terminates TLS before your app. Configure the forwarded headers middleware so `Request.Scheme` and the client IP are the real ones, and redirects and generated links do not point to `http://`. When you know the proxy's address (your own nginx, a Kubernetes ingress), trust only that:

```csharp
using System.Net;
using Microsoft.AspNetCore.HttpOverrides;

// ...
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    options.KnownProxies.Add(IPAddress.Parse("10.0.0.100")); // your proxy, not "everyone"
});

var app = builder.Build();
app.UseForwardedHeaders(); // before authentication, HSTS and redirects
```

By default only loopback proxies are trusted. App Service and Container Apps front ends have no single fixed IP, so the `KnownProxies` line above does not help there. Use `ASPNETCORE_FORWARDEDHEADERS_ENABLED=true` (cloud-friendly settings) or clear the known proxies and networks lists. Both trust any sender, so they are safe only while the app is reachable solely through the platform front end.

## Azure Container Apps

Container Apps is a serverless platform for containers. It is built on Kubernetes and open-source pieces such as KEDA, Envoy and Dapr, but it does not expose the Kubernetes API. It scales on HTTP traffic, queue length or any KEDA scaler. Most apps can **scale to zero**, except those scaling on CPU or memory. Each deployment creates a **revision**, and traffic can be split between revisions for blue/green releases. It also runs **jobs**: on demand, on a schedule or triggered by events. A job is the right home for that nightly task, instead of a hosted service in every API replica:

```csharp
// A console app deployed as a scheduled Container Apps job (or a Kubernetes CronJob):
// it runs once, does its work and exits. StockReport is your own class.
var builder = Host.CreateApplicationBuilder(args);
builder.Services.AddScoped<StockReport>();

using var host = builder.Build();
await using var scope = host.Services.CreateAsyncScope();
await scope.ServiceProvider.GetRequiredService<StockReport>().RunAsync(CancellationToken.None);
```

Microsoft's comparison says that, when you want Kubernetes-style apps but not cluster management, many teams start with Container Apps.

## AWS options

- **ECS on Fargate** runs containers without servers to manage. **ECS Express Mode** asks for a container image and two IAM roles. From them it creates a Fargate service, an Application Load Balancer with health checks, auto scaling and networking, at no extra charge beyond those resources.
- **App Runner** used to be the simplest AWS choice, but AWS has closed it to new customers. AWS now points new projects to ECS Express Mode.
- **Lambda** runs functions per event. It has a managed `dotnet10` runtime on Amazon Linux 2023, and suits event handlers more than a long-running API with warm caches.
- **EKS** is managed Kubernetes.

## Kubernetes at concept level

Kubernetes (AKS, EKS, or your own) runs your image as **Pods**. A **Deployment** keeps N replicas running and rolls out new versions. A **Service** gives them one stable address. Probes are how the cluster talks to your app:

- a **liveness** probe that keeps failing makes the kubelet **restart** the container;
- a failing **readiness** probe **removes the Pod from the Service** until it recovers, without restarting it;
- a **startup** probe holds off the other probes until a slow start finishes.

```yaml
containers:
  - name: api
    image: ghcr.io/acme/catalog-api:3f2c1ab
    ports: [{ containerPort: 8080 }]
    securityContext: { runAsNonRoot: true }
    livenessProbe:  { httpGet: { path: /health/live,  port: 8080 } }
    readinessProbe: { httpGet: { path: /health/ready, port: 8080 } }
```

The two endpoints are built in lesson 04. The difference matters: a database outage should fail readiness, not liveness. Otherwise Kubernetes restarts every replica in a loop while the database is down.

## In practice

- **Default choice.** One API and a worker: App Service or Container Apps on Azure, ECS on Fargate (or Express Mode) on AWS. Pick AKS or EKS when you need the Kubernetes API, already have a cluster, or have a platform team to run it.
- **Twelve-factor habits.** Configuration in environment variables and a secret store (Key Vault, Secrets Manager). Managed identities or IAM roles instead of connection-string passwords where the service supports it. Logs to stdout.
- **Shared state is external.** Distributed cache, blob or object storage for files, and a scheduler or job for periodic work.
- **Port and user.** The platform must target 8080, and the image runs as non-root (lesson 01).
- **Common mistakes:** running a scheduled `BackgroundService` in every replica, writing uploads to local disk, forgetting forwarded headers behind a proxy, and pointing liveness at the database.

## Status as of 2026-11-05

- AWS App Runner is closed to new customers; existing customers keep using it, and no new features are planned (AWS availability-change page, checked 2026-11-05).
- The Lambda `dotnet10` runtime has a projected deprecation date of 2028-11-14; `dotnet8` is projected for 2026-11-10.
- AKS offers two modes, AKS Standard and AKS Automatic, according to the Container Apps comparison page.

## Check yourself

1. Your API runs as three replicas and a `BackgroundService` sends a daily report. What happens, and where should that job live instead?
2. Why should a database outage fail the readiness probe and not the liveness probe?
3. What do you give up when you choose Container Apps instead of AKS, and what do you gain?
