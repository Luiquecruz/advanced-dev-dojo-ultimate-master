# Docker for .NET

After this lesson you can package an ASP.NET Core API as a container image in two ways: a multi-stage `Dockerfile`, and `dotnet publish /t:PublishContainer` with no Dockerfile at all. You will pick a base image (full, chiseled or Alpine), know why the container listens on port 8080 as a non-root user, and run the API next to PostgreSQL with `docker compose`.

You need: 01/02 (the `dotnet` CLI and `dotnet publish`), 05/01 (the host and Kestrel), 05/03 (configuration sources) and 07/01 (a database connection string). The solution used in the examples is the one P5 (10/06) left you.

## What goes into an image

An ASP.NET Core app is a **compiled, self-hosting process**. Kestrel, the web server, lives inside your process, so the image needs no separate web server. `dotnet publish` turns the source into DLLs; the image holds that published output and the .NET runtime, never your `.cs` files. Building needs the SDK; running needs only the runtime. Images, layers, registries, `docker compose` and environment variables work as they do for any other containerized app.

## The official images

Microsoft publishes four Linux images on `mcr.microsoft.com/dotnet/`:

| Image | Contains | Use for |
| --- | --- | --- |
| `sdk` | SDK, CLI, compilers | the build stage only |
| `aspnet` | ASP.NET Core + .NET runtime | web APIs |
| `runtime` | .NET runtime | console apps, workers |
| `runtime-deps` | OS libraries only | self-contained or Native AOT apps |

The tag `10.0` now means **Ubuntu 24.04 "Noble"**. In .NET 9 and earlier, default tags were Debian, and Microsoft does not ship Debian images for .NET 10. Variants are selected by tag: `10.0-alpine`, and `10.0-noble-chiseled`. Chiseled images are distroless: only the packages .NET needs, a non-root user by default, **no shell and no package manager**. That shrinks the attack surface, and it also means you cannot `docker exec` into a shell or `RUN apt-get` on top of them.

## A multi-stage Dockerfile

```dockerfile
# src/Catalog.Api/Dockerfile, built with the solution root as context
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY src/Catalog.Api/Catalog.Api.csproj src/Catalog.Api/
COPY src/Catalog.Core/Catalog.Core.csproj src/Catalog.Core/
COPY src/Catalog.Infrastructure/Catalog.Infrastructure.csproj src/Catalog.Infrastructure/
RUN dotnet restore src/Catalog.Api/Catalog.Api.csproj
COPY . .
RUN dotnet publish src/Catalog.Api/Catalog.Api.csproj -c Release -o /app --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0-noble-chiseled
WORKDIR /app
COPY --from=build /app .
ENTRYPOINT ["dotnet", "Catalog.Api.dll"]
```

The first stage compiles; the second copies only `/app` into a small runtime image, so the SDK never reaches production. Copying the `.csproj` files and restoring before copying the rest of the code is a cache trick: Docker reuses the restore layer until the package references change, so a code change does not download every package again. Copy every project the API references (here `Catalog.Core` and `Catalog.Infrastructure`), plus any `Directory.Build.props` or `Directory.Packages.props`; restore walks the project references, and a missing file fails it in a clean build. Add a `.dockerignore` with `bin/` and `obj/` so host build output never leaks into the context. Pin the base image by digest too (`FROM mcr.microsoft.com/dotnet/aspnet:10.0@sha256:<digest>`), so a rebuild cannot silently pick up a different image; Microsoft's "Containerize a .NET app" tutorial calls a SHA after the tag a best practice.

## Port 8080 and the non-root user

Since .NET 8, the images set `ASPNETCORE_HTTP_PORTS=8080`. Port 80 is privileged, and the images moved off it so the app can run as the non-root `app` user. Map `-p 5000:8080`, not `-p 5000:80`. The chiseled images and SDK-published images run as `app` by default. On the regular `aspnet` image, add `USER $APP_UID` before `ENTRYPOINT` to opt in.

Your code does not change: the minimal hosting model reads that variable for you.

```csharp
var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

app.MapGet("/whoami", () => new
{
    Environment.UserName,
    Ports = app.Configuration["ASPNETCORE_HTTP_PORTS"]
});

app.Run();
```

Inside a chiseled container, `/whoami` should report the `app` user and port `8080`, a quick check that you did not end up running as root.

## Publishing an image without a Dockerfile

