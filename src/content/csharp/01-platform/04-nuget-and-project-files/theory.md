# NuGet and Project Files

After this lesson you can read an SDK-style `.csproj`, add and update packages with the CLI, predict which version NuGet resolves, centralize versions for a whole repository, make restores reproducible, and check a package for known vulnerabilities and for its licence before the team depends on it.

You need: 01/02 (projects and the `dotnet` CLI) and 01/03 (target frameworks and `global.json`).

## Where packages come from

A **NuGet package** is a zip file with compiled assemblies and a description of its own dependencies. Projects declare the packages they need as `<PackageReference>` items. Restore downloads them from the **package sources** listed in `nuget.config` (nuget.org by default, plus any private feed) into the **global packages folder**, `~/.nuget/packages`, which every project on the machine shares and which is never committed.

`Version="3.6.0"` does not mean "exactly 3.6.0" or "the newest 3.x". It means "3.6.0 or higher, preferring the **lowest** available", so restore does not drift to a new release by itself. NuGet writes no lock file unless you opt in (see "Reproducible restores").

## Anatomy of an SDK-style project

This is roughly what `dotnet new webapi` generates on .NET 10, plus a reference to a library project:

```xml
<Project Sdk="Microsoft.NET.Sdk.Web">

  <PropertyGroup>
    <TargetFramework>net10.0</TargetFramework>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
  </PropertyGroup>

  <ItemGroup>
    <PackageReference Include="Microsoft.AspNetCore.OpenApi" Version="10.0.0" />
    <ProjectReference Include="..\Catalog.Core\Catalog.Core.csproj" />
  </ItemGroup>

</Project>
```

- **`Sdk`** brings in the build logic. `Microsoft.NET.Sdk` is for libraries and console apps; `Microsoft.NET.Sdk.Web` adds ASP.NET Core and its shared framework; `Microsoft.NET.Sdk.Worker` is for background services.
- **`PropertyGroup`** holds settings: the TFM, nullable reference types (module 02), implicit `using` directives.
- **`ItemGroup`** holds items: package references and project references.
- **There is no file list.** Every `.cs` file under the project folder is compiled. Adding a class means creating a file, nothing else.

`ImplicitUsings` is why a fresh `Program.cs` can use `List<T>`, LINQ and `File` without any `using` line:

```csharp
// No using directives: System, System.IO, System.Linq, System.Collections.Generic and others are implicit
var lines = File.ReadLines("products.csv").Skip(1).ToList();
Console.WriteLine($"{lines.Count} products");
```

## Adding packages and resolving versions

```bash
dotnet package add Spectre.Console --version 0.57.2   # writes the PackageReference, then restores
dotnet package list --outdated                         # newer versions available
dotnet package list --include-transitive               # what your packages pulled in
dotnet nuget why Catalog.Api.csproj System.Text.Json   # which reference brought in a package
```

Without `--version`, `dotnet package add` writes the latest compatible version. Restore then computes the full graph, including **transitive** packages your packages depend on, and writes it to `obj/project.assets.json`. When two packages ask for different versions of the same dependency, NuGet picks the lowest version that satisfies every range; when your project references that dependency directly, your version wins (and NuGet warns with NU1605 if that is a downgrade).

Using the package is an ordinary `using` directive:

```csharp
using Spectre.Console;

AnsiConsole.MarkupLine("[yellow]3 rows skipped[/]");
```

On .NET 10, NuGet also **prunes** packages that the shared framework already provides. If you reference such a package directly, restore warns with NU1510 and asks you to remove it.

## Central package management

In a solution with ten projects, ten copies of `Version="..."` drift apart. **Central package management** moves every version into one `Directory.Packages.props` at the repository root (`dotnet new packagesprops` creates it):

```xml
<Project>
  <PropertyGroup>
    <ManagePackageVersionsCentrally>true</ManagePackageVersionsCentrally>
    <CentralPackageTransitivePinningEnabled>true</CentralPackageTransitivePinningEnabled>
  </PropertyGroup>
  <ItemGroup>
    <PackageVersion Include="Microsoft.AspNetCore.OpenApi" Version="10.0.0" />
    <PackageVersion Include="Spectre.Console" Version="0.57.2" />
  </ItemGroup>
</Project>
```

Projects then reference packages without a version: `<PackageReference Include="Spectre.Console" />`. A single project can deviate with `VersionOverride`, which you should treat as a smell to review. Transitive pinning lets the central file raise the version of a transitive package, for example to pull in a security fix, without adding a direct reference; it cannot downgrade (error NU1109). With CPM on, NuGet warns (NU1507) when more than one package source is configured, because a package with the same id could come from the wrong feed; map sources with package source mapping or keep a single source.

