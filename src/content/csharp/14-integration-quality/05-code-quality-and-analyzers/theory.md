# Code Quality and Analyzers

After this lesson you can make a .NET solution enforce its own rules. You will configure the analyzers that ship with the SDK through `AnalysisLevel` and `.editorconfig`, turn warnings into build failures without drowning the team, and run `dotnet format` in CI so style is checked by a machine instead of in code review.

## Coming from PHP/Magento

A Magento project typically runs PHP_CodeSniffer with the Magento coding standard, PHPStan at some level and maybe PHP CS Fixer, each installed through Composer, configured in its own file and wired into a pre-commit hook or a pipeline step. They run outside the language: the PHP interpreter never sees their findings.

In .NET the equivalent tools are part of the compiler. Roslyn analyzers run inside every `dotnet build`, in the IDE and in CI, and they report through the same channel as compiler warnings, with IDs such as `CS8602` (compiler), `CA2017` (code quality) and `IDE0040` (code style). Configuration lives in the project file, a `Directory.Build.props` for the whole solution, and `.editorconfig`. The trap is to treat warnings as noise because PHP tooling is optional: a .NET team that ignores warnings ships null dereferences and broken log templates that the compiler already pointed out.

## What is on by default

- **Code quality rules (`CA`)** ship with the .NET SDK and are enabled for every project targeting .NET 5 or later. In the default mode only a small set are build warnings.
- **Code style rules (`IDE`)** run in the IDE, but not on build, until you set `EnforceCodeStyleInBuild`.
- **Nullable reference types** (`<Nullable>enable</Nullable>`, on in every new template) produce `CS86xx` warnings.

```csharp
public sealed class OrderService(ILogger<OrderService> logger)
{
    public void Log(Order? order)
    {
        // CS8602: dereference of a possibly null reference.
        logger.LogInformation("Order {OrderId} for {Sku}", order.Id);
        // CA2017 (a warning by default): the template has 2 placeholders but 1 argument is passed.
    }
}

public sealed record Order(int Id, string Sku);
```

Both lines compile and both are bugs: one crashes at runtime, the other writes a broken structured log (module 05 lesson 04).

## Choosing the rule set: `AnalysisLevel` and `AnalysisMode`

Put shared settings in `Directory.Build.props` at the repository root so every project picks them up:

```xml
<Project>
  <PropertyGroup>
    <Nullable>enable</Nullable>
    <AnalysisLevel>latest-recommended</AnalysisLevel>
    <EnforceCodeStyleInBuild>true</EnforceCodeStyleInBuild>
    <TreatWarningsAsErrors>true</TreatWarningsAsErrors>
  </PropertyGroup>
</Project>
```

- `AnalysisLevel` picks the rule version. The default, `latest`, means a new SDK can switch on new rules; pin a number such as `10` if you want SDK upgrades to keep the same set.
- The mode (`<AnalysisMode>` or the `-<mode>` suffix) picks how many rules are warnings: `None`, `Default`, `Minimum`, `Recommended` or `All`. `latest-recommended` is a sensible start for a new service; `All` on an existing code base produces hundreds of warnings at once.

## Severities in `.editorconfig`

```bash
root = true

[*.cs]
dotnet_diagnostic.CA2016.severity = warning   # forward the CancellationToken (a suggestion by default)
dotnet_diagnostic.CA1848.severity = none      # LoggerMessage delegates: not required in this codebase
dotnet_style_require_accessibility_modifiers = always:warning
csharp_style_namespace_declarations = file_scoped:warning
```

`dotnet_diagnostic.<ID>.severity` sets `error`, `warning`, `suggestion`, `silent` or `none` for one rule; since .NET 9 the `option = value:severity` form is respected on build too. A `.globalconfig` file applies options to every project below it without file-glob sections. Disable a rule for the code base in configuration, with a reason, rather than scattering `#pragma warning disable` through files.

## Warnings as errors, gradually

`TreatWarningsAsErrors` fails the C# compile on any warning. Two variations help adoption:

- `<WarningsAsErrors>nullable</WarningsAsErrors>` makes only the nullable warnings errors (`nullable` is the documented shorthand for the whole set), while other warnings stay warnings.
- `<CodeAnalysisTreatWarningsAsErrors>false</CodeAnalysisTreatWarningsAsErrors>` keeps `CA` warnings as warnings when the build uses `-warnaserror`.

On an existing code base, fix or explicitly suppress the current warnings first, then turn the switch on, so the build is green on day one and every new warning is a failure.

## `dotnet format` in CI

```bash
dotnet format --verify-no-changes --verbosity diagnostic
```

`dotnet format` applies `.editorconfig` whitespace, style and analyzer fixes (`dotnet format whitespace`, `style` and `analyzers` run each part alone). With `--verify-no-changes` it changes nothing and exits non-zero if any file would change, which is exactly a CI check. Developers run plain `dotnet format` before committing. Microsoft warns that it may restore, compile and run analyzers, so run it only on trusted code, which matters for pull requests from forks.

A pipeline step from module 11 lesson 02 becomes:

```bash
dotnet restore
dotnet format --verify-no-changes --no-restore
dotnet build --no-restore -c Release   # analyzers run here; warnings fail the build
dotnet test --no-build -c Release
```

## In practice

- Start strict on new services; on legacy code, ratchet: pin `AnalysisLevel`, enable one category at a time, and keep the build green.
- Third-party analyzer packages (StyleCop.Analyzers, SonarAnalyzer.CSharp and others) plug into the same mechanism; check their licence and keep their severities in the same `.editorconfig`.
- Review analyzer changes like code: a suppressed rule needs a reason in the commit.
- Try it locally: run `dotnet format --verify-no-changes` on one of your repositories, then raise one rule to `error` in `.editorconfig` and build.
- Common mistakes: `AnalysisMode` `All` switched on in one go, warnings left at hundreds so nobody reads them, `#pragma` suppressions without comments, and style enforced only by reviewers.

## Status as of 2026-11-05

- The code analysis overview (dated 2025-11-05) and the `dotnet format` page (dated 2026-09-15) describe the behavior above for the .NET 10 SDK. `CA2016` is listed as "enabled by default in .NET 10: as suggestion".

## Check yourself

1. Why might a project with `AnalysisLevel` left at `latest` start failing its build after an SDK upgrade, and how do you prevent it?
2. What is the difference between `TreatWarningsAsErrors` and `<WarningsAsErrors>nullable</WarningsAsErrors>`?
3. Why does the CI step use `--verify-no-changes`, and what does a developer run locally instead?
