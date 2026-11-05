# Scheduling with Hangfire and Quartz.NET

After this lesson you can choose between a plain hosted service, Hangfire and Quartz.NET for scheduled and deferred jobs, configure each one in an ASP.NET Core or Worker Service host, and explain what changes when the app runs on more than one instance.

You need: 10/01 (hosted services and `PeriodicTimer`), 05/02 (scoped services), 07/02 (`DbContext`) and 08/03 (authorization policies).

## Schedules and job storage

A **cron expression** says when a job runs, in five fields: minute, hour, day of month, month and day of week. `0 2 * * *` is 02:00 every day and `*/5 * * * *` is every five minutes; `*` means "any". The name comes from `cron`, the Unix scheduler. Quartz.NET adds a leading seconds field (below).

<!-- coderabbit-ai-generated:v1 -->

<!-- coderabbit-ai-generated-section:v1:f95013f6844c68a5864a21c41ee43b7b9433353a4deaed705221e85f530c30bb -->

A scheduler needs more than the expression: a record of what ran, when and whether it failed, retries, and coordination between instances. A `BackgroundService` with a `PeriodicTimer` (lesson 10/01) has none of these. Hangfire uses shared persistent storage for jobs and their state. Quartz.NET requires a configured persistent job store to preserve schedules across restarts and clustering to coordinate multiple instances sharing that store.

<!-- /coderabbit-ai-generated:v1 -->

The plain timer also runs once **per process**. Scale the API to three replicas and the nightly export runs three times. Container platforms make several instances the normal case, so decide this before the first deploy.

## The three options

| Need | Plain `BackgroundService` | Hangfire | Quartz.NET |
| --- | --- | --- | --- |
| Interval loop on one instance, losing a run is fine | good fit | more than needed | more than needed |
| Fire-and-forget or delayed jobs from a request, with retries and a UI | build it yourself | main use case | possible, less direct |
| Recurring jobs on many instances, run once per occurrence | build it yourself | yes, through shared storage | yes, with a clustered persistent store |
| Calendars, many triggers per job, misfire rules | no | basic cron | main use case |
| Licence | part of .NET | LGPL-3.0 | Apache-2.0 |

## Hangfire

Hangfire stores each job as a method call plus serialized arguments in a storage backend (SQL Server through `Hangfire.SqlServer` in its docs). `AddHangfireServer` registers the processing server as a hosted service, so any host with it pulls jobs from storage. The packages are `Hangfire.Core`, `Hangfire.AspNetCore` and a storage package; for Quartz.NET 4.x, `Quartz` is enough in a generic host.

```csharp
using Hangfire;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddHangfire(config => config
    .SetDataCompatibilityLevel(CompatibilityLevel.Version_180)
    .UseSqlServerStorage(builder.Configuration.GetConnectionString("Hangfire")));
builder.Services.AddHangfireServer();
builder.Services.AddScoped<InvoiceService>();

var app = builder.Build();

app.MapPost("/orders/{id:int}/invoice", (int id, IBackgroundJobClient jobs) =>
{
    jobs.Enqueue<InvoiceService>(s => s.SendAsync(id, CancellationToken.None));
    return Results.Accepted();
});

app.Services.GetRequiredService<IRecurringJobManager>()
    .AddOrUpdate<InvoiceService>("nightly-reminders",
        s => s.SendRemindersAsync(CancellationToken.None), Cron.Daily());

app.Run();
```

What to know:

- **Arguments are serialized into storage.** Pass an order id, not an `Order` entity. The job loads fresh data when it runs, which may be minutes later on another server.
- **`CancellationToken.None` is a placeholder.** Hangfire replaces it with a real token that is cancelled on shutdown or when the job is deleted.
- **Retries are on by default.** A failing job is retried automatically, 10 attempts by default, then moves to the `Failed` state, where it stays until someone retries or deletes it. Change the count with `[AutomaticRetry(Attempts = 3)]`. Because a job can run more than once, its work must be idempotent (lesson 10/04).
- **Recurring jobs** need a unique id: `AddOrUpdate` with the same id replaces the schedule, so calling it at every startup is safe. Cron expressions are evaluated in UTC unless you pass `RecurringJobOptions` with a `TimeZone`.
- **Dashboard.** `app.UseHangfireDashboard()` shows queues, retries and failures. By default only local requests can open it; exposing it requires an authorization filter. An open dashboard lets anyone delete or trigger jobs.

