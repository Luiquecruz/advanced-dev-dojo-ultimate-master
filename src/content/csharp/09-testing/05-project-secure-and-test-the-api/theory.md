# Project P4: Secure and Test the Catalog API

In this project you take the catalog API from P2 and P3, protect its writes with JWT bearer authentication, an `admin` policy and rate limiting, and prove the whole thing with three kinds of automated tests: unit tests, in-memory HTTP tests with `WebApplicationFactory`, and database tests against PostgreSQL or SQL Server in Testcontainers. You build it locally with the .NET 10 SDK and Docker; the app records only the quiz.

## Coming from PHP/Magento

In Magento, the closest work is protecting a custom REST route with an ACL resource in `webapi.xml` and covering it with `dev/tests/unit` plus an API-functional test against an installed shop. The split you know transfers: fast unit tests for rules, slower tests that go through HTTP and the database.

What changes is the cost of the slow tests. There is no shop to install: the API boots in memory, and the database is a container started by the test run. That makes it realistic to run every kind of test on every `dotnet test`, which is the point of this project. The trap to avoid is the "fast" fake database; this project explicitly forbids the EF Core in-memory provider.

## Goal

A catalog API where reads are public, writes need an `admin` role, abusive clients are throttled, and a single `dotnet test` gives a green answer you trust because it runs the real pipeline and the real database engine.

## Features

- **Solution layout** (the one change of structure from P3): one solution at the root with `src/Catalog.Core` (a new class library), `src/Catalog.Api` (P2–P3), `src/CatalogImporter` (P1), `tests/Catalog.UnitTests` and `tests/Catalog.IntegrationTests`. P1's `TryParseRow` moves out of `Program.cs` into a public static `CatalogCsvParser` class in `Catalog.Core`, with its `Product` and `InvalidRow` records in a `Catalog.Core.Import` namespace so they do not clash with the API's `Product` entity. The importer and the unit tests reference `Catalog.Core`; the importer's output does not change. API endpoints and status codes stay as in P3; only 401, 403 and 429 are new.
- **Authentication**: `AddAuthentication().AddJwtBearer()`, configured from `appsettings` (module 08). Local tokens come from `dotnet user-jwts`.
- **Authorization**: a named `admin` policy requiring the `admin` role, applied to every `POST`, `PUT` and `DELETE`. `GET` endpoints stay anonymous.
- **Rate limiting**: a named fixed-window policy on writes (for example 10 requests per minute per user), with `RejectionStatusCode` set explicitly to 429. `AddFixedWindowLimiter("writes", ...)` keeps one counter shared by every caller; a per-user limit needs `options.AddPolicy("writes", ctx => RateLimitPartition.GetFixedWindowLimiter(ctx.User.Identity?.Name ?? "anonymous", ...))`, as in 08/05.
- **Unit tests** (`Catalog.UnitTests`): `CatalogCsvParser` as theories (valid rows, bad prices, missing columns, line numbers in errors), and any pricing or validation rule you move into `Catalog.Core`, with hand-written fakes and `FakeTimeProvider` where time matters. The stock rule stays in SQL (P3's conditional update), so a database test covers it.
- **HTTP tests** (`Catalog.IntegrationTests`): a `WebApplicationFactory<Program>` subclass covering status codes and Problem Details, with a test authentication handler or real test-signed tokens for 401, 403 and the admin path.
- **Database tests**: a Testcontainers PostgreSQL (or SQL Server) container, the real migrations applied with `MigrateAsync`, the Dapper report query, the optimistic concurrency conflict and the reservation that must not take stock below zero, all from P3.

## Acceptance criteria

1. From the solution root, `dotnet user-jwts create --project src/Catalog.Api` and `dotnet user-jwts create --project src/Catalog.Api --role admin` each print a token (without `--project`, the tool looks for a project in the current directory). With the API running:
   - `POST /products` with no `Authorization` header returns **401**.
   - The same request with the token created without `--role admin` returns **403**.
   - The same request with the admin token and a valid body returns **201** with a `Location` header.
   - `GET /products?page=1` with no token returns **200**.
2. Sending more write requests than the policy allows within one window returns **429**.
3. `dotnet test` at the solution root runs the unit, HTTP and database tests and they all pass, with Docker running and no database installed on the machine.
4. Nothing uses the EF Core in-memory provider: a search of the solution for `UseInMemoryDatabase` and `Microsoft.EntityFrameworkCore.InMemory` finds nothing.
5. A database test proves that two updates carrying the same row version end with the second one rejected (409 through the API, or `DbUpdateConcurrencyException` at the `DbContext` level).
6. Running `dotnet test` twice in a row gives the same result: no test depends on data left behind by another test or by an earlier run.

## Suggested steps

1. Add the `Microsoft.AspNetCore.Authentication.JwtBearer` package, register authentication and the `admin` policy, and call `RequireAuthorization("admin")` on a route group holding the write endpoints.
2. Run `dotnet user-jwts create --project src/Catalog.Api --role admin` and check criterion 1 by hand with `curl -i -H "Authorization: Bearer <token>"`.
3. Add `AddRateLimiter` with a named fixed-window policy partitioned by user, `UseRateLimiter()` after authentication and routing, and `RequireRateLimiting` on the write group.
4. Create the solution and `Catalog.Core` with `dotnet new classlib` (as in 01/02), move the parser into it, add the three existing projects with `dotnet sln add`, and check that `dotnet run -- products.csv` in the importer prints the same report as before. Then create `Catalog.UnitTests` from the `xunit3` template, reference `Catalog.Core`, and write the parser theories first: they are the quickest feedback.
5. Create `Catalog.IntegrationTests` with the Web SDK and `Microsoft.AspNetCore.Mvc.Testing`. Write the 401/403/201 tests with a test authentication handler registered in `ConfigureTestServices`.
6. Add `Testcontainers.PostgreSql` (or `Testcontainers.MsSql`), start the container in the factory's `InitializeAsync`, replace the `DbContext` registration and apply migrations.
7. Write the concurrency and report tests. Use a rolled-back transaction for tests that write through the `DbContext`, and unique SKUs plus cleanup for tests that write through HTTP.
8. Run `dotnet test` twice, then once more with the database container of P3 stopped, to prove the tests bring their own.

## Stretch goals

- Replace the test authentication handler with real JWTs signed by a test key, so token validation (issuer, audience, expiry) is tested too.
- Share one container across test classes with an xUnit v3 assembly fixture, and measure the suite time before and after.
- Switch `dotnet test` to Microsoft.Testing.Platform in `global.json` and compare the output.
- Add a test that rate limiting partitions by user: one user's burst must not throttle another user.

## Where to get help

- Lessons: 08/02 JWT bearer, 08/03 authorization policies, 08/05 API hardening (rate limiting), and 09/01 to 09/04 of this module.
- Microsoft Learn: "Generate tokens with dotnet user-jwts", "Integration tests in ASP.NET Core", "Rate limiting middleware in ASP.NET Core" and the EF Core testing pages.

## Check yourself

- Which of your tests would still pass if the authorization policy were removed from the write endpoints, and what does that say about them?
- Why does the project ban the EF Core in-memory provider even for the "quick" tests?
- If the database tests take most of the suite time, what would you move, share or delete first?