Settings shared by every project, such as `<Nullable>enable</Nullable>` or `<TreatWarningsAsErrors>true</TreatWarningsAsErrors>`, go in a `Directory.Build.props` next to it.

## Reproducible restores

To make CI restore exactly the graph you tested, opt into the lock file and restore in locked mode:

```xml
<PropertyGroup>
  <RestorePackagesWithLockFile>true</RestorePackagesWithLockFile>
</PropertyGroup>
```

```bash
dotnet restore --locked-mode   # fails if the project changed but packages.lock.json was not updated
```

With lock files, pin the SDK exactly (`"rollForward": "disable"` in `global.json`, lesson 01/03): a different SDK can change the versions of implicit package references and make `--locked-mode` fail.

Commit `packages.lock.json` for applications. Microsoft advises not committing it for libraries other projects consume, because the consuming app decides the final graph anyway.

## Vulnerabilities and licences

**NuGet Audit** runs during every restore and checks your graph against the GitHub Advisory Database through nuget.org. It reports warnings NU1901 (low) to NU1904 (critical). For projects targeting `net10.0`, `NuGetAuditMode` defaults to `all`, so transitive packages are audited too; older targets default to `direct`. A common setup keeps local builds green but fails the pipeline on serious findings:

```xml
<PropertyGroup>
  <WarningsAsErrors>$(WarningsAsErrors);NU1903;NU1904</WarningsAsErrors>
</PropertyGroup>
```

`dotnet package list --vulnerable --include-transitive` lists the findings, `dotnet package list --deprecated` lists packages their owners deprecated (for example `System.Data.SqlClient`, deprecated in favor of `Microsoft.Data.SqlClient`), and `dotnet package update --vulnerable` moves to the first fixed versions.

**Licences** are not checked by any tool by default. Every package page on nuget.org shows the licence, which authors declare as an SPDX expression (`MIT`, `Apache-2.0`) or as a licence file. Read it before adding a package. Several popular .NET libraries changed licence recently; the Status section lists them. None is forbidden: name the licence, look at the alternative (often first-party APIs or plain C#), and let the team decide.

## Common mistakes

- **Reading `Version="1.0.0"` as an exact pin.** It is a minimum: when 1.0.0 is missing from the feed, restore takes the next higher version with only warning NU1603, and the app runs a version nobody tested. Write `[1.0.0]` for an exact version.
- **Silencing NU190x with `NoWarn`.** The build turns green and the vulnerable package ships. Upgrade the parent package, or raise the transitive version in `Directory.Packages.props`.
- **Floating versions in an application.** `3.6.*` restores a different graph on different days, so a build that passed yesterday fails today. Use fixed versions and a lock file.
- **Discovering a licence change after the upgrade.** The new major is already in production under terms nobody accepted. Read the licence on nuget.org before each major upgrade.

## In practice

- Start with first-party packages (`Microsoft.*`, `System.*`) and the shared framework, which already covers JSON, logging and much more; add a package only for what the platform does not do.
- Turn on CPM as soon as a repository has more than one project, and put `Directory.Packages.props` and `Directory.Build.props` under code review like code.
- Keep one package source, or map sources explicitly; never let a public feed and a private feed serve the same ids.
- Update Microsoft packages together with the runtime: `Microsoft.AspNetCore.*` and `Microsoft.EntityFrameworkCore.*` 10.0.x belong with `net10.0`.

## Status as of 2026-11-05

- MediatR 13.0 and AutoMapper 15.0 ship under RPL-1.5 plus a commercial licence (announced 2025-07-02; later majors assumed to follow, not verified). MassTransit v9 is a commercial product; v8 and earlier stay open source. Fluent Assertions 8.x requires a paid licence for commercial use (announced 2025-01-13; that the line starts at 8.0 is inferred).
- `System.Data.SqlClient` is deprecated; use `Microsoft.Data.SqlClient`.
- Spectre.Console 0.57.2 (MIT) is the latest stable version used in the examples.

## Check yourself

1. A project says `Version="2.0.0"` and nuget.org has 2.0.0, 2.1.0 and 3.0.0. Which version does restore pick, and how would you pin exactly 2.0.0?
2. Why does central package management warn when you configure two package sources?
3. When should `packages.lock.json` be committed, and what does `--locked-mode` add in CI?
4. A transitive package has a critical advisory, and its parent package has no fix yet. Which two options from this lesson let you act now?
