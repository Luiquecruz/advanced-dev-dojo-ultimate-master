# The Runtime, the SDK and the dotnet CLI

After this lesson you can explain what happens between a `.cs` file and running machine code (compiler, CIL, CLR, JIT), tell the SDK from the runtime and say which one a server needs, create a solution with the `dotnet` CLI, and choose between `dotnet run`, `dotnet build` and `dotnet publish`.

## Coming from PHP/Magento

PHP compiles each script to opcodes when it runs (OPcache keeps them in memory) and you deploy source files. Magento adds build-like steps (`setup:di:compile`, static content deploy), but the PHP files themselves are what the server executes. "Which PHP?" is one question with one answer.

In .NET the build is mandatory and produces a different artifact: compiled assemblies (`.dll` files) plus their dependencies. You deploy the published output, not the source tree, and you never run `git pull` followed by `dotnet run` on a server. "Which .NET?" splits into two questions: which **SDK** builds the code on your machine and in CI, and which **runtime** runs it in production.

## From C# to machine code

The C# compiler (Roslyn) turns your source into **common intermediate language (CIL)** and metadata that describes every type and member. Both live in an **assembly**, usually a `.dll`. CIL is CPU-independent. When the program runs, the **common language runtime (CLR)** loads the assembly and a **just-in-time (JIT) compiler** translates each method to native code the first time it is called; later calls run the native code directly. The CLR also provides the garbage collector, type safety checks and exception handling.

```csharp
// Compiled to CIL by `dotnet build`. The JIT turns WithTax into native code on its first call.
static decimal WithTax(decimal net, decimal rate) => Math.Round(net * (1 + rate), 2);

Console.WriteLine(WithTax(100m, 0.21m)); // 121.00
```

Two refinements matter for backends. **Tiered compilation**, on by default since .NET Core 3.0, first produces quick, unoptimized code (or loads precompiled ReadyToRun code) so the app starts fast, then recompiles hot methods with full optimization in the background. That is why a .NET service gets faster during its first minutes under load. **Native AOT** compiles everything to native code at publish time: no JIT at run time, faster startup and less memory, but no runtime code generation (`System.Reflection.Emit`), mandatory trimming and only partial ASP.NET Core support. Treat it as an option for specific workloads, not the default.

## SDK versus runtime

The **runtime** runs apps. It is installed as shared frameworks: `Microsoft.NETCore.App` (the base runtime) and `Microsoft.AspNetCore.App` (ASP.NET Core on top of it). The **SDK** builds apps: the `dotnet` CLI commands, the compiler, MSBuild, NuGet and the project templates. Installing an SDK also installs the matching runtime, so a developer machine needs the SDK and a production server needs only the runtime, or nothing at all when the app is published self-contained.

```bash
dotnet --list-sdks       # e.g. 10.0.100 [/usr/share/dotnet/sdk]
dotnet --list-runtimes   # e.g. Microsoft.AspNetCore.App 10.0.0, Microsoft.NETCore.App 10.0.0
dotnet --info            # both, plus the OS and runtime identifier (RID)
```

The running process can tell you which runtime it got:

```csharp
using System.Runtime.InteropServices;

Console.WriteLine(RuntimeInformation.FrameworkDescription); // ".NET 10.0.x"
Console.WriteLine(RuntimeInformation.RuntimeIdentifier);    // e.g. "linux-x64"
```

SDK and runtime version numbers differ. The SDK uses **feature bands**: 10.0.100 is the first release of the 10.0.1xx band, 10.0.200 starts the next band with newer MSBuild and NuGet. The runtime that ships with them is 10.0.x.

## The dotnet CLI workflow

The `dotnet` driver either runs an app (`dotnet app.dll`) or executes an SDK command. A typical backend solution has an API, a library and a test project:

