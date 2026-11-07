# CI/CD security

Why each control in the pipeline exists, what it protects against, and what was considered and left out. The workflows and the admin setup are listed in [CONTRIBUTING.md](CONTRIBUTING.md#ci-and-deploy); this file holds the reasons. Update it in the same change as any workflow, `.github/` or `.gitleaksignore` change it describes.

## Threat model

What the pipeline defends against, most likely first:

1. **A malicious or compromised dependency.** An npm package, a GitHub Action, a Docker image or a Python wheel runs code in CI the moment it is installed or used.
2. **A pull request from someone with push access, or from a stolen contributor token.** On `pull_request`, GitHub runs the pull request's own copy of the workflows, so anything a workflow can reach, the pull request can reach.
3. **A leaked credential**, committed by mistake or printed in a log.
4. **A deploy that is not what was tested.** The host publishes a build that differs from what passed CI, or serves the app without the headers that isolate learner code.

Fork pull requests get no secrets and a read-only token from GitHub. Learner code never runs in CI with any credential: the verify suites run lessons in sandboxes (`src/verify/pythonSandbox.ts`, the iframe engines) and no CI job holds a deploy secret.

## Pipeline

```text
pull request ─► ci.yml       detect affected checks · checks (lint, typecheck, unit, build, smoke under vite preview)
             │               verify (affected tracks) · python (pytest on CPython) · workflows (actionlint, zizmor)
             ├► security.yml dependency review · gitleaks · OSV-Scanner · CodeQL (npm audit on main and weekly)
             └► docs-sync.yml (advisory)
                     │
   branch protection: required checks green, code owner review, branch up to date, no admin bypass
                     ▼
merge to main ─► every check runs again ─► Cloudflare Workers Builds publishes (`wrangler.jsonc`)
             └► scorecard.yml (also weekly)
```

## Decisions

### No deploy secrets in CI

- **Decision.** The host, Cloudflare Workers, deploys through its own Git integration (Workers Builds), preview versions for other branches and production from `main`; CI holds no deploy token. The build token lives in Cloudflare, and the deploy commands name an exact Wrangler version (`npx wrangler@<version> deploy`), so a build never installs whatever `wrangler` is latest. The gate is branch protection, because only a green pull request can reach `main`.
- **Why.** A CI deploy job needs a host token, and such a token usually covers the whole account. Any secret a workflow can read is readable by a pull request that edits the workflow. Even an untouched workflow could be steered: `npx` run inside the checkout reads a `.npmrc` committed by the pull request and installs a look-alike CLI that holds the token.
- **Left out.**
  - The CI deploy job with an environment-scoped token: it was implemented in #7 and replaced by this model.
  - OIDC short-lived credentials: with the host building from Git, CI needs no deploy credential at all.
- **Residual risk.**
  - A push that bypasses branch protection reaches production untested, so administrators must not be allowed to bypass it.
  - Two pull requests that pass alone can break together, so the branch must be up to date before merging (or use a merge queue).
  - A host that also accepts CLI deploys can be published to by any account member: keep the host account to the maintainers, with two-factor authentication and no API tokens.
  - Workers Builds runs the build of every pushed branch with its build token; a branch is pushed only by someone with write access to the repository.

### Every action and image pinned to an immutable reference

- **Decision.** Every `uses:` is pinned to a full commit SHA with the version in a comment, including GitHub's own actions. Every Docker image is pinned to a digest. `zizmor` fails CI on an unpinned reference. Dependabot proposes updates monthly with a 14-day `cooldown`.
- **Why.** A tag is mutable. In March 2025 the `tj-actions/changed-files` tags were repointed to a malicious commit (CVE-2025-30066), and every workflow using a tag printed its secrets to public logs. A SHA cannot be repointed. The cooldown gives the ecosystem time to catch a hijacked or broken release before it is proposed here.
- **Left out.** Pinning only third-party actions: the rule is simpler and checkable when everything is pinned, and Dependabot keeps the SHAs current.
- **Manual step.** Dependabot cannot update the Docker digests in `run:` lines (actionlint, gitleaks, zizmor). Bump them by hand, with an image at least two weeks old.

### Least privilege for the `GITHUB_TOKEN`

- **Decision.** The default `permissions` is `contents: read`. A job gets more only when it needs it, with a comment saying why (`security-events: write` to upload code scanning results, `id-token: write` for the Scorecard publication). Every checkout sets `persist-credentials: false`.
- **Why.** `actions/checkout` writes the token into `.git/config` by default, and every later step, including dependency install scripts, can read it there. If the workspace is uploaded as an artifact, the token leaks with it ("ArtiPACKED", the `artipacked` audit in zizmor). No job here performs authenticated git operations after checkout.

### No privileged triggers

- **Decision.** No `pull_request_target`, `workflow_run` or `issue_comment` triggers. No `${{ github.event.* }}` expression inside `run:`: untrusted values go through `env:`.
- **Why.** `pull_request_target` runs with the base repository's secrets and write token. Checking out the pull request's code under it gives that code those powers. This is how Ultralytics was compromised in December 2024, through cache poisoning that led to a release with a crypto miner. Expressions inside `run:` are template-injected into the shell before it runs.
- **Enforced by** `zizmor` (`dangerous-triggers`, `template-injection`) and review: `.github/` is owned by the maintainers in `CODEOWNERS`.

### Workflow linting

- **Decision.** `actionlint` (syntax, expressions, shellcheck on every `run:`) and `zizmor` (security audits) run on every pull request. `zizmor` runs offline, so it needs no token.
- **Why.** Workflows are code that runs with credentials, and the common mistakes are mechanical: missing quotes, a mutable reference, a broad permission. A linter catches them before a reviewer has to.

### Secrets never committed

- **Decision.** `gitleaks` scans the whole history on every run: every ref, plus merge commit diffs (`-m`), where a key added while resolving a conflict would otherwise be missed. The fake credentials that lessons use on purpose are allowed by fingerprint in `.gitleaksignore` (commit, file, rule, line), not by path, so a new key, even inside a lesson, still fails. GitHub secret scanning and push protection, enabled by an admin, block known provider keys before they reach the history.
- **Why.** A secret in git history is public forever on a public repository: deleting the file does not remove it. The hooks lesson (redacting secrets) and the JWT lesson need realistic-looking fake keys, so a path exclusion would blind the scanner exactly where keys are most likely to be pasted.
- **Rule.** Add a fingerprint to `.gitleaksignore` only after checking that the value is fake. A real key that was committed is revoked first, then removed.

### Dependencies: lockfiles, audits and install scripts

- **Decision.**
  - `npm ci` from `package-lock.json`. `npm audit` must stay clean, with scoped `overrides` when a parent package has no fixed release (`minimatch` 11 for the ESLint toolchain).
  - OSV-Scanner on the npm and Python lockfiles, and the dependency review action on pull requests.
  - The Python test dependencies are installed with `--require-hashes`.
  - The Pyodide wheels are downloaded by `postinstall` and verified against the sha256 in `pyodide-lock.json` before use.
  - The C# engine's artifacts are downloaded by the same `postinstall` (`scripts/csharp-track/vendor-dotnet.mjs`) from the official sources only: six NuGet packages from nuget.org (browser-wasm runtime pack, reference pack, the WebAssembly SDK pack for its Webcil converter, Roslyn and the `csc.dll` toolset), each checked against the SHA-512 `packageHash` of its NuGet catalog entry, and the .NET runtime (not the SDK) from builds.dotnet.microsoft.com, checked against the SHA-512 in `releases.json`. The hashes are pinned in `vendor/dotnet/manifest.json` (a changed upstream file fails the install), with the SHA-256 of every served file. The runtime only runs `csc.dll` and the Webcil converter at install time, to compile the host from `src/engines/csharp/host/*.cs` and `scripts/csharp-track/WebcilConvert.cs` and convert the served assemblies (deterministic, so the pinned hashes reproduce); no SDK, MSBuild, workload or committed binary.
- **Why.** Installing a package runs its code. In September 2025 the "Shai-Hulud" worm spread through npm `postinstall` scripts, stealing npm and GitHub tokens from developer machines and CI and republishing itself into the victims' packages. A pinned lockfile and hash checks stop silent substitution. The audits catch known vulnerabilities. No secret in CI means a malicious install script finds nothing worth stealing.
- **Left out.** Running every install with `--ignore-scripts`: the Pyodide packages and the .NET files are fetched by our own `postinstall`, and `vite`/`esbuild` need their install step.

### The C# engine's files are checked at every stage

- **Decision.**
  - **Pins.** .NET 10.0.14 (LTS) and Roslyn 5.9.0, set in `scripts/csharp-track/vendor-dotnet.mjs`; the package SHA-512s, the runtime SHA-512 per machine type and the SHA-256 and size of all 57 served files are in `vendor/dotnet/manifest.json`, the only committed file of `vendor/dotnet/`. A pin matches on id and version, so a bump takes new hashes from the catalog and `releases.json` and shows up as a reviewed manifest diff (the first pin of a new version is taken from the catalog on first use). Every served file is `.js` or `.wasm` (Webcil assemblies, wrapped reference assemblies; no `.dll`), and the set is capped at 8.5 MiB measured with Brotli quality 5, close to what a CDN sends (pyodide.asm.wasm: 3,227,042 B at q5, 3,285,125 B as served by the previous host); the script fails above it.
  - **Install and CI.** `postinstall` verifies every download before use and uses no network when the served files match the manifest and the host sources are unchanged; `npm run verify` starts with `npm run csharp:vendor -- --check`, which exits 1 on a missing, altered or stale file. In CI (`CI` set) `postinstall` never rewrites the manifest: a manifest that no longer matches the script, the host sources, the converter source or the curated set fails the install, a rebuild of missing files must reproduce the committed manifest exactly, and the `check` job runs `git diff --exit-code vendor/dotnet/manifest.json` after `npm ci`. So every served hash a host deploys is one a reviewer saw. The cache is not trusted: every cached package and archive is checked against its SHA-512 pin before use (a mismatch downloads it again from the official source), the toolchain is extracted again from its checked archive on every CI build (a cached extraction is never run), and the rebuilt files must still match the committed manifest. CI caches `vendor/dotnet` without its `.cache/` and **without `manifest.json`** (key: the manifest, the script, the converter and the host sources) with the same pinned `actions/cache` as Pyodide; the committed manifest stays the reference, so a restored cache is re-verified against it by `postinstall` and a poisoned cache fails the install.
  - **Build.** `plugins/dotnetPlugin.ts` serves only files listed in the manifest, hash-checked, under `dotnet/<version>/` (the manifest's hash of the served set, so the path names fixed content), and the build fails on a missing or altered file (`Missing .NET file …`), on a manifest whose version does not match its files, and on host sources changed since the host was compiled.
  - **Runtime.** The worker fetches every file itself and checks its size and SHA-256 against the pins **bundled into the worker script** before booting, so a tampered `dotnet/` folder cannot pass by shipping its own `manifest.json`. The verify child does the same against pins bundled into the child. `csharpSandbox.test.ts` proves a tampered Webcil assembly, reference assembly or `dotnet.runtime.js` fails even with a forged served manifest. A reference assembly is unwrapped only after its check, and only from a module whose single section is `dojo.pe`.
  - **Learner code.** After boot and before learner code, `engines/csharp/lockdown.ts` (on the shared `engines/shared/workerLockdown.ts`) makes `Function.prototype.bind` throw, which stops the runtime from binding any new JavaScript function for learner C# (`JSFunctionBinding.BindJSFunction` is reachable from a `DynamicMethod`), and behind that removes the network globals, the worker's `postMessage`, `close`, `onmessage` and `navigator`, the file system handles, the runtime's debug and loader entry points and the members of the runtime's `INTERNAL` object, and replaces every JavaScript code generator with a throwing stand-in; `System.Net.Http` is not shipped. The worker CSP (`script-src 'self' 'wasm-unsafe-eval'; connect-src 'self'`) is sent for `assets/csharp.worker-*` by the host and the Vite servers (`CSP_WORKERS` in `plugins/pythonWorkerCspPlugin.ts`). `csharpEscapeScan.ts` must find nothing reachable from `globalThis` and `INTERNAL`. Each finding and its test are listed in [csharp-engine.md](csharp-engine.md#security-model).
  - **Deploy.** The smoke check (`npm run smoke:worker-csp`) compares every `dotnet/<version>/` file with the build and with its `manifest.json` (assemblies after gunzip), fails on any `.dll` or `.gz` under `dotnet/`, checks `.wasm` is served as `application/wasm`, requires the C# worker CSP header and, on a deploy, immutable caching and Brotli or gzip on `dotnet.native.wasm`, `dotnet.runtime.js`, CoreLib, the Roslyn C# assembly and a reference assembly.
- **Why.** These files run learner code with the rights of the app's origin; a substituted assembly or runtime script would be a stored script injection that no hashed asset name reveals. Bundling the pins into the worker removes the served folder from the trusted set.
- **Left out.**
  - Loading the three runtime `.js` files from the checked bytes: they are imported by URL after the check (loading from bytes breaks the runtime's `createRequire` in Node, and the worker CSP refuses `blob:`). The versioned path is immutable, so the import is answered from the HTTP cache the checked fetch filled; a cache eviction between the two requests, or a same-origin attacker who could replace the worker script anyway, is what remains.
  - OSV-Scanner and Dependabot do not read `vendor/dotnet/manifest.json`; .NET and Roslyn security releases are followed by hand (bump the pins in the script).
  - The escape scan runs in Node only; in the browser no JavaScript binding can be made after the lock-down, which the browser check proves with the `DynamicMethod` probe.

### Pull requests run only what their changes need

- **Decision.** `scripts/ci/affected-checks.mjs` maps a pull request's changed files to the jobs it needs: the verify suites of the touched tracks and engines, pytest, the code checks, the workflow linters, the dependency scans and the CodeQL languages. Pushes to `main`, the weekly schedules and manual runs still run everything. Branch protection requires the aggregate `Verify result` instead of each `Verify <suite>`.
- **Why.** Every pull request ran all twelve track suites, CodeQL for three languages and both dependency scans, about 35 jobs per push, most of them for files the change never touched.
- **Risk and mitigation.** A file mapped to too few jobs would merge untested: unknown shared paths (the loader, shared engine code, verify helpers, the toolchain, `ci.yml` itself) run everything, the domain layer cannot import the UI layers, so UI changes cannot break a lesson, and the full run on `main` catches a gap right after merge. Secret scanning runs on every pull request regardless.

### Static analysis of the application

- **Decision.** CodeQL for TypeScript, Python and the workflows (`actions`), with results in code scanning. Lesson folders are excluded: starters are wrong on purpose. `src/content/*.ts`, the loader, is scanned.
- **Why.** The app runs learner code. The sandbox, the worker lock-down and the loader are security boundaries, and CodeQL's data-flow queries find classes of bugs (injection, unsafe URL handling) that unit tests do not look for.

### The deploy is checked, not assumed

- **Decision.** `npm run smoke:worker-csp` (`scripts/python-track/check-worker-csp.mjs`) checks a build against what a server actually sends: the page and the SPA fallback serve this build's `index.html` with the root element, the worker CSP header on the Python and C# workers, and every file under `pyodide/` and `dotnet/` byte-for-byte. The `checks` job runs it under `vite preview` on every change; with `--url <origin> --dist <dir>` it checks a deploy (a Workers Builds deploy or `wrangler dev`). The headers come from `public/_headers` and the SPA fallback from `wrangler.jsonc`; `worker/index.test.ts` checks both against `WORKER_CSP` and the DSN in `ci.yml`.
- **Why.** The worker CSP (`script-src 'self' 'wasm-unsafe-eval'`, no `'unsafe-eval'`) is what stops learner Python or C# from compiling JavaScript in the browser, and only the host can send it. A status check alone is not enough: the SPA fallback answers a missing file with `index.html` and status 200.
- **Why the comparison works.** The host and CI build the same commit with the same Node version (`.nvmrc`) and lockfile, and the Vite build is deterministic. Build-time values that reach the bundle must match too: `ci.yml` sets the same `VITE_SENTRY_DSN` the host uses (a DSN is public), and the Sentry release is the commit SHA on both. `--build-only` waits until a deploy serves this build, so a broken deploy fails at once with its real cause instead of timing out.

### Python tests on CPython isolate the harness

- **Decision.** `tests/python` runs each lesson in a fresh child process with temporary `DOJO_APP_DIRECTORY` and `DOJO_SCRATCH_DIRECTORIES`, and the runner refuses to start without them.
- **Why.** The harness deletes new files in its scratch directories after every test. In Pyodide those are `/tmp` and `~` of a throwaway file system. On a developer's machine they would be the real ones.

### Review ownership

- **Decision.** `.github/CODEOWNERS` assigns to the maintainers:
  - the pipeline (`.github/`);
  - the review rules (`.coderabbit.yaml`, `.gitleaksignore`);
  - the Claude Code harness (`.claude/settings.json`, `.claude/hooks/`);
  - the deploy configuration (`wrangler.jsonc`, `worker/`, `public/_headers`, which carries the worker CSP);
  - the learner-code isolation files (worker CSP plugin, the shared worker lock-down, the Python and C# lock-downs, the C# worker and host, verify sandbox, `src/sandbox/`).

  Branch protection requires their review.
- **Why.** These files decide what CI trusts and what learner code can do. A change there should never merge on an unrelated approval.

### Measured posture

- **Decision.** OpenSSF Scorecard runs on `main`, weekly and when branch protection changes. It uploads to code scanning and publishes the score behind the README badge.
- **Why.** It checks the same practices from the outside (pinned dependencies, token permissions, branch protection, code review, dangerous workflows), so a regression in repository settings shows up even when no file changed.

## Considered and left out

| Control | Why not now |
| --- | --- |
| OIDC instead of long-lived tokens | No deploy credential is left in CI; the host builds from its Git integration. |
| SLSA provenance and artifact attestations | They prove which workflow built a published artifact for consumers who verify it. This project publishes a website, not a package. |
| SBOM generation | The same audience as provenance; the lockfiles and OSV already cover vulnerability tracking. |
| Egress control on runners (StepSecurity harden-runner) | Most useful where a job holds secrets; none does. Revisit if a secret is ever added. |
| Merge queue | The "branch up to date" rule covers the same risk at this pull request volume. |
| Signed commits | They prove the author, not that the code is safe; branch protection and code owners already gate what merges. |
| Self-hosted runners | GitHub-hosted runners are ephemeral and isolated per job; self-hosted ones would add persistence an attacker could abuse. |

## Admin checklist

The settings no file can enforce are listed in [CONTRIBUTING.md](CONTRIBUTING.md#hosting) "Setup, once, by a repository admin":
- Branch protection with required checks, code owners, the branch up to date before merging, and no admin bypass.
- Private vulnerability reporting (the channel `SECURITY.md` points to), secret scanning and push protection.
- CodeQL default setup off.
- Cloudflare Workers Builds: the pinned deploy commands and the build variables.
- Sentry: `SENTRY_AUTH_TOKEN` as a secret build variable on the host, the GitHub integration, alerts (CONTRIBUTING.md "Sentry").