## Quartz.NET

Quartz.NET separates the **job** (what runs, an `IJob`) from the **trigger** (when it runs). One job can have several triggers, and cron expressions include a seconds field (`0 0 2 * * ?` is 02:00:00 every day). Quartz.NET 4.x registers itself on the host builder:

```csharp
using Quartz;

HostApplicationBuilder builder = Host.CreateApplicationBuilder(args);

builder.AddQuartz(q =>
{
    q.UsePersistentStore(store =>
    {
        store.UseSqlServer(builder.Configuration.GetConnectionString("Quartz")!);
        store.UseClustering();
    });
    q.AddDeclaredJobs();
});
builder.AddQuartzHostedService(options => options.WaitForJobsToComplete = true);

await builder.Build().RunAsync();

[QuartzJob(Name = "export-catalog", Group = "exports")]
[CronTrigger("0 0 2 * * ?", TimeZone = "Europe/Lisbon")]
[DisallowConcurrentExecution]
public sealed class ExportCatalogJob(ILogger<ExportCatalogJob> logger) : IJob
{
    public async ValueTask Execute(IJobExecutionContext context, CancellationToken cancellationToken = default)
    {
        logger.LogInformation("Export started at {Time}", context.FireTimeUtc);
        await Task.Delay(TimeSpan.FromSeconds(1), cancellationToken); // ... real export
    }
}
```

What to know:

- **Storage is optional.** Without `UsePersistentStore`, schedules live in memory, like a timer with nicer syntax. With a persistent store and clustering, the nodes share the trigger tables and each occurrence fires on one node.
- **Name jobs and triggers** when you use a persistent store. Generated names change at each start and break the check for "does this job already exist".
- **`[DisallowConcurrentExecution]`** stops a slow run from overlapping the next one.
- **`WaitForJobsToComplete = true`** makes shutdown wait for running jobs, within the host shutdown timeout.
- **Jobs are resolved from DI.** `AddJob<T>()` and `ScheduleJob<T>()` register the job type as scoped, and the job factory opens a scope per fire, so a job can take a `DbContext`; because the type is registered, `ValidateOnBuild` checks its constructor at startup.
- **Version caveat.** The 4.x API above (`ValueTask Execute(..., CancellationToken)`, `builder.AddQuartz`) differs from 3.x, where `Execute` returns `Task` and registration is `services.AddQuartz`. Most blog posts and Stack Overflow answers show 3.x.

## Common mistakes

- **Passing entities as job arguments.** Hangfire serializes them into storage, so the job runs later on a stale, possibly large snapshot. Pass the id and load fresh data.
- **Exposing the Hangfire dashboard without authorization.** Anyone who reaches it can trigger or delete jobs. Add an authorization filter tied to an admin policy.
- **A timer-based job on every replica.** Three instances run the nightly export three times. Use shared job storage, or a single scheduler instance.
- **Non-idempotent jobs under automatic retries.** A job that fails after charging a card is retried, up to 10 times, and charges again. Make the work idempotent (lesson 10/04).

## In practice

- **Start with the simplest tool that is correct for your instance count.** A single Worker Service instance with a `PeriodicTimer` is fine for "every 5 minutes, skipping a run is harmless".
- **Choose Hangfire** when most jobs are enqueued by the application ("send this invoice after the request returns") and operators need a dashboard with retry buttons.
- **Choose Quartz.NET** when scheduling is the product: many cron triggers, time zones, calendars, misfire handling, clustering.
- **Neither replaces a broker.** A job store is a work queue owned by one application. When several services must react to "order placed", publish a message (lesson 10/03).

## Status as of 2026-11-05

- Hangfire (`Hangfire.Core`) 1.8.25, released 2026-08-28, LGPL-3.0.
- Quartz.NET (`Quartz`) 4.7.2, released 2026-11-04, Apache-2.0. Its 4.x documentation is the source for the API in this lesson; check the migration guide before upgrading 3.x code, and note that it says applications using `MassTransit.Quartz` must stay on 3.x.

## Check yourself

1. Why is a `PeriodicTimer` in a hosted service not a drop-in replacement for a scheduler once the app has several instances?
2. Why should a Hangfire job receive an order id instead of the order object?
3. When does Quartz.NET run a trigger once across the cluster, and when does every node run it?
4. A Hangfire job charges a card and fails after the charge succeeds. What will the default retry do, and what does the job need?
