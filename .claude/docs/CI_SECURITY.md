# CI/CD security

Why each control in the pipeline exists, what it protects against, and what was considered and left out. The workflows and the admin setup are listed in [CONTRIBUTING.md](CONTRIBUTING.md#ci-and-deploy); this file holds the reasons. Update it in the same change as any workflow, `netlify.toml`, `.github/` or `.gitleaksignore` change it describes.

## Threat model

What the pipeline defends against, most likely first:

1. **A malicious or compromised dependency.** An npm package, a GitHub Action, a Docker image or a Python wheel runs code in CI the moment it is installed or used.
2. **A pull request from someone with push access, or from a stolen contributor token.** On `pull_request`, GitHub runs the pull request's own copy of the workflows, so anything a workflow can reach, the pull request can reach.
3. **A leaked credential**, committed by mistake or printed in a log.
4. **A deploy that is not what was tested.** Netlify publishes a build that differs from what passed CI, or serves the app without the headers that isolate learner code.

Fork pull requests get no secrets and a read-only token from GitHub. Learner code never runs in CI with any credential: the verify suites run lessons in sandboxes (`src/verify/pythonSandbox.ts`, the iframe engines) and no CI job holds a deploy secret.

## Pipeline

```text
pull request ─► ci.yml       checks (lint, typecheck, unit, build, smoke under vite preview) · verify (per track)
             │               python (pytest on CPython) · workflows (actionlint, zizmor) · smoke (Netlify Deploy Preview)
             ├► security.yml dependency review · gitleaks · OSV-Scanner · CodeQL (npm audit on main and weekly)
             ├► docs-sync.yml (advisory)
             └► Netlify      Deploy Preview, built by Netlify from the pull request
                     │
   branch protection: required checks green, code owner review, branch up to date, no admin bypass
                     ▼
merge to main ─► Netlify builds and publishes production ─► ci.yml smoke against the live site
             └► scorecard.yml (also weekly)
```

## Decisions

### No deploy secrets in CI

- **Decision.** Netlify deploys through its Git integration: a Deploy Preview for each pull request and production from `main`. CI has no Netlify token. The gate is branch protection, because only a green pull request can reach `main`. Netlify's **Enforce Git-based deployments** setting blocks CLI and API deploys to production, so even a leaked token cannot publish.
- **Why.** A CI deploy job needs a Netlify personal access token, and that token covers the whole account. Any secret a workflow can read is readable by a pull request that edits the workflow. Even an untouched workflow could be steered: `npx` run inside the checkout reads a `.npmrc` committed by the pull request and installs a look-alike CLI that holds the token. Keeping the token on a `production` environment limited to `main` closes both paths, but CI deploys also require stopping Netlify builds, which removes Deploy Previews.
- **Left out.**
  - The CI deploy job with an environment-scoped token: it was implemented in #7 and replaced by this model.
  - OIDC short-lived credentials: Netlify deploys authenticate with personal access tokens, not GitHub OIDC.
- **Residual risk.**
  - A push that bypasses branch protection reaches production untested, so administrators must not be allowed to bypass it.
  - Two pull requests that pass alone can break together, so the branch must be up to date before merging (or use a merge queue).

### Every action and image pinned to an immutable reference

- **Decision.** Every `uses:` is pinned to a full commit SHA with the version in a comment, including GitHub's own actions. Every Docker image is pinned to a digest. `zizmor` fails CI on an unpinned reference. Dependabot proposes updates monthly with a 14-day `cooldown`.
- **Why.** A tag is mutable. In March 2025 the `tj-actions/changed-files` tags were repointed to a malicious commit (CVE-2025-30066), and every workflow using a tag printed its secrets to public logs. A SHA cannot be repointed. The cooldown gives the ecosystem time to catch a hijacked or broken release before it is proposed here.
- **Left out.** Pinning only third-party actions: the rule is simpler and checkable when everything is pinned, and Dependabot keeps the SHAs current.
- **Manual step.** Dependabot cannot update the Docker digests in `run:` lines (actionlint, gitleaks, zizmor). Bump them by hand, with an image at least two weeks old.

### Least privilege for the `GITHUB_TOKEN`

- **Decision.** The default `permissions` is `contents: read`. A job gets more only when it needs it, with a comment saying why (`security-events: write` to upload code scanning results, `statuses: read` to read Netlify's status, `id-token: write` for the Scorecard publication). Every checkout sets `persist-credentials: false`.
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
  - A job that does not need lifecycle scripts uses `npm ci --ignore-scripts` (`smoke`).
- **Why.** Installing a package runs its code. In September 2025 the "Shai-Hulud" worm spread through npm `postinstall` scripts, stealing npm and GitHub tokens from developer machines and CI and republishing itself into the victims' packages. A pinned lockfile and hash checks stop silent substitution. The audits catch known vulnerabilities. No secret in CI means a malicious install script finds nothing worth stealing.
- **Left out.** Running every install with `--ignore-scripts`: the Pyodide packages are fetched by our own `postinstall`, and `vite`/`esbuild` need their install step.

### Static analysis of the application

- **Decision.** CodeQL for TypeScript, Python and the workflows (`actions`), with results in code scanning. Lesson folders are excluded: starters are wrong on purpose. `src/content/*.ts`, the loader, is scanned.
- **Why.** The app runs learner code. The sandbox, the worker lock-down and the loader are security boundaries, and CodeQL's data-flow queries find classes of bugs (injection, unsafe URL handling) that unit tests do not look for.

### The deploy is checked, not assumed

- **Decision.** The `smoke` job checks what Netlify actually serves against a build of the commit Netlify built. On a pull request it builds the pull request head itself (CI's `dist` is the merge with `main`) and checks the Deploy Preview, reading the URL from Netlify's commit status. After a merge it checks production against the `dist` artifact. It first waits until the page is this build's `index.html` (`--build-only`), then runs the full check once: the page and the SPA fallback serve this build's `index.html` and root element (every line of the build's HTML must appear in order, which tolerates the comment Netlify injects into some responses but fails on any changed or removed line) and the hashed entry assets it names byte for byte, the worker Content-Security-Policy, that the page does not carry it, and every file under `pyodide/` byte for byte. On `main` it stops with a notice when a newer commit reaches `main` first, and a failure after the build is live prints the rollback steps (CONTRIBUTING.md "Rolling back production").
- **Why.** The worker CSP (`script-src 'self' 'wasm-unsafe-eval'`, no `'unsafe-eval'`) is what stops learner Python from compiling JavaScript in the browser, and only the host can send it. A status check alone is not enough: the SPA fallback answers a missing file with `index.html` and status 200.

- **Why the comparison works.** Netlify and CI build the same commit with the same Node version (`.nvmrc`) and lockfile, and the Vite build is deterministic: a local build of `main` produces the same `index.html` and hashed assets that production serves.
- **Why waiting and checking are separate.** Retrying the full check until it passes would turn a broken deploy into a 15-minute timeout with the wrong message; polling only for the build makes a real failure fail at once with its cause.

### Python tests on CPython isolate the harness

- **Decision.** `tests/python` runs each lesson in a fresh child process with temporary `DOJO_APP_DIRECTORY` and `DOJO_SCRATCH_DIRECTORIES`, and the runner refuses to start without them.
- **Why.** The harness deletes new files in its scratch directories after every test. In Pyodide those are `/tmp` and `~` of a throwaway file system. On a developer's machine they would be the real ones.

### Review ownership

- **Decision.** `.github/CODEOWNERS` assigns to the maintainers:
  - the pipeline (`.github/`);
  - the deploy configuration (`netlify.toml`);
  - the review rules (`.coderabbit.yaml`, `.gitleaksignore`);
  - the Claude Code harness (`.claude/settings.json`, `.claude/hooks/`);
  - the learner-code isolation files (worker CSP plugin, Python lock-down, verify sandbox, `src/sandbox/`).

  Branch protection requires their review.
- **Why.** These files decide what CI trusts and what learner code can do. A change there should never merge on an unrelated approval.

### Measured posture

- **Decision.** OpenSSF Scorecard runs on `main`, weekly and when branch protection changes. It uploads to code scanning and publishes the score behind the README badge.
- **Why.** It checks the same practices from the outside (pinned dependencies, token permissions, branch protection, code review, dangerous workflows), so a regression in repository settings shows up even when no file changed.

## Considered and left out

| Control | Why not now |
| --- | --- |
| OIDC instead of long-lived tokens | No deploy credential is left in CI; Netlify does not take GitHub OIDC for deploys. |
| SLSA provenance and artifact attestations | They prove which workflow built a published artifact for consumers who verify it. This project publishes a website, not a package. |
| SBOM generation | The same audience as provenance; the lockfiles and OSV already cover vulnerability tracking. |
| Egress control on runners (StepSecurity harden-runner) | Most useful where a job holds secrets; none does. Revisit if a secret is ever added. |
| Merge queue | The "branch up to date" rule covers the same risk at this pull request volume. |
| Signed commits | They prove the author, not that the code is safe; branch protection and code owners already gate what merges. |
| Self-hosted runners | GitHub-hosted runners are ephemeral and isolated per job; self-hosted ones would add persistence an attacker could abuse. |

## Admin checklist

The settings no file can enforce are listed in [CONTRIBUTING.md](CONTRIBUTING.md#netlify-netlifytoml) "Setup, once, by a repository admin":
- Netlify: Deploy Previews on, Enforce Git-based deployments.
- Branch protection with required checks, code owners, the branch up to date before merging, and no admin bypass.
- Private vulnerability reporting (the channel `SECURITY.md` points to), secret scanning and push protection.
- CodeQL default setup off.
