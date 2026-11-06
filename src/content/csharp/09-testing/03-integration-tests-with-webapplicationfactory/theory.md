# Integration Tests with WebApplicationFactory

After this lesson you can boot your real ASP.NET Core app inside a test process with `WebApplicationFactory<Program>`, send HTTP requests through its in-memory server, replace services for a test, simulate authenticated users, and avoid the state leaks that come from sharing one host between tests.

You need: 09/01 (xUnit and class fixtures), 09/02 (fakes), 05/01 (the host and `Program.cs`), 05/02 (service lifetimes), 06/03 (Problem Details) and 08/03 (authorization policies).

## What WebApplicationFactory is

A unit test calls one class. An integration test checks that the pieces work together, here the whole HTTP pipeline. `WebApplicationFactory<TEntryPoint>` (package `Microsoft.AspNetCore.Mvc.Testing`) runs your actual `Program.cs` (routing, middleware, DI, validation, Problem Details, authorization) on `TestServer`, an in-memory server, inside the test process. The `HttpClient` it gives you (the class that sends HTTP requests, lesson 10/05) talks to that server directly: no Kestrel, no port, no separate process to start. After the first test, each test takes milliseconds.

The host is the same long-running host as in production (module 05), and that has a consequence. A factory builds the host once and keeps it for every test that shares the factory, so **singletons live across tests**. If P2's catalog stores products in a singleton list, a test that creates a product changes what the next test sees.

## Reaching `Program`

The test project references the API project and uses the Web SDK (`<Project Sdk="Microsoft.NET.Sdk.Web">`), as the ASP.NET Core docs require. Top-level statements generate a `Program` class that used to be `internal`, so tests needed `public partial class Program { }` at the end of `Program.cs`. In .NET 10 a source generator emits that declaration for you, and an analyzer suggests removing a hand-written one.

```csharp
using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

public sealed class ProductsEndpointTests(WebApplicationFactory<Program> factory)
    : IClassFixture<WebApplicationFactory<Program>>
{
    [Fact]
    public async Task GetProduct_UnknownSku_Returns404ProblemDetails()
    {
        var client = factory.CreateClient();

        var response = await client.GetAsync("/products/NOPE-1", TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
    }

    [Fact]
    public async Task CreateProduct_MissingName_Returns400WithFieldError()
    {
        var client = factory.CreateClient();

        var response = await client.PostAsJsonAsync("/products", new { sku = "SKU-9", price = 10m },
            TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<HttpValidationProblemDetails>(
            TestContext.Current.CancellationToken);
        Assert.Contains(problem!.Errors.Keys, key => key.Equals("name", StringComparison.OrdinalIgnoreCase));
    }
}
```

These tests check what a client sees: status codes, content types and the body contract. They cover the binding, validation and error handling of module 06 in one pass, which no unit test can.

The client from `CreateClient()` follows redirects and handles cookies, and its base address is `http://localhost`. To assert on a redirect itself, create it with `new WebApplicationFactoryClientOptions { AllowAutoRedirect = false }`.

## Customizing the host

Subclass the factory to change the environment and swap services. The `ConfigureServices`/`ConfigureTestServices` callbacks run **after** the registrations in `Program.cs`, so they can replace them:

```csharp
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

public sealed class CatalogApiFactory : WebApplicationFactory<Program>
{
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        builder.ConfigureTestServices(services =>
        {
            services.RemoveAll<IPriceFeed>();
            services.AddSingleton<IPriceFeed, FakePriceFeed>();
        });
    }
}
// ... IPriceFeed and FakePriceFeed omitted
```

- If the environment is not set, the app under test runs as `Development`. Set it explicitly so a developer-only branch in `Program.cs` (detailed errors, seed data) does not decide your results.
- `RemoveAll<T>` matters when the app resolves `IEnumerable<T>`; for a single resolution the last registration already wins, but removing the original makes the intent clear.
- For one test that needs a different setup, `factory.WithWebHostBuilder(b => b.ConfigureTestServices(...))` returns a derived factory without changing the shared one.

## Simulating users

Module 08 protects writes with JWT bearer authentication. Integration tests have two options:

1. Send real tokens, signed with a test key the factory configures. This exercises token validation itself.
2. Replace the scheme with a test handler, the approach the ASP.NET Core docs show, and test authorization rules without minting tokens:

```csharp
using System.Security.Claims;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

public sealed class TestAuthHandler(
    IOptionsMonitor<AuthenticationSchemeOptions> options, ILoggerFactory logger, UrlEncoder encoder)
    : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
{
    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        if (!Request.Headers.TryGetValue("X-Test-Role", out var role))
            return Task.FromResult(AuthenticateResult.NoResult());

        var identity = new ClaimsIdentity(
            [new Claim(ClaimTypes.Name, "test-user"), new Claim(ClaimTypes.Role, role.ToString())], "Test");
        var ticket = new AuthenticationTicket(new ClaimsPrincipal(identity), "Test");
        return Task.FromResult(AuthenticateResult.Success(ticket));
    }
}
```

Register it in `ConfigureTestServices` with `AddAuthentication("Test").AddScheme<AuthenticationSchemeOptions, TestAuthHandler>("Test", _ => { })` and make it the default scheme. A request without the header is anonymous (expect 401 on a protected endpoint); `X-Test-Role: customer` should get 403 from an admin policy; `X-Test-Role: admin` should pass. The scheme name must match what your endpoints expect, or authentication silently does nothing.

## Common mistakes

- **State in a singleton the tests share.** One host serves the whole class, so a product created by one test is still there in the next, and a test that passes alone fails in the full run. Create unique data per test and assert on it, not on totals.
- **Forgetting that `CreateClient()` follows redirects.** A 302 to a login page arrives as that page's 200. Create the client with `AllowAutoRedirect = false`.
- **A new factory per test.** Each test rebuilds the host and pays the startup time again. Share one through `IClassFixture`.
- **Asserting on full JSON strings.** A new field or another property order breaks the test. Deserialize and check the fields that matter.

## In practice

- Test the HTTP contract: one test per status code that matters (200, 201 with `Location`, 400 with field errors, 401, 403, 404, 409), not every branch of the business logic. Unit tests cover the branches.
- Share a factory per class with `IClassFixture`, and keep tests independent of order: create the data each test needs, with unique SKUs.
- Replace only what crosses the process boundary (payment gateways, email, external HTTP APIs). Keep your own services real, or the test proves little.
- The database is the hard part. Swapping it for the EF Core in-memory provider is what the next lesson replaces with a real database in a container.

## Status as of 2026-11-05

- The `Program` source generator and its analyzer shipped with ASP.NET Core 10.
- .NET 11 previews add a `ConfigureWebApplicationBuilder` override to `WebApplicationFactory`, so configuration added by a test is visible as soon as `WebApplication.CreateBuilder` returns.

## Check yourself

- Why can a test that passes alone fail when it runs after another test in the same class?
- What does `WebApplicationFactory` test that a unit test of the endpoint handler does not?
- When would you send real JWTs instead of using a test authentication handler?