The .NET 8+ SDK builds OCI images itself. It needs no Dockerfile and no Docker daemon, unless you push to the local daemon, which is the default:

```xml
<PropertyGroup>
  <ContainerRepository>catalog-api</ContainerRepository>
  <ContainerFamily>noble-chiseled</ContainerFamily>
  <ContainerImageTags>1.0.0;latest</ContainerImageTags>
</PropertyGroup>
```

```bash
dotnet publish --os linux --arch x64 /t:PublishContainer
```

The SDK infers the base image (`aspnet` for a web project, `runtime-deps` when self-contained), takes the tag from the target framework (`10.0`), appends `ContainerFamily` (giving `10.0-noble-chiseled`), and runs as the `app` user. Add `-p ContainerRegistry=ghcr.io` to push straight to a registry, or `-p ContainerArchiveOutputPath=./image.tar.gz` to produce a tarball for a scanner. The SDK cannot run `RUN` instructions. If you need extra OS packages, build a custom base image and point `ContainerBaseImage` at it, or use a Dockerfile.

## Configuration comes from the environment

Containers get their settings from environment variables, which override `appsettings.json`. A double underscore stands for the `:` separator:

```csharp
// ConnectionStrings__Catalog=Host=db;Database=catalog;Username=app;Password=...
var connectionString = builder.Configuration.GetConnectionString("Catalog")
    ?? throw new InvalidOperationException("ConnectionStrings:Catalog is missing.");
```

## Running with dependencies in docker compose

```yaml
services:
  api:
    build:
      context: .
      dockerfile: src/Catalog.Api/Dockerfile
    ports: ["5000:8080"]
    environment:
      ConnectionStrings__Catalog: "Host=db;Database=catalog;Username=app;Password=dev-only"
    depends_on:
      db:
        condition: service_healthy
  db:
    image: postgres:18
    environment:
      POSTGRES_USER: app
      POSTGRES_PASSWORD: dev-only
      POSTGRES_DB: catalog
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U app -d catalog"]
      interval: 5s
      retries: 10
```

Inside the compose network, the service name `db` is the host name. `condition: service_healthy` makes Compose wait for the database's health check before it starts the API. Without it, `depends_on` only orders container start, not readiness.

## Common mistakes

- **The SDK image in production.** Running `dotnet run` on `sdk:10.0` against mounted source ships the compilers and your code, compiles at every start and gives an attacker more tools. Publish in a build stage and copy only `/app` into `aspnet`.
- **Mapping port 80.** `docker run -p 8000:80` gets "connection reset", because the app listens on 8080. Map `-p 8000:8080`.
- **`localhost` in a connection string.** Inside a container, `localhost` is that container, so the API cannot reach the database and startup fails with a connection error. Use the Compose service name (`Host=db`).
- **No `.dockerignore`.** `COPY . .` brings the host's `obj/` folder over the container's restore output, so `dotnet publish --no-restore` can fail with package paths from your machine. Ignore `bin/` and `obj/`.

## In practice

- **Dockerfile or SDK publish?** SDK publish is the shorter path for a plain API or worker and fits CI well (lesson 11/02). Keep a Dockerfile when you need OS packages, a custom build, or a team standard that scans Dockerfiles.
- **Chiseled by default for APIs.** Have the platform probe an HTTP endpoint (lesson 11/04) instead of a `HEALTHCHECK CMD curl ...`, which cannot run in an image without a shell or curl.
- **Logs go to stdout.** The console logger already writes there; the container runtime collects it. No log files inside the container.
- **No secrets in the image.** Every layer can be read by anyone who pulls it. Pass secrets at run time from the platform's secret store; the `dev-only` password above is for local Compose only.

## Status as of 2026-11-05

- `.NET 10` images use Ubuntu 24.04 by default; Debian images are not shipped for .NET 10 (Microsoft breaking-change note).
- Port 8080 and the `app` user have been the defaults since .NET 8.
- SDK container publishing is built into the .NET 8+ SDK (Microsoft's `sdk-publish` page lists ".NET 8+ SDK" as the prerequisite).

## Check yourself

1. Why does the final stage of the Dockerfile use `aspnet` and not `sdk`, and what would break if it used `runtime`?
2. A colleague maps `-p 8000:80` and gets "connection reset". What do you change, and why did the default move?
3. When would you keep a Dockerfile instead of `dotnet publish /t:PublishContainer`?
