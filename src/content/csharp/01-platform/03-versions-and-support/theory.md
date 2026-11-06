# Versions, Support and Target Frameworks

After this lesson you can pick a target framework for a new or existing service, explain LTS versus STS and what "end of support" costs you, keep the SDK reproducible with `global.json`, and read a job posting that says ".NET 6" or ".NET Core" knowing what changed since then.

You need: 01/02 (SDK, runtime and the `dotnet` CLI).

## LTS and STS

Microsoft ships one major .NET release every November and patches every month, on Patch Tuesday when security fixes are included.

- **Long Term Support (LTS):** even-numbered releases, supported for at least three years, or one year after the next LTS ships if that is later. .NET 10 is the current one.
- **Standard Term Support (STS):** odd-numbered releases, supported for two years (24 months since .NET 9; earlier STS releases had 18).

"Supported" means you receive security and reliability patches. After the end-of-support date there are no more fixes, including for vulnerabilities, so an unsupported runtime is a security finding, not a style issue. Major versions install side by side; a patch replaces the previous patch of the same version, and **framework-dependent apps use the newest installed patch** of their major version automatically. A new major version never applies itself.

You can make a build warn when it uses an out-of-support SDK:

```xml
<PropertyGroup>
  <CheckSdkVulnerabilities>true</CheckSdkVulnerabilities> <!-- warning NETSDK1239 on an end-of-life SDK -->
</PropertyGroup>
```

## Target framework and C# version

In .NET the version belongs to the **project**, not the server: the target framework in the `.csproj` decides the APIs and the C# version, and a server only needs a runtime of the same major version.

The **target framework moniker (TFM)** names the API set: `net10.0`, `net8.0`, `netstandard2.0`, `net48`. The last one is **.NET Framework** 4.8, a different product from modern .NET (5 and later): Windows only, C# 7.3 and in maintenance (module 13). A job posting that says ".NET" can mean either. The compiler picks the default C# version from it: `net10.0` gets C# 14, `net9.0` C# 13, `net8.0` C# 12, and every .NET Framework target C# 7.3. Microsoft states that using a language version newer than the one tied to your TFM is unsupported, so do not set `<LangVersion>latest</LangVersion>` to get new syntax on an old target.

New syntax therefore arrives with a framework upgrade. The C# 14 `field` keyword compiles on `net10.0` and fails on `net8.0`:

```csharp
public class Product
{
    public string Sku
    {
        get;
        // field: the hidden storage (02/03); ?.: skip the call on null (02/02); nameof(value): the text "value"
        set => field = value?.Trim().ToUpperInvariant() ?? throw new ArgumentNullException(nameof(value));
    }
}
```

When a library must serve several targets, multi-target it with `<TargetFrameworks>net10.0;netstandard2.0</TargetFrameworks>` (plural) and branch on the generated symbols:

```csharp
using System; // netstandard2.0 gets no implicit usings

public static class Clock
{
#if NET8_0_OR_GREATER
    public static DateTimeOffset UtcNow() => TimeProvider.System.GetUtcNow();
#else
    public static DateTimeOffset UtcNow() => DateTimeOffset.UtcNow;
#endif
}
```

## Pinning the SDK with global.json

The TFM chooses the runtime; it does not choose the SDK. Without a `global.json`, the `dotnet` CLI uses the highest SDK installed on the machine, so a developer with a .NET 11 preview SDK builds differently from CI. A `global.json` at the repository root fixes the range:

```json
{
  "sdk": {
    "version": "10.0.100",
    "rollForward": "latestFeature"
  }
}
```

This accepts 10.0.100 or any later 10.0 feature band and patch, but never an 11.0 SDK. The `version` field needs a full version number; `10.0` is rejected. When a `version` is set without `rollForward`, the default policy is `patch`, which only accepts patches of the same feature band and fails on a machine that has only a newer band installed. Create one with `dotnet new globaljson --sdk-version 10.0.100 --roll-forward latestFeature`. With NuGet lock files, use `"rollForward": "disable"` instead (01/04).

## What changed since .NET 6 and .NET 8

Postings still name .NET 6 to 9, and existing code was written for them. The changes you will notice first:

- **.NET 6:** templates switched to top-level statements and implicit `using` directives. A `Program.cs` without `class Program` and `static void Main` is normal, not a shortcut.
- **.NET 8:** container images listen on port 8080 and include a non-root `app` user (module 11); `dotnet publish` builds container images without a Dockerfile since SDK 8.0.200; ASP.NET Core gained Native AOT support. C# 12 added primary constructors and collection expressions.
- **.NET 9:** STS support grew to 24 months. C# 13 added `params` collections; .NET 9 added `System.Threading.Lock`, which C# 13's `lock` statement recognizes.
- **.NET 10:** C# 14 (`field`, extension members, null-conditional assignment `a?.B = x`); `dotnet test` supports Microsoft.Testing.Platform; minimal APIs gain built-in validation; OpenAPI documents default to 3.1. The CLI and NuGet changes (`.slnx`, noun-first commands, file-based apps, transitive audit) are in 01/02 and 01/04.

```csharp
// Uses the Product class above. C# 12 collection expression and C# 14 null-conditional assignment on net10.0.
List<string> skus = ["SKU-1", "SKU-2"];
Product? product = skus.Count > 0 ? new Product() : null; // Product?: may be null (02/02)
product?.Sku = skus[0];                                   // assigns only when product is not null
```

## Common mistakes

- **Raising `LangVersion` instead of the TFM.** `<LangVersion>latest</LangVersion>` on `net8.0` makes new syntax compile, but it is unsupported: features that need newer runtime types fail to build or behave differently. Move the project to `net10.0`.
- **Expecting a new major runtime to upgrade the app.** Installing .NET 11 leaves a `net10.0` app on the 10.0 runtime, and it loses support with it. Change the TFM, rebuild and redeploy.
- **Building without `global.json`.** Each machine uses its highest SDK, so a laptop with a preview SDK and CI disagree on warnings and errors. Pin the SDK with a `rollForward` policy.

## In practice

- **New service:** target `net10.0`. Microsoft's guidance is that a service you keep updating should use a supported release, LTS or STS; most teams standardize on LTS and move every two years.
- **Existing service on an older version:** once its end-of-support date passes it gets no security fixes. Check the date on Microsoft's .NET support policy page, then upgrade the TFM to `net10.0`, update Microsoft packages to their 10.0 versions, read the breaking-change list, run the tests. Moving between modern majors is far smaller than a .NET Framework migration.
- **Shared library:** add `netstandard2.0` only if a .NET Framework consumer really exists; otherwise target `net10.0`.
- **Choose the SDK on purpose.** Microsoft notes that the newest SDK, even an STS one, can target every supported runtime. Whichever band the team picks, pin it with `global.json` so laptops and CI agree.

## Check yourself

1. You install the .NET 11 runtime on a server that runs an app built for `net10.0`. Which runtime does the app use, and when does it pick up 10.0 patches?
2. Why can a missing `global.json` make a build pass on one laptop and fail in CI?
3. A teammate sets `<LangVersion>latest</LangVersion>` on a `net8.0` project to use the `field` keyword. What should you propose instead, and why?
4. What concrete risk does an app carry on the day after its .NET version reaches end of support?
