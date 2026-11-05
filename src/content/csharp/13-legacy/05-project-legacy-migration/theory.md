# Project P7: Migrate One Endpoint Incrementally

In this project you run a legacy app and a new ASP.NET Core 10 app side by side, put YARP in front, and move one endpoint from the old app to the new one while clients keep calling a single host. It is the Strangler Fig from lesson 4 at kata size: small enough to finish in a day, real enough to show where the friction is. Expect about 8 hours.

## Coming from PHP/Magento

In a PHP migration the first break is rarely the routing; it is the contract. A legacy PHP endpoint returns whatever `json_encode` makes of an array: snake_case keys such as `product_id`, `[]` for an empty list and an empty map alike, and, on PDO MySQL before PHP 8.1 with emulated prepares, numbers as strings. Minimal APIs serialize with the `System.Text.Json` web defaults, so the same data comes out as camelCase `productId` with real numbers, and a client written against the old app breaks while every status is still `200`. Compare the bodies you record in step 1 with the new ones, and pin names with `[JsonPropertyName]` where they differ.

The trap is to stop when the happy path works. A migration is done when you can prove which app answered each route, when unknown routes still behave as before, and when the old app is no longer reachable around the proxy.

## Goal

One host, two apps behind it:

- `GET /api/products/{id}` is served by the new ASP.NET Core app.
- Every other route (`/api/orders/{id}`, the home page, unknown paths) is forwarded to the legacy app unchanged.

**Legacy app.** On Windows, create an ASP.NET Web API 2 or MVC 5 app from the Visual Studio template "ASP.NET Web Application (.NET Framework)" with a `ProductsController` and an `OrdersController` (.NET Framework is Windows-only; a Windows VM works). On Linux or macOS, replace it with any HTTP server and practice the routing part only. As a PHP developer, the quickest is PHP's built-in server with a small router script that answers both paths:

```bash
php -S 127.0.0.1:8081 legacy.php
```

## Features

- A legacy app answering `GET /api/products/{id}` and `GET /api/orders/{id}` with JSON, plus 404 for anything else.
- A new `net10.0` web app (`dotnet new web`) with the `Yarp.ReverseProxy` package.
- The migrated endpoint `GET /api/products/{id:int}` in the new app, returning the same JSON shape as the legacy one and a response header `X-Served-By: aspnetcore`.
- A catch-all fallback that forwards everything else to the legacy URL, read from configuration (`LegacyAppUrl` in `appsettings.json`, overridable by an environment variable).
- An xUnit test project that proves both apps answer through the proxy.

## Acceptance criteria

With the legacy app on port 8081 and the proxy on port 5000:

1. `curl -i http://localhost:5000/api/products/1` returns `200`, the legacy JSON shape, and the header `X-Served-By: aspnetcore`. The legacy app's log shows no request for this path.
2. `curl -i http://localhost:5000/api/orders/1` returns `200` with the legacy body and no `X-Served-By` header.
3. `curl -i http://localhost:5000/does-not-exist` returns the legacy app's `404`, not one from ASP.NET Core.
4. `curl -i http://localhost:5000/api/products/abc` is forwarded to the legacy app (the `{id:int}` constraint does not match), and you can explain the status it returns.
5. `dotnet test` passes with at least one test per app: the migrated route returns `200` with the header; a legacy route returns `200`, a body (or marker header) that only the legacy app produces, and no `X-Served-By`.
6. Changing `LegacyAppUrl` through an environment variable, without editing code, points the proxy at another port.

## Suggested steps

1. **Start the legacy app** and record its responses with `curl`, so you know the exact JSON the new endpoint must match.
2. **Create the proxy**: `dotnet new web -n Shop.Gateway`, then `dotnet add package Yarp.ReverseProxy`. The template writes a random port to `Properties/launchSettings.json`, so start the gateway with `dotnet run --urls http://localhost:5000` (or change the port in that file) to match the acceptance criteria.
3. **Forward everything first**, before migrating anything, and repeat the `curl` calls through port 5000. Nothing should change for a client:

```csharp
var builder = WebApplication.CreateBuilder(args);
builder.Services.AddReverseProxy();

var app = builder.Build();
var legacyUrl = app.Configuration["LegacyAppUrl"] ?? "http://127.0.0.1:8081";

app.MapForwarder("/{**catch-all}", legacyUrl)
    .WithOrder(int.MaxValue)
    .ShortCircuit();

app.Run();

public partial class Program;
```

4. **Migrate the endpoint**: add `app.MapGet("/api/products/{id:int}", ...)` that returns the same JSON and sets `X-Served-By`. Run the `curl` checks again.
5. **Write the tests** with `WebApplicationFactory<Program>` (module 09). The factory hosts the proxy in memory, and the forwarder still calls the real legacy app, so start it before `dotnet test`:

```csharp
// ... usings: System.Net, Microsoft.AspNetCore.Mvc.Testing, Xunit (xunit.v3)
public class RoutingTests(WebApplicationFactory<Program> factory) : IClassFixture<WebApplicationFactory<Program>>
{
    [Fact]
    public async Task Products_are_served_by_aspnetcore()
    {
        var response = await factory.CreateClient().GetAsync("/api/products/1", TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.True(response.Headers.Contains("X-Served-By"));
    }

    [Fact]
    public async Task Orders_are_served_by_the_legacy_app()
    {
        var response = await factory.CreateClient().GetAsync("/api/orders/1", TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.False(response.Headers.Contains("X-Served-By"));
        // ... also assert a field or marker header that only the legacy app sends
    }
}
```

Assert the status on the legacy route too. When the legacy app is down, the forwarder does not throw to the test client: it turns the refused connection into a `502 Bad Gateway` response, which also has no `X-Served-By` header. A test that checks only the missing header passes with no legacy app behind it.

6. **Close the side door**: bind the legacy app to `127.0.0.1` only (or a private network) so clients cannot bypass the proxy.

## Stretch goals

- Move the JSON shape into a `netstandard2.0` library that both apps could reference, and explain what would stop the legacy app from using it.
- Add OpenTelemetry tracing to the proxy (module 11) and confirm that a forwarded request shows the outgoing call to the legacy app.
- Replace the hand-written fallback with the YARP configuration file (`ReverseProxy` section with `Routes` and `Clusters`) and compare the two.
- On Windows: add the System.Web adapters, set up remote session with `AddRemoteAppClient`/`AddRemoteAppServer`, and read a session value set by the old app from the new endpoint.

## Where to get help

- Lesson 4 of this module (migration strategies), lesson 2 (reading Web API 2), module 06 (minimal APIs) and module 09 (integration tests with `WebApplicationFactory`).
- Microsoft: [Get started with YARP](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/servers/yarp/getting-started), [Remote app setup](https://learn.microsoft.com/en-us/aspnet/core/migration/fx-to-core/inc/remote-app-setup) and [Get started with incremental migration](https://learn.microsoft.com/en-us/aspnet/core/migration/fx-to-core/start).
- balta.io: Migrando para o .NET 7 e C# 11 for migration strategy concepts (.NET 7 era).

## Check yourself

- What decides that `/api/products/1` reaches the new endpoint and not the catch-all, and why does `/api/products/abc` end up at the legacy app?
- Your test for the legacy route fails only in CI, with `502 Bad Gateway` instead of `200`. What dependency of that test is missing there, how would you provide it, and why would a test without a status assertion have stayed green?
- Which signal tells you the old app can finally be switched off?
