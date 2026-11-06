# Migration Strategies

After this lesson you can plan the move of an ASP.NET Framework app to ASP.NET Core on .NET 10: choose between an in-place and an incremental migration, set up a Strangler Fig proxy with YARP, order the library upgrades, use the System.Web adapters for shared code, and pick the tooling Microsoft supports today.

You need: 05/03 (configuration), 05/05 (middleware), 06/01 (routing endpoints), 08/01 (authentication) and 13/01 to 13/03.

## Big bang or strangler

A **big-bang** migration builds the new app next to the old one and switches all traffic on one launch night. The alternative puts a proxy in front of the old app and sends one route at a time to the new code, while everything else still reaches the old app. That is the **Strangler Fig** pattern, and in .NET the proxy is YARP, running inside the new ASP.NET Core app.

The proxy is not the whole job. Routing is the easy part. The hard parts are what the two apps must share while both run: the logged-in user, the session, configuration and the libraries both call. Microsoft's guide spends most of its pages on those.

## In place or incremental

Microsoft's decision guide is short:

| Signal | Choose |
| --- | --- |
| Must stay in production during the move | incremental |
| Large app, heavy `System.Web` use, unknown dependencies | incremental |
| Small app with few dependencies, can afford a cutover | in place |

"Incremental migration is an implementation of the Strangler Fig pattern", and Microsoft calls it the preferred approach for most production apps. In place means converting the projects and shipping the new app in one go; it is quicker for a small app, but "small issues can compound".

## The Strangler Fig with YARP

You create a new ASP.NET Core app in front of the old one. It serves the routes you have migrated and forwards everything else to the .NET Framework app:

```csharp
// .NET 10, packages Yarp.ReverseProxy and Microsoft.AspNetCore.SystemWebAdapters.CoreServices
using Microsoft.AspNetCore.SystemWebAdapters;
using Microsoft.Extensions.Options;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddSystemWebAdapters()
    .AddRemoteAppClient(options =>
    {
        options.RemoteAppUrl = new(builder.Configuration["RemoteAppUri"]!);
        options.ApiKey = builder.Configuration["RemoteAppApiKey"]!;
    });
builder.Services.AddReverseProxy();

var app = builder.Build();

// Migrated endpoint: served by ASP.NET Core.
app.MapGet("/api/products/{id:int}", (int id) => Results.Ok(new { id, source = "aspnetcore" }));

// Everything else: forwarded to the ASP.NET Framework app, matched last.
app.MapForwarder("/{**catch-all}",
        app.Services.GetRequiredService<IOptions<RemoteAppClientOptions>>().Value.RemoteAppUrl.OriginalString)
    .WithOrder(int.MaxValue)
    .ShortCircuit();

app.Run();
```

Local routes win because the fallback has the lowest priority, and `ShortCircuit()` skips the rest of the middleware for forwarded requests. `RemoteAppApiKey` is a shared GUID; the Framework app reads the same key from `web.config` and registers the server side in `Application_Start` with `HttpApplicationHost.RegisterHost(...)` and `AddRemoteAppServer`. Keep the Framework app reachable only through the proxy, over HTTPS, and give both apps the same virtual directory layout: Microsoft says different layouts are not reliably supported.

Each release, you move a route or a group of routes: write the endpoint in the new app, test it, deploy. The fallback shrinks until it serves nothing and the old app is switched off.

## Prepare, then share

Microsoft's incremental steps, in order:

1. **Set up the ASP.NET Core proxy app** (above).
2. **Remediate technical debt** in the old solution: update packages one at a time, move from `packages.config` to `PackageReference`, convert projects to SDK-style, fix compiler warnings and remove dead code.
3. **Address cross-cutting concerns** that both apps share. The System.Web adapters offer **remote session** (the new app reads session through the old one) and **remote authentication** (the new app defers sign-in to the old one), so a user does not log in twice.
4. **Upgrade supporting libraries**, only those the next routes need, in "postorder depth-first search ordering": leaves first, the main web app last.

A library goes to `netstandard2.0` if possible, or multi-targets .NET Framework and .NET 10. If it uses `System.Web.HttpContext`, the adapters let it compile for both: remove the `System.Web` reference, add `Microsoft.AspNetCore.SystemWebAdapters` and multi-target.

```xml
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFrameworks>net48;net10.0</TargetFrameworks>
  </PropertyGroup>
  <ItemGroup>
    <!-- System.Web reference removed; version set in Directory.Packages.props -->
    <PackageReference Include="Microsoft.AspNetCore.SystemWebAdapters" />
  </ItemGroup>
</Project>
```

The library keeps calling `context.Request.Headers["X-Store"]` on a `System.Web.HttpContext`. On ASP.NET Core, that object comes from the real request through an implicit conversion or `HttpContext.AsSystemWeb()`. That buys time; it does not remove the coupling. Plan to replace it with plain parameters later.

HTTP modules and `Global.asax` events become middleware. When a module cannot be rewritten yet, the adapters can host it: `AddSystemWebAdapters().AddHttpApplication<Global>()` runs the old `HttpApplication` events inside ASP.NET Core.

## Tooling: what is current

- **GitHub Copilot app modernization** is Microsoft's recommended tool. It assesses the solution, writes an upgrade plan, automates steps such as project file updates and API replacements, and commits each change so you can review or roll back. It ships with Visual Studio 2026 and Visual Studio 2022 17.14.16 or later.
- **.NET Upgrade Assistant is officially deprecated.** Microsoft's notice reads: "Use the GitHub Copilot modernization chat agent instead." Keeping it for a team without access to the agent is a team judgment, not Microsoft guidance.
- **ASP.NET Core 2.3 on .NET Framework**, once a stepping stone, is "no longer recommended as a migration strategy" and reaches end of support on 2027-04-13.
- **Aspire** has an incremental migration integration (`Aspire.Hosting.IncrementalMigration`) that wires the fallback, remote session and remote authentication for local development. It is a prerelease package.

No tool migrates a real app unattended. Review every generated change as you would review a junior colleague's pull request.

## Common mistakes

- **A big-bang rewrite of a large app.** Months pass with no route in production, the old app keeps changing, and launch night finds every difference at once. Migrate route by route behind the proxy.
- **Upgrading libraries top-down.** Retargeting `Web` first fails because `Orders`, `Pricing` and `Common` still target only .NET Framework. Upgrade leaves first.
- **Leaving the old app public next to the proxy.** Users and bots keep calling it directly, bypassing every migrated route. Expose only the proxy.
- **Treating tool output as finished.** Generated changes compile, but behavior is not verified. Test every migrated route.

## In practice

- Start with routes that are read-only, have no session and are called often: they prove the proxy and give early value. Leave checkout-like flows with heavy session use for later.
- Write a test for each migrated route that hits the proxy and asserts the new app answered, plus one for a route that must still reach the old app.
- Keep logs and correlation IDs consistent across both apps, or you will not be able to debug a request that crosses them.
- Remove the fallback and the adapters at the end. A "temporary" proxy that stays for years is a second legacy system.

## Status as of 2026-11-05

- The YARP getting-started page targets `Yarp.ReverseProxy` 2.3.0 or later, which supports .NET 8 or later.
- ASP.NET Core 2.3 on .NET Framework: end of support announced on 2026-04-07 for 2027-04-13.
- `Aspire.Hosting.IncrementalMigration` is published as a prerelease package.

## Check yourself

- Your app uses `Session["Cart"]` on most pages. Which migration concern does that raise, and which adapter feature addresses it?
- Why must libraries be upgraded leaves first? What breaks if you start with the web project?
- What would make you choose an in-place migration instead of a Strangler Fig?