```bash
dotnet new sln --name Catalog                      # creates Catalog.slnx (.NET 10 default)
dotnet new classlib --output src/Catalog.Core
dotnet new webapi --output src/Catalog.Api         # minimal APIs by default
dotnet new xunit --output tests/Catalog.Tests
dotnet sln add src/Catalog.Core/Catalog.Core.csproj src/Catalog.Api/Catalog.Api.csproj tests/Catalog.Tests/Catalog.Tests.csproj
dotnet reference add src/Catalog.Core/Catalog.Core.csproj --project src/Catalog.Api/Catalog.Api.csproj
dotnet reference add src/Catalog.Core/Catalog.Core.csproj --project tests/Catalog.Tests/Catalog.Tests.csproj
dotnet build                                       # restores packages implicitly, then compiles
dotnet test
dotnet run --project src/Catalog.Api               # Debug build, for development only
```

Since .NET 10 the CLI uses noun-first forms (`dotnet package add`, `dotnet reference add`); the older verb-first forms (`dotnet add reference`) still work and fill older tutorials. `dotnet new list` shows every installed template. `restore` runs implicitly in `build`, `run`, `test` and `publish`, so you rarely type it except in CI.

## Solutions, projects and assemblies

A **project** (`.csproj`) compiles to one assembly. A **solution** (`.slnx`, XML since .NET 10; older repositories use `.sln`) only lists projects so tools can build them together. Project references go one way and cannot form cycles. `bin/` and `obj/` hold build output and restore state; keep them out of Git (`dotnet new gitignore`).

The assembly is also a visibility boundary that the compiler enforces. A Magento module separates code by convention; a .NET project can hide types with `internal`:

```csharp
// src/Catalog.Core/PriceRules.cs
namespace Catalog.Core;

public static class PriceRules
{
    public static decimal Final(decimal net) => TaxTable.Apply(net);
}

internal static class TaxTable // visible inside Catalog.Core only; Catalog.Api cannot reference it
{
    public static decimal Apply(decimal net) => Math.Round(net * 1.21m, 2);
}
```

## Running, building and publishing

`dotnet run` builds and starts the project from source, resolving dependencies from your local NuGet cache; Microsoft explicitly advises against it in production. `dotnet publish` produces the deployable output in `bin/Release/<tfm>/publish/` (Release is the default configuration for `publish`):

- **Framework-dependent** (the default): your assemblies only; the server needs the matching runtime, and the app rolls forward to the newest installed security patch.
- **Self-contained** (`--self-contained true -r linux-x64`): bundles the runtime, so the server needs none, but you ship a new build to get runtime patches.
- **Native AOT** (`-p:PublishAot=true`) and **container images** (`-t:PublishContainer`) build on these; module 11 covers containers.

For scripts, .NET 10 adds **file-based apps**: one `.cs` file, no project, run with `dotnet run file.cs`, with `#:` directives for packages.

```csharp
#:package Spectre.Console@0.57.2
// report.cs: run with `dotnet run report.cs`; the directive above must stay at the top of the file
using Spectre.Console;

AnsiConsole.MarkupLine("[green]Import finished[/]");
```

## In practice

- **CI runs the same CLI.** A typical pipeline is `dotnet restore`, `dotnet build --no-restore -c Release`, `dotnet test --no-build -c Release`, `dotnet publish -c Release`. `build` and `test` default to Debug while `publish` defaults to Release on .NET 8 and later, so pass `-c Release` to all three, or you test one configuration and ship another. Module 11 builds the pipeline.
- **Pin the SDK, not the runtime patch.** Teams pin the SDK version with `global.json` (next lesson) and let framework-dependent apps take runtime patches automatically.
- **Keep the solution small.** One API, one or two libraries and a test project is enough for most services. Splitting every Magento-style module into its own project multiplies build time and references without adding safety.
- **Usual mistakes:** running `dotnet run` in production; committing `bin/` and `obj/`; installing only the runtime on a developer machine and then wondering why `dotnet build` fails; publishing self-contained by default and then never redeploying for runtime security patches.

## Check yourself

1. What does an assembly contain, and when does its code become native machine code?
2. A server has only `Microsoft.AspNetCore.App 10.0.x` installed. Can it run a framework-dependent API built for `net10.0`? Can it run `dotnet build`?
3. Why does a freshly started .NET service often get faster during its first minutes under load?
4. When would you publish self-contained instead of framework-dependent, and what do you give up?
