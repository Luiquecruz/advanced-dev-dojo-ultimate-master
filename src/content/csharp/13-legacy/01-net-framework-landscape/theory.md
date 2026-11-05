# The .NET Framework Landscape

After this lesson you can tell which ".NET" a codebase runs on from its project file, explain why .NET Framework 4.8.x has no fixed end date, and read what "legacy .NET" means in a job posting. You will also know which parts of that world still have a road forward and which are dead ends.

## Coming from PHP/Magento

The closest analogy is Magento 1 versus Magento 2. Magento 2 was not an upgrade of Magento 1: it was a new codebase with new concepts (DI, service contracts, declarative schema), and moving a store meant a migration project, not `composer update`. .NET Framework to modern .NET is the same kind of jump. The language (C#) carries over, but the web stack (`System.Web`), the configuration model (`web.config`), the hosting model (IIS only) and several technologies (Web Forms, WCF server) do not.

The trap is the PHP habit of in-place upgrades. Going from PHP 7.4 to 8.3 keeps your framework and your `php.ini`; you fix deprecations and redeploy. Changing a `.csproj` from `net48` to `net10.0` does not work that way: an ASP.NET MVC 5 app does not even compile, because `System.Web` does not exist on modern .NET.

## Three products with one name

| Name | Years | Runs on | State |
| --- | --- | --- | --- |
| .NET Framework 1.0 – 4.8.1 | 2002 – 2022 | Windows only, installed with Windows | maintenance, no new features |
| .NET Core 1.0 – 3.1 | 2016 – 2019 | Windows, Linux, macOS | out of support |
| .NET 5, 6, 7 … 10 | 2020 → | Windows, Linux, macOS | .NET 10 is the current LTS |

".NET 5" dropped the word "Core" to say that this line replaces .NET Framework. When people say "modern .NET" or just ".NET", they mean .NET 5 and later. When a posting says ".NET Framework", "ASP.NET 4.x" or "full framework", it means the Windows-only product.

## Reading the project file

The fastest way to place a codebase is its `.csproj`. A classic .NET Framework project is long, lists every source file and declares the version with `TargetFrameworkVersion`:

```xml
<!-- Classic (non SDK-style) .NET Framework project, excerpt -->
<Project ToolsVersion="15.0" xmlns="http://schemas.microsoft.com/developer/msbuild/2003">
  <PropertyGroup>
    <TargetFrameworkVersion>v4.8</TargetFrameworkVersion>
  </PropertyGroup>
  <ItemGroup>
    <Reference Include="System.Web" />
    <Compile Include="Controllers\ProductsController.cs" />
  </ItemGroup>
</Project>
```

Three tells mark this format, none of which exist in an SDK-style project: `TargetFrameworkVersion` with a `v` prefix instead of a TFM, one `<Compile Include>` line per source file instead of a default glob, and packages listed in a separate `packages.config` file instead of `<PackageReference>` items. The project may even be an SDK-style file that targets `net48`; then the TFM decides, and module 01 lesson 3 ("Versions, Support and Target Frameworks") covers TFMs, default C# versions and multi-targeting.

What matters for legacy work is the bridge. `netstandard2.0` is the last .NET Standard version that .NET Framework implements (it does not support 2.1), so a library that targets it can be referenced from the old `net48` app and the new `net10.0` app at the same time. That is how a migration shares business logic while both apps run.

The C# 7.3 default shows in the code itself. Expect shapes like this one, written before records, nullable reference types and `switch` expressions:

```csharp
// Typical .NET Framework-era model (C# 7.3)
using System;

public class Customer
{
    public string Name { get; set; }
    public string Email { get; set; }

    public string Describe()
    {
        if (Name == null) throw new ArgumentNullException(nameof(Name));
        return Email == null ? Name : Name + " <" + Email + ">";
    }
}
```

Nothing here is wrong, and it compiles on .NET 10 unchanged (with nullable warnings if the project enables them). Do not modernize the syntax of a file you only came to fix; keep the diff to the bug.

## Why there is no end date

.NET Framework 4.5.2 and later are a **component of Windows**: "Components receive the same support as their parent products." 4.8 and 4.8.1 have no end date of their own; they are supported for as long as the Windows version they are installed on. That is why legacy apps survive: a Windows Server 2022 box running an MVC 5 site on 4.8 is a supported configuration. Supported means security fixes, not new features. Everything new (ASP.NET Core, EF Core, minimal APIs, containers on Linux) ships only on modern .NET.

Older versions do end. 4.5.2, 4.6 and 4.6.1 retired on 2022-04-26 because they were signed with SHA-1, and 4.6.2 has its own end date (see the status section). Every 4.x release is an in-place update of 4.0, so an app built for 4.5 or 4.6 usually runs on 4.8 without recompiling.

## What did not make the trip

Microsoft lists the .NET Framework technologies that are not available on .NET 6 and later, with alternatives where one exists:

- **AppDomains**: use separate processes or containers; `AssemblyLoadContext` for loading assemblies.
- **.NET Remoting**: use pipes, HTTP (Kestrel) or StreamJsonRpc.
- **Code access security and security transparency**: use operating-system boundaries (containers, user accounts).
- **System.EnterpriseServices (COM+)**: not supported, with no listed replacement; common in old enterprise code.
- **Workflow Foundation**: not supported; CoreWF is a community port.
- Smaller items: saving `Reflection.Emit` assemblies before .NET 9, multi-module assemblies and XSLT script blocks.

The same page adds a tip that the WCF server runs on modern .NET through the community CoreWCF packages (lesson 3). ASP.NET Web Forms is not on that list because it belongs to ASP.NET, not the runtime: it follows the .NET Framework support policy and has no ASP.NET Core equivalent; Microsoft's path is Blazor ("Blazor for ASP.NET Web Forms Developers", lesson 3).

## In practice

In the 69-posting sample of this track's research, about 3 in 10 postings named .NET Framework-era technology (WCF, Web Forms, ASP.NET 4.8, WinForms, VB.NET) and about 1 in 8 asked for migration or modernization. "Legacy .NET" in a posting can mean three different jobs, and you should ask which one:

1. **Maintain** a .NET Framework 4.x app on Windows Server and IIS: you need to read `System.Web` code (lessons 2 and 3).
2. **Migrate** it to modern .NET: you need lesson 4 and the project.
3. **Upgrade** an out-of-support modern app (.NET Core 3.1, .NET 6): a much smaller job, mostly a TFM change plus breaking changes.

Usual mistakes: assuming "4.8 is supported" means "4.8 is a fine target for new code"; treating .NET Core 3.1 code as legacy Framework code (it already runs on Linux and uses ASP.NET Core); and estimating a Framework-to-.NET migration as a version bump.

## Status as of 2026-11-05

- .NET Framework 4.8 (released 2019-04-18) and 4.8.1 (2022-08-09) follow the lifecycle of their Windows version; 4.8.1 can be installed on Windows 10 20H2 and later, Windows 11, and Windows Server 2022 and 2025, but it is supported only while that Windows version is (20H2 itself has long been out of support).
- .NET Framework 4.6.2 ends on 2027-01-12 (Pacific time); 3.5 SP1, a standalone product since Windows 10 1809 and Server 2019, ends on 2029-01-09.
- .NET 10 is the current LTS (supported until 2028-11-14); .NET 8 and 9 end on 2026-11-10.

## Check yourself

- A `.csproj` says `<TargetFrameworkVersion>v4.7.2</TargetFrameworkVersion>`. What do you know about the app's operating system, its C# version and how it is hosted?
- Why can a team run .NET Framework 4.8 in production today without being out of support, and what does that support not give them?
- Which TFM would you give a business-logic library that must be used by both the old MVC 5 app and the new ASP.NET Core app during a migration, and why not `netstandard2.1`?
