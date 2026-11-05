# CI/CD Pipelines for .NET

After this lesson you can write a pipeline that restores, builds, tests and publishes a .NET 10 API as a container image, in GitHub Actions and in Azure DevOps Pipelines. You will know which `dotnet` CLI flags make a pipeline reproducible and fast, and why "build once, deploy the same image everywhere" is the rule.

You need: 01/03 (`global.json`), 01/04 (NuGet and lock files), 05/03 (configuration per environment), 07/03 (migrations), 09/01 (`dotnet test`) and lesson 01 of this module (container images).

## What a pipeline is for

A pipeline (CI, continuous integration, plus CD, continuous delivery) turns every commit into a tested artifact and moves that artifact towards production. Three ideas shape a .NET pipeline:

- **The compiler is the first test.** `dotnet build` fails on any type error across the whole solution. Treat a broken build as a failed test.
- **The artifact is an image.** You publish one image tagged with the commit and promote that same image through staging and production. Environment differences live in configuration (05/03), not in the build.
- **Migrations are a separate, explicit step.** Nothing applies them for you. Run an EF Core migration bundle or a reviewed SQL script (07/03) before or during the deploy, never from every app instance at start-up.

## The four commands

Every .NET pipeline, whatever the CI product, is these commands:

```bash
dotnet restore --locked-mode
dotnet build --no-restore -c Release
dotnet test --no-build -c Release
dotnet publish src/Catalog.Api --os linux --arch x64 /t:PublishContainer \
  -p ContainerRegistry=ghcr.io -p ContainerRepository=acme/catalog-api \
  -p ContainerImageTags=$GITHUB_SHA
```

`--no-restore` and `--no-build` stop each step from redoing the previous one. `--locked-mode` fails the restore if `packages.lock.json` does not match the project, so CI never resolves package versions that nobody reviewed. Enable the lock file with `<RestorePackagesWithLockFile>true</RestorePackagesWithLockFile>`. Pin the SDK too, with a `global.json` at the repository root, so CI and laptops compile with the same SDK:

```json
{ "sdk": { "version": "10.0.100", "rollForward": "disable" } }
```

`disable` makes `setup-dotnet` install exactly that SDK and makes every machine use it, which lock files need (01/04). A `latest*` policy such as `latestFeature` lets `setup-dotnet` install the newest allowed band, so the SDK could change between runs without a commit; with `disable`, an SDK upgrade is an explicit change to `global.json`.

## Stamp the build into the binary

CI knows the version and the commit; the running app should too, so a log line or an endpoint can tell you which build is live. Pass `-p:Version=1.4.0` (or `-p:InformationalVersion=...`) to `dotnet publish` and read it at run time:

```csharp
using System.Reflection;

var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

var version = typeof(Program).Assembly
    .GetCustomAttribute<AssemblyInformationalVersionAttribute>()?
    .InformationalVersion ?? "unknown";

app.MapGet("/version", () => new { version });
app.Run();
```

## GitHub Actions

```yaml
name: ci
on:
  pull_request:
  push:
    branches: [main]

permissions:
  contents: read

jobs:
  build:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-dotnet@v6
        with:
          global-json-file: global.json
          cache: true
      - run: dotnet restore --locked-mode
      - run: dotnet build --no-restore -c Release
      - run: dotnet test --no-build -c Release
      - if: github.ref == 'refs/heads/main'
        run: |
          echo "${{ secrets.GITHUB_TOKEN }}" | docker login ghcr.io -u ${{ github.actor }} --password-stdin
          dotnet publish src/Catalog.Api --os linux --arch x64 /t:PublishContainer \
            -p ContainerRegistry=ghcr.io -p ContainerRepository=acme/catalog-api \
            -p ContainerImageTags=${{ github.sha }}
```

Pull requests run build and test; only `main` pushes an image. `setup-dotnet` reads the SDK version from `global.json`. Without one, the runner's newest preinstalled SDK is used, so builds can change under you. `cache: true` caches the NuGet folder keyed by `packages.lock.json` and errors if no lock file exists. The workflow's `GITHUB_TOKEN` can push to GitHub Container Registry when the job grants `packages: write`. The SDK container tooling reads the credentials that `docker login` stores. Repository names must be lowercase, so do not build them from `github.repository` when the owner has capitals. The ubuntu runners have Docker, so Testcontainers tests (09/04) run in the same `dotnet test` step.

## Azure DevOps Pipelines

Azure DevOps shows up in about a quarter of the job postings in this track's market sample. The YAML has the same shape:

```yaml
trigger:
  - main
pool:
  vmImage: ubuntu-latest
steps:
  - task: UseDotNet@2
    inputs:
      packageType: sdk
      useGlobalJson: true
  - script: dotnet restore --locked-mode
  - script: dotnet build --no-restore -c Release
  - task: DotNetCoreCLI@2
    inputs:
      command: test
      projects: '**/*Tests.csproj'
      arguments: '--no-build -c Release'
  - script: dotnet publish src/Catalog.Api --os linux --arch x64 /t:PublishContainer -p ContainerRegistry=$(registry) -p ContainerImageTags=$(Build.SourceVersion)
    condition: and(succeeded(), eq(variables['Build.SourceBranch'], 'refs/heads/main'))
```

`UseDotNet@2` installs the SDK, from `global.json` when `useGlobalJson` is true. `DotNetCoreCLI@2` wraps CLI commands, and with `command: test` it publishes the test results to the run summary. Plain `script:` steps with the CLI work too, and keep the pipeline portable between products. In Azure DevOps, **stages** with **environments** and approvals take the role of protected deploy jobs.

## Common mistakes

- **One image per environment.** Rebuilding for staging and again for production means production runs a binary nobody tested. Build once, tag with the commit SHA, and pass the differences as configuration.
- **Migrations at start-up.** With three replicas, three instances race to alter the same schema, and a failed migration takes the whole rollout down. Run the migration as its own deploy step.
- **A floating SDK.** Without `global.json`, the runner's newest SDK compiles the code, so a build can break overnight with no commit. Pin it with `rollForward: disable`.
- **Copying Microsoft's sample workflow verbatim.** It still pins SDK 6.0 and `@v3` actions; keep the commands, update the versions.

## In practice

- **Build once, promote the image.** Tag with the commit SHA; staging and production deploy the same digest with different configuration. Never `latest` as the only tag in production.
- **Short-lived credentials.** Prefer the platform's OIDC federation (GitHub to Azure or AWS) over cloud keys stored as secrets. Grant each job the least `permissions` it needs.
- **Gate merges on the pipeline.** Make the CI job a required status check on the main branch, so a red build cannot be merged.
- **Pin what you depend on.** `global.json` for the SDK, lock files for NuGet, major versions (or commit SHAs for third-party actions) for actions.

## Status as of 2026-11-05

- `actions/setup-dotnet` README examples use `@v6` (latest release v6.1.0, 2026-11-03) with `actions/checkout@v7`.
- The Microsoft Learn GitHub Actions test sample still pins an old SDK and old action versions; the commands are current, the versions are not.

## Check yourself

1. Why should staging and production run the same image digest, and where do their differences live instead?
2. What does `--locked-mode` protect you from, and what do you do when it fails?
3. Which steps of the workflow run on a pull request, and which only on `main`? Why split them?
