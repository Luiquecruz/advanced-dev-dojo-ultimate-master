# Map: How This Track Works

After this lesson you can explain how the track is organized (theory, quizzes, local projects), where each Magento concept lands in .NET, and the three habits from PHP that will mislead you most often.

## Coming from PHP/Magento

Most of what you know transfers. You already build HTTP backends, write SQL, use an ORM with repositories, configure a DI container with constructor injection (`di.xml` preferences, generated factories), run cron jobs and queue consumers, and manage packages with Composer. All of these exist in .NET under other names.

The trap is the runtime model. Under PHP-FPM, Magento boots, serves one request and discards every object it created. A singleton in Magento lives for one request because the process forgets it. An ASP.NET Core application is a single long-running process that serves thousands of requests at the same time on a shared pool of threads. The same code that was harmless in PHP (a static cache, a "per request" singleton, a blocking call) becomes a shared-state bug or a capacity problem. The three mindset shifts below follow from that.

## How the track works

The track has 13 modules and 67 lessons in three tiers:

- **Core (modules 01–11):** the platform, the language, LINQ, async, ASP.NET Core, Web APIs, data access, security, testing, background work and messaging, delivery.
- **Deepening (module 12):** application architecture.
- **Legacy (module 13):** .NET Framework code and incremental migration.

Every lesson is theory plus a graded quiz. There is no C# runtime in this browser app, so there are no code challenges; the quiz result is what the app records in your progress. Seven practice projects (P1–P7) close modules 03, 06, 07, 09, 10, 11 and 13. You build them on your own machine with the .NET 10 SDK, and Docker from P3 on, and you check them yourself against acceptance criteria such as `dotnet test` passing or an HTTP request returning 409.

The hello-world below needs only the SDK; it is a file-based app, which lesson 01/02 introduces:

```csharp
// hello.cs: run with `dotnet run hello.cs` (.NET 10 SDK, no project file needed)
Console.WriteLine($"Hello from {System.Runtime.InteropServices.RuntimeInformation.FrameworkDescription}");
```

balta.io courses appear as optional companions. They are in Portuguese and most target older .NET versions, so the version caveat sits in each link label; the lessons are the source of truth for current APIs. The track itself is in English: in the convenience sample of 69 job postings behind this curriculum (postings dated 2026-10-06 to 2026-11-05; not a market statistic), English was an explicit requirement in 20% of the postings and 34% of the international ones.

## The map: Magento to .NET

| Magento / PHP | .NET | Where |
| --- | --- | --- |
| Composer, `composer.json`, Packagist | NuGet, `<PackageReference>` in `.csproj`, nuget.org | 01/04 |
| PHP-FPM behind nginx | Kestrel inside a long-running ASP.NET Core host | 05/01 |
| `di.xml`, ObjectManager | `IServiceCollection` in `Program.cs`, lifetimes | 05/02 |
| `env.php`, `config.php` | `appsettings.json`, environment variables, Options | 05/03 |
| Plugins and observers | Middleware, endpoint filters, decorators | 05/05, 06/03 |
| `webapi.xml` REST routes | Minimal APIs or controllers | 06/01 |
| Resource models and collections | EF Core `DbContext` and LINQ | 07/02 |
| `db_schema.xml`, data patches | EF Core migrations | 07/03 |
| `crontab.xml`, `queue_consumer.xml` | `BackgroundService`, message brokers | 10 |
| PHPUnit | xUnit v3, `WebApplicationFactory` | 09 |

The biggest structural difference is visible in the first file of any web project. Composition is C# code in `Program.cs`, not XML merged from many modules:

```csharp
// Program.cs of a project created with `dotnet new web`
var builder = WebApplication.CreateBuilder(args);
builder.Services.AddSingleton(TimeProvider.System); // explicit registration, read top to bottom

var app = builder.Build();
app.MapGet("/now", (TimeProvider clock) => clock.GetUtcNow());
app.Run();
```

## Three mindset shifts

**1. Types are checked before the program runs.** PHP checks declared types when a function is called and, without `declare(strict_types=1)`, coerces scalars. The C# compiler rejects a type error at build time, so a whole class of runtime checks disappears. The cost is that you must declare what you mean; module 02 teaches how.

```csharp
decimal total = new List<decimal> { 19.90m, 5m }.Sum();
// total = "free"; // compile error CS0029: cannot implicitly convert 'string' to 'decimal'
Console.WriteLine(total);
```

**2. One process serves every request.** Anything static or registered as a singleton is shared by all concurrent requests and lives until the process stops. A counter that would reset in PHP keeps growing here, and two requests can write it at the same moment:

```csharp
// Program.cs of a project created with `dotnet new web`
var app = WebApplication.Create(args);
var requests = 0; // captured once, shared by every request for the life of the process
app.MapGet("/", () => $"Request number {Interlocked.Increment(ref requests)}");
app.Run();
```

**3. Waiting must not block a thread.** In PHP-FPM a blocked worker only blocks its own request. In ASP.NET Core, threads come from a shared pool; a thread blocked on I/O is capacity taken from every other request. `await` releases the thread while the operating system does the work. Blocking on `.Result` in ASP.NET Core starves the thread pool under load; module 04 explains why.

```csharp
string blocking = File.ReadAllTextAsync("products.csv").Result; // holds a thread until the read ends
string freeing = await File.ReadAllTextAsync("products.csv");    // the thread returns to the pool meanwhile
```

## In practice

- **Read modules 01–04 before ASP.NET Core.** It is tempting to jump to APIs because that is what you build in Magento. Without the type system, LINQ and async, the framework code reads like magic and you copy it without knowing what breaks.
- **Check the date and target framework of anything you copy.** Many answers online were written for .NET Framework (C# 7.3, `System.Web`, `web.config`) or early ASP.NET Core (a `Startup` class); what changed since then is in 01/03. If a sample does not compile on .NET 10, the sample is old.
- **Do not port Magento patterns one to one.** Resolving services from `IServiceProvider` everywhere is the ObjectManager anti-pattern again; generic repositories over EF Core usually add a layer without adding value. The lessons name these cases as they come up.
- **Read the tags.** Each lesson is tagged with a status (`recommended`, `established`, `legacy`, `context`), a tier (`core`, `deepening`, `legacy`) and a kind (`theory`, `project`). A `legacy` topic is something you will meet in existing code, not something to start a new project with.
- **Install the SDK by P1,** which closes module 03.

Dated facts (versions, support dates, licence changes) live in a `Status as of` section with the date they were checked, so you can see how old a claim is.

## Status as of 2026-11-05

- .NET 10 is the current LTS release (released 2025-11-11, supported until 2028-11-14), with C# 14 as its default language version. It is the baseline of this track.
- The track mentions .NET 11 and C# 15 as "next", never as the baseline. Support dates for every version, including .NET 8 and 9 and the status of .NET 11, are in 01/03.

## Check yourself

1. Which Magento object would become a shared-state bug if you ported it unchanged into an ASP.NET Core singleton, and why did it work in Magento?
2. Where does a dependency registration live in a .NET web app, and what replaces the merging of many `di.xml` files?
3. What does the app record when you finish a lesson of this track, and how are the practice projects checked?
4. Why does a blocked thread cost more in ASP.NET Core than a blocked PHP-FPM worker?
