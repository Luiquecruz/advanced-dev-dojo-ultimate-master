# Map: How This Track Works

After this lesson you can say where to start the track, how it is organized (an optional fundamentals module, then theory, quizzes, graded challenges and local projects), which module teaches each part of a backend job, and the three ideas the rest of the track builds on: types checked before the program runs, one long-running process, and waiting without blocking a thread.

You need: no earlier lesson. If you have never written a program, start with module 00 (00/01, your first program) and come back here after 00/07.

## Where to start

Module 00, **Programming Fundamentals with C#**, is for people who have never programmed. Its seven lessons, each with a graded challenge, teach variables, methods, decisions and loops, text, collections, classes, and errors and tests. Every later module assumes them.

The skip rule is a single test: open the challenge of 00/07 (errors and tests). If you can solve it without help, start here at module 01. If you cannot, work through module 00 from 00/01. Module 00 is optional: you can skip it and still reach 100% of the track. Its seven lessons count toward your progress once you complete one of 00/02 to 00/06.

## How the track works

The track has 15 modules and 80 lessons in four tiers:

- **Fundamentals (module 00, optional):** programming from zero, in C#.
- **Core (modules 01–11):** the platform, the language, LINQ, async, ASP.NET Core, Web APIs, data access, security, testing, background work, messaging and HTTP clients, delivery.
- **Deepening (modules 12 and 14):** application architecture; integration, performance and quality.
- **Legacy (module 13):** .NET Framework code and incremental migration.

Every lesson has theory and a graded quiz. 26 lessons also have a graded C# challenge: all seven of module 00, and 19 in modules 02–04, 08–10, 12 and 14. A challenge runs in this browser: the first time you open one, the app downloads the .NET runtime and the C# compiler. **Run** executes your program and prints its output; **Run tests** grades your code against the lesson's tests. The app records passed quizzes and challenges in your progress.

Seven practice projects (P1–P7) close modules 03, 06, 07, 09, 10, 11 and 13; you build them on your machine with the .NET 10 SDK, and Docker from P3 on, and you check them yourself against acceptance criteria such as `dotnet test` passing or an HTTP request returning 409. The hello-world below needs only the SDK; it is a file-based app, which lesson 01/02 introduces:

```csharp
// hello.cs: run with `dotnet run hello.cs` (.NET 10 SDK, no project file needed)
Console.WriteLine($"Hello from {System.Runtime.InteropServices.RuntimeInformation.FrameworkDescription}");
```

## The map: a backend job in .NET

| Part of the job | In .NET | Where |
| --- | --- | --- |
| Use other people's libraries | NuGet packages, `<PackageReference>` in `.csproj` | 01/04 |
| Run a web server | Kestrel inside a long-running ASP.NET Core host | 05/01 |
| Give each class what it needs | `IServiceCollection` in `Program.cs`, service lifetimes | 05/02 |
| Read settings and secrets | `appsettings.json`, environment variables, Options | 05/03 |
| Run code around every request | Middleware, endpoint filters, decorators | 05/05, 06/03 |
| Expose HTTP endpoints | Minimal APIs or controllers | 06/01 |
| Read and write a database | EF Core `DbContext` with LINQ, or Dapper with SQL | 07/02, 07/05 |
| Change the database schema | EF Core migrations | 07/03 |
| Work outside a request | `BackgroundService`, schedulers, message brokers | 10 |
| Call other services | `HttpClient` with resilience | 10/05 |
| Test the code | xUnit v3, `WebApplicationFactory` | 09 |

Composition is ordinary C# code in `Program.cs`, read from top to bottom:

```csharp
// Program.cs of a project created with `dotnet new web`
var builder = WebApplication.CreateBuilder(args);
builder.Services.AddSingleton(TimeProvider.System); // explicit registration

var app = builder.Build();
app.MapGet("/now", (TimeProvider clock) => clock.GetUtcNow());
app.Run();
```

## Three ideas the rest of the track builds on

**1. Types are checked before the program runs.** The compiler rejects a value of the wrong type at build time, so the program never starts with that mistake in it. Module 02 goes deeper.

```csharp
decimal total = new List<decimal> { 19.90m, 5m }.Sum();
// total = "free"; // compile error CS0029: cannot implicitly convert 'string' to 'decimal'
Console.WriteLine(total);
```

**2. One process serves every request.** An ASP.NET Core application starts once and serves thousands of requests at the same time. Anything static, or registered as a singleton, is shared by all of them and lives until the process stops. Two requests can change it at the same moment:

```csharp
// Program.cs of a project created with `dotnet new web`
var app = WebApplication.Create(args);
var requests = 0; // captured once, shared by every request for the life of the process
app.MapGet("/", () => $"Request number {Interlocked.Increment(ref requests)}");
app.Run();
```

**3. Waiting must not block a thread.** Requests run on a shared pool of threads. A thread blocked while a file or database answers is capacity taken from every other request. `await` releases the thread while the operating system does the work; module 04 explains how.

```csharp
string blocking = File.ReadAllTextAsync("products.csv").Result; // holds a thread until the read ends
string freeing = await File.ReadAllTextAsync("products.csv");    // the thread returns to the pool meanwhile
```

## Common mistakes

- **Skipping module 00 without the test.** Learners who skip it and cannot solve the 00/07 challenge stall in 02/01, where methods, lists and classes are assumed. Try that challenge first; if you need help with it, work through module 00.
- **Keeping one user's data in a static field or singleton.** Every concurrent request shares it, so one customer sees another customer's cart. Per-request data belongs in a scoped service (05/02) or a parameter.
- **Copying an old sample.** Code with a `Startup` class, `System.Web` or `web.config` was written for .NET Framework or early ASP.NET Core and often fails to compile on .NET 10. Check the date and target framework (01/03).
- **Blocking on `.Result` in a web app.** It works on your laptop and starves the thread pool under load, so requests queue. Use `await`.

## In practice

- **Read modules 01–04 before ASP.NET Core.** Without the type system, LINQ and async, framework code reads like magic and you copy it without knowing what breaks.
- **Read the tags.** Each lesson is tagged with a status (`recommended`, `established`, `legacy`, `context`), a tier (`core`, `deepening`, `legacy`) and a kind (`theory`, `project`). A `legacy` topic is one you meet in existing code, not one to start new projects with.
- **Install the SDK by P1,** which closes module 03. The in-browser challenges need nothing installed.
- **Look for the date.** Facts that age live in a `Status as of` section with the date they were checked, and each lesson links the official Microsoft documentation for its topic.

## Status as of 2026-11-05

- .NET 10 is the current LTS release (released 2025-11-11, supported until 2028-11-14), with C# 14 as its default language version. It is the baseline of this track.
- The track mentions .NET 11 and C# 15 as "next", never as the baseline. Support dates for every version, including .NET 8 and 9 and the status of .NET 11, are in 01/03.

## Check yourself

1. How do you decide whether to start at module 00 or at module 01?
2. Why does a counter kept in a static field of a web app keep growing, and what can go wrong when two requests change it at once?
3. What does the app record when you finish a lesson, and how are the practice projects checked?
4. Why does a thread blocked on I/O cost capacity for every other request?
