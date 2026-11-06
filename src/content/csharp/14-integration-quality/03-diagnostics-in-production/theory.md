# Diagnostics in Production

After this lesson you can investigate a .NET process that is slow, burning CPU or growing in memory, without attaching a debugger. You will read live runtime metrics with `dotnet-counters`, record a CPU trace with `dotnet-trace`, capture and analyze a memory dump with `dotnet-dump`, and do all three when the app runs in a container.

You need: 04/05 (thread-pool starvation), 11/01 (containers), 11/04 (OpenTelemetry metrics) and 14/02 (the GC).

## A process that lives for days

A .NET API is one process that runs for days. A leak accumulates instead of disappearing, and one blocked thread pool slows every request. The runtime exposes its own counters, traces and dumps through a **diagnostic port** that the `dotnet-*` tools talk to, so you can look inside a running process without a debugger. The method is always the same: start from metrics, then zoom in.

## The workflow

1. **Metrics first** (`dotnet-counters`, or the OpenTelemetry runtime metrics from 11/04): is it CPU, GC, the thread pool, exceptions or memory?
2. **CPU or latency** → `dotnet-trace`.
3. **Memory growth** → `dotnet-gcdump` for a heap snapshot, or `dotnet-dump` for the full picture.

Install the tools as .NET tools (`dotnet tool install --global dotnet-counters`, and the same for the others). Starting with the .NET 10 SDK you can also run one without installing it: `dnx dotnet-counters monitor --process-id 1234`. The tools must run as the same user as the target process, or as root.

## `dotnet-counters`: live runtime metrics

```bash
dotnet-counters ps
dotnet-counters monitor --process-id 1234 --refresh-interval 3 --counters System.Runtime,Microsoft.AspNetCore.Hosting
```

On .NET 9 and later, `System.Runtime` shows `System.Diagnostics.Metrics` instruments with OpenTelemetry-style names. What to read:

- `dotnet.gc.collections` by generation and `dotnet.gc.heap.total_allocated`: a high gen 2 count or a fast-growing allocation total points to lesson 14/02's problems.
- `dotnet.gc.last_collection.heap.size`: if it keeps climbing between collections under steady load, something holds references.
- `dotnet.thread_pool.queue.length` and `dotnet.thread_pool.thread.count`: the starvation signature from 04/05.
- `dotnet.exceptions`: thousands per second means exceptions used for control flow, or a failing dependency.

`dotnet-counters collect --format csv` writes the same values to a file for later analysis.

## `dotnet-trace`: where the time goes

```bash
dotnet-trace collect --process-id 1234 --duration 00:00:00:30 --format Speedscope
```

With no profile flags, `collect` enables `dotnet-common` (GC, JIT, exceptions, threading events) and `dotnet-sampled-thread-time`, which samples managed thread stacks about every millisecond. The default output is a `.nettrace` file for Visual Studio or PerfView; `--format Speedscope` converts it for speedscope.app. Look for the widest frames: that is where the threads spend their time. Other profiles target specific questions: `gc-verbose` samples allocations, `database` captures ADO.NET and EF Core commands. Older guides use `--profile cpu-sampling`; that profile was removed from `collect`, and the replacement is `--profile dotnet-sampled-thread-time,dotnet-common`.

## `dotnet-gcdump` and `dotnet-dump`: what holds memory

```bash
dotnet-gcdump collect --process-id 1234
dotnet-dump collect --process-id 1234 --type Heap
dotnet-dump analyze ./core_20261105_101500
```

A `.gcdump` contains only the managed heap graph and is small, but collecting it triggers a full gen 2 collection, which can pause a large process. A dump from `dotnet-dump` contains the whole process (`Full` is the default type, `Heap` skips mapped images), so it is large and may contain secrets such as tokens and connection strings: treat it like a database backup. Inside `analyze`, SOS commands find the leak:

```bash
> dumpheap -stat
> dumpheap -type Catalog.Products.ProductDto -stat
> dumpheap -mt 00007f6c20a67498
> gcroot 00007f6ad09421f8
```

`dumpheap -stat` lists types by count and total size; take the biggest suspect, list its instances, and `gcroot` one address to see the reference chain that keeps it alive, typically a static field, a singleton cache or an event subscription. For a slow leak, take two dumps some minutes apart and compare the counts.

## Inside a container

The tools work in containers with a few rules from Microsoft's container diagnostics page:

- **Same container**: install the tools at build time (bigger image, larger attack surface) or copy them in when needed. Chiseled images have no shell or SDK, which pushes you to the next option.
- **Sidecar or host**: the tool needs the target's process namespace (`docker run --pid=container:<id>` or `shareProcessNamespace` in Kubernetes) and the runtime's diagnostic socket, which lives in `/tmp`, so share `/tmp` through a volume (an `emptyDir` in Kubernetes). Without it you get "not running compatible .NET runtime".
- `dotnet-dump` needs ptrace permission, and the dump path is resolved in the **target** container's file system.
- Leave memory headroom: collecting a dump can make the target page in a lot of memory, and a tight limit gets the container killed mid-collection.

```csharp
// Expose the same runtime metrics continuously through OpenTelemetry (11/04).
builder.Services.AddOpenTelemetry()
    .WithMetrics(metrics => metrics
        .AddMeter("System.Runtime")
        .AddAspNetCoreInstrumentation())
    .UseOtlpExporter();
```

On .NET 9 and later, the runtime publishes its built-in metrics on the `System.Runtime` meter, so this dashboard shows the counters above without running a tool.

## Common mistakes

- **A full dump first.** `dotnet-dump collect` on a busy production process can pause it and writes gigabytes, when a counter would have shown whether the heap grows at all. Watch `dotnet-counters` first, then pick a gcdump or a dump.
- **Dumps left in a shared folder.** A dump holds everything in memory: tokens, connection strings, customer data. Store it like a secret and delete it after the analysis.
- **Counters read on an idle app.** No load, no signal. Reproduce the traffic, then measure.
- **Blaming the GC for a reference you keep.** The GC frees only unreachable objects; find the root with `gcroot` instead of tuning GC settings.

## In practice

- Alert on the same signals you would check by hand: GC heap size, thread-pool queue length, exception rate, CPU. Tools are for the incident, metrics are for noticing it.
- Rehearse once on a staging container: which image has the tools, how the sidecar shares `/tmp`, where dumps land and who may read them.
- Prefer a trace or a gcdump to a full dump when you only need CPU stacks or heap statistics; take full dumps for crashes and hangs.
- Try it locally: run any sample API under a load tool, watch `dotnet-counters monitor`, then take a `dotnet-gcdump` and open it in Visual Studio or PerfView.

## Check yourself

1. The API is slow but CPU is low. Which two counters do you look at first, and what pattern would confirm thread-pool starvation?
2. Why might `dotnet-gcdump` be a poor choice on a 20 GB heap during business hours?
3. What two things must a sidecar container share with the app container for `dotnet-counters --process-id` to work?
