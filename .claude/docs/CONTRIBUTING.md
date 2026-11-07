# Contributing

How to set up the project, ship a change and keep the documentation in step with the code. Everything (code, content, docs, commit messages) is written in English.

## Setup

- Node.js 26 (pinned in `.nvmrc`, used by CI; `nvm use` picks it up) and npm. Older versions may build the app but fail the Python verify suites: the sandboxed child process (`src/verify/pythonSandbox.ts`) passes `--disable-sigusr1`, which Node 22.13 rejects.
- `npm install`, then `npm run dev` (http://localhost:5173). `npm install` needs network: its `postinstall` (`scripts/python-track/vendor-packages.mjs`) downloads the Pydantic wheels into `vendor/pyodide-packages/` (git-ignored, like `node_modules`; only `manifest.json` is committed) and checks them against `pyodide-lock.json`. When they are already present and match, it uses no network. Then `scripts/csharp-track/vendor-dotnet.mjs` assembles the C# engine's files in `vendor/dotnet/` (≈ 107 MB of downloads on the first run, cached in `vendor/dotnet/.cache/`; only `manifest.json` is committed; supported machines: linux, macOS and Windows on x64/arm64) and compiles the host with `csc.dll`; it also uses no network when the served files match the manifest and the host sources did not change. After `npm ci --ignore-scripts`, run `npm run python:vendor` and `npm run csharp:vendor` before building or verifying; the build fails with `Missing Pyodide package …` or `Missing .NET file …` otherwise. `npm run csharp:vendor -- --check` verifies without downloading or compiling (`npm run verify` runs it).
- Python 3.14 for the CPython test suite (`tests/python`), optional locally and always run in CI: `python3 -m venv .venv && .venv/bin/pip install --require-hashes -r tests/python/requirements.txt`, then `.venv/bin/python -m pytest` (or `uv venv --python 3.14 .venv && uv pip install --python .venv/bin/python --require-hashes -r tests/python/requirements.txt`).
- No backend, no environment variables, no API keys: grading, previews, the fake REST API and the fake model all run in the browser. The Python engine loads Pyodide from `node_modules/pyodide`, served by `plugins/pyodidePlugin.ts`.

## Workflow

1. Branch from `main`, or from the preceding branch for a later part of a stack: `feat/<topic>`, `fix/<topic>`, `docs/<topic>`, `perf/<topic>`, `refactor/<topic>`. Never commit straight to `main`.
2. Make the change and update the documents that describe it in the same change (see [Documentation upkeep](#documentation-upkeep)).
3. Run the checks below.
4. Push the branch and open a pull request against `main`, or against the preceding branch for a later part of a stack.

Parallel work on the same machine uses git worktrees under `.claude/worktrees/` (ignored by git).

### Commits

Conventional commits, short and objective, one subject line naming what changed. Pull request titles follow the same format (CodeRabbit's title check enforces it as a warning, rule in `.coderabbit.yaml` `pre_merge_checks.title`):

```
feat(python): add module 11 metaprogramming
fix(engines): keep nested None as JSON null in Python fake model replies
docs(curriculum): mark AI Engineering modules 12-13 written
ci: waive docs sync only when docs:none itself is added
```

- Types: `feat`, `fix`, `docs`, `perf`, `refactor`, `test`, `chore`, `ci`.
- Scope (optional): a track id (`typescript`, `react`, `react-state`, `architecture`, `ai-engineering`, `node`, `python`, `csharp`, `system-design`, `vue`, `angular`) or an area (`engines`, `sandbox`, `verify`, `content`, `curriculum`, `lesson`, `routing`, `scene`, `motion`, `ui`, `deps`, `ci`, `review`, `docs`, `harness`). A new scope is added to this list and to `.coderabbit.yaml` in the same change.
- Subject: starts with a lowercase imperative verb (`add`, `fix`, `remove`, `update`, `mark`...); product and language names keep their casing after it. No trailing period.
- A body, when needed, is a list of what changed.

### Opening a pull request from an AI agent

1. Branch from `main` for a non-stacked pull request or the first part of a stack; for each later part, branch from the preceding part's branch. Commit with the format above and `git push -u origin <branch>`.
2. Before opening it, run the checks of "Checks before a pull request" on the branch and keep the result of each one: only a check that ran and passed is marked in the body. `npm run build` needs the .NET files; when `vendor/dotnet/` holds only `manifest.json`, run `npm run csharp:vendor` first.
3. The remote is `https://github.com/Luiquecruz/constela-mission`. Read it with `git remote -v` instead of guessing it.
4. With the GitHub CLI available, open it with `gh pr create --base <base-branch> --title "<title>" --body "<body>"`. Use `main` as the base for a non-stacked pull request or the first part of a stack, and the preceding part's branch for each later part.
5. Without `gh` (it is not installed on every machine; check with `which gh`), give one compare link with the title and the body already filled in, never one that only carries `?expand=1` (GitHub does not apply `.github/pull_request_template.md` to a compare link): `https://github.com/Luiquecruz/constela-mission/compare/<base-branch>...<branch>?expand=1&title=<encoded title>&body=<encoded body>`. Use the same base as in step 4 and the pushed branch as the head. Encode both values with `urllib.parse.quote`.
6. Title: same format as a commit subject (see Commits). Body: the headings of the template, "What changed" as a short list, one line for any setup the reviewer must do (for example a repository variable), and the checklist with every check that was actually run marked `[x]`; a box that does not apply is marked with a note saying why.

### Pull request size

CodeRabbit reviews at most **300 changed files**; above that it skips the whole pull request, which would then merge with no automated review. The `Pull request size` job in `ci.yml` fails a pull request over 300 files. Keep pull requests well below the limit (one module or one platform change per pull request when possible), and split larger work into **stacked pull requests**:

1. Cut the work into parts that each build and pass the checks on their own: platform and docs first, then content in groups of modules. A track stays hidden (`TRACK_FLAGS`) until the part that completes it, and `CURRICULUM.md` marks only the lessons each part ships.
2. Open the first part against `main` and each next part against the previous part's branch, so every diff shows only that part.
3. Merge bottom-up, and keep the merged branch until the next part is retargeted: deleting it first (`gh pr merge --delete-branch`) closes the next pull request, and a closed pull request cannot change its base. After a part merges, set the next part's base to `main` (`gh pr edit <number> --base main`), merge `main` into it, re-run the checks, then delete the merged branch. CodeRabbit reviews pull requests on any base branch (`base_branches: [".*"]` in `.coderabbit.yaml`), so each part gets its own review.

### Checks before a pull request

```bash
npm run lint                                         # ESLint (eslint.config.js)
npm run typecheck
npm run test                                         # unit + architecture rules
npx vitest run src/verify/<track>.test.ts            # tracks whose lessons or engine changed
npx vitest run src/verify/noDates.test.ts            # any lesson text: no dates or changelog
npm run verify                                       # every lesson, when an engine or shared runner changed
npm run build
npm run docs:check                                   # documents updated for every documented area that changed
.venv/bin/python -m pytest                           # Python lessons and harness on CPython, when Python lessons or the harness changed
npx vitest run src/verify/csharpSandbox.test.ts      # C# engine regression tests, when the C# engine, host or vendor/dotnet changed
```

**Lint.** `eslint.config.js` (ESLint 10 flat config): `@eslint/js` and `typescript-eslint` recommended everywhere, `eslint-plugin-react-hooks` and `eslint-plugin-jsx-a11y-x` recommended on `src/**/*.tsx`. `jsx-a11y-x` is the maintained fork of `eslint-plugin-jsx-a11y`, which has had no release since 2024 and does not support ESLint 10. Lesson folders (`src/content/*/**`) are not linted: starters are broken on purpose. `.venv/` is ignored too: a pip-created venv ships `.js` files. `no-explicit-any` is off in `src/engines/`, which implements untyped runtime surfaces (Jest-like `expect`, the CommonJS loader, Node built-ins). An `eslint-disable-next-line` always names the rule and a reason after `--`. Dialog backdrops are `role="presentation"` and close on `event.target === event.currentTarget`; every dialog also closes on Escape.

**Python on CPython.** `tests/python` grades the Python challenges (Python track lessons and the `variants/python` of AI Engineering; those that use the fake model are skipped, see below) with the real harness (`dojo_harness.py`) under CPython 3.14: the solution passes every test and the starter fails at least one test, the same contract `npm run verify` checks under Pyodide, so a lesson cannot teach a Pyodide quirk as Python behavior. Each project runs in a fresh `python -s -P` child (hash seed 0, like Pyodide) (`tests/python/run_lesson.py`) whose `DOJO_APP_DIRECTORY` and `DOJO_SCRATCH_DIRECTORIES` point at a temporary directory; the runner refuses to start without them, because the harness deletes new files in its scratch directories (`/tmp` and `~` in Pyodide). `tests/python/stubs/` stands in for `js`, `pyodide.ffi` and the fake model bridge; lessons that use the fake model are skipped, since it runs only in Pyodide. `tests/python/lessons.py` reads that use from the code: an import of `dojo_ai` in `tests.py` or the solution (`ast`), or `fake_model`, `respond` or `for_each_seed` read in `tests.py` as the harness globals, the only scope where the harness defines them (`symtable` resolves each name, so `respond = mod.respond` in the tests is not the harness global). A learner function that happens to be called `respond` is graded like any other. `tests/python/test_harness.py` covers test discovery, failure messages (including a `TimeoutError` raised by the code, told apart from the 4 s deadline of an async test), isolation between tests and the runner's guard. Dependencies are locked with hashes in `tests/python/requirements.txt` (generated from `requirements.in`, command in its header); Pydantic and its dependencies match the wheels vendored for Pyodide.

Python track lessons follow their own process (scaffold, Definition of Ready and Done, WIP limits, review checklist) in [python-track/11-working-agreement.md](python-track/11-working-agreement.md).

UI, motion and scene changes are also checked in a real browser (jsdom has no layout); see `.claude/CLAUDE.md` "Tests".

## CI and deploy

### GitHub Actions

Workflows run on every pull request, on every push to `main` and by hand (`workflow_dispatch`); Security also runs weekly. Node comes from `.nvmrc`; npm, pip, the Pyodide packages and `vendor/dotnet` (without its `.cache/`) are cached (the cache is safe: postinstall re-verifies every wheel against `pyodide-lock.json` and every .NET file against `vendor/dotnet/manifest.json`). A pushed commit on a pull request cancels the run still going for the previous one; on `main` every commit runs in its own concurrency group, so every commit gets a full run. Jobs run on `ubuntu-24.04`, pinned instead of `ubuntu-latest` (which moves to Ubuntu 26 from October 2026), so the runner image changes only in a reviewed change that bumps every workflow at once.

| Workflow | Job | Runs | Fails the run |
| --- | --- | --- | --- |
| `ci.yml` | `changes` | `scripts/ci/affected-checks.mjs`: on a pull request, maps the files changed since the merge base to the jobs below (see "Affected checks"); on `main` and by hand, selects every job | yes |
| `ci.yml` | `checks` | skipped when the pull request changes only documentation; `npm run lint`, `npm run typecheck`, `npm run test`, `vite build`, `npm run smoke:worker-csp` (the build under `vite preview`) | yes |
| `ci.yml` | `verify` (matrix) | one job per affected suite from `changes` (every suite on `main`): `src/verify/<id>.test.ts` for each track (a track without its suite fails, Vitest finds no file) plus `structure` (every `src/verify/*.test.ts` that is not a track suite: content, curriculum, track presentation, Python conventions and sandbox, the C# sandbox, and `csharp.test.ts` while no track declares the `csharp` engine) and `npm run python:curriculum -- --check`. A new track needs no workflow change | yes, each suite reports on its own (`fail-fast: false`) |
| `ci.yml` | `verify-result` | after `verify`: passes when every affected suite passed or none was affected; the one required check for the matrix, whose job names change with the suites it runs | yes |
| `ci.yml` | `python` | when Python files, `tests/python/`, `pyproject.toml` or the Python engine change: `python -m pytest` on CPython 3.14 (see "Python on CPython") | yes |
| `ci.yml` | `pr-size` | pull requests only: fails above 300 changed files, the most CodeRabbit reviews (see "Pull request size") | yes |
| `ci.yml` | `workflows` | when a workflow changes: `actionlint` (with shellcheck) and `zizmor` (offline, severity low and up: template injection, excessive permissions, unpinned uses, dangerous triggers) on every workflow | yes |
| `security.yml` | `npm-audit` | `npm audit --audit-level=moderate` on pushes to `main`, weekly and by hand; not on pull requests, where a new advisory against a dependency already on `main` would fail every unrelated pull request (pull requests get `dependency-review` and `osv-scan-pr`, which report only what they add); a weekly failure means a dependency on `main` needs an update or an `overrides` entry | yes |
| `security.yml` | `dependency-review` | pull requests that change `package.json`, `package-lock.json`, `tests/python/requirements.txt` or `pyproject.toml`: fails when the pull request adds a dependency with a known vulnerability of moderate severity or more (`actions/dependency-review-action`) | yes |
| `security.yml` | `secrets` | gitleaks over the whole git history, every ref and merge commit diffs included (`--log-opts="--full-history --all --diff-filter=tuxdb -m"`, gitleaks' default plus `-m`); the fake credentials lessons use on purpose (the hooks lesson redacts secrets, the JWT lesson uses the jwt.io sample token) are listed by fingerprint in `.gitleaksignore`, so a new key, even in a lesson, still fails. Add a fingerprint only after checking the value is fake | yes |
| `security.yml` | `osv-scan` / `osv-scan-pr` | OSV-Scanner over `package-lock.json` and `tests/python/requirements.txt` (on pull requests, only vulnerabilities the pull request adds, and only when one of the dependency files above changes); results go to code scanning | yes |
| `security.yml` | `codeql` (matrix) | CodeQL for `javascript-typescript`, `python` and `actions` on `main`, weekly and by hand; on a pull request only the languages it touches (scripts outside lesson folders, Python outside lesson folders, workflows) (lesson folders `src/content/*/**` excluded; `src/content/*.ts` is scanned); results go to code scanning | yes, on findings |
| `docs-sync.yml` | `docs` | `docs-sync.mjs --check` against the PR base or the previous `main` commit | no, shows a warning |
| `scorecard.yml` | `analysis` | OpenSSF Scorecard on `main`, weekly and when branch protection changes: scores the repository's security practices, uploads to code scanning and publishes the result behind the README badge | no (a score, not a gate) |

#### Affected checks

`scripts/ci/affected-checks.mjs` (tests next to it) decides what a pull request runs from the files it changes (`git diff --no-renames` against the merge base, so a moved lesson counts in both tracks). Both `ci.yml` and `security.yml` call it in their `changes` job; pushes to `main`, schedules and manual runs pass `--all`, so `main` always runs everything and a mis-mapped file surfaces right after merge.

| Changed files | Runs |
| --- | --- |
| `src/content/<id>/**` | `Verify <id>` and `structure` |
| `src/engines/<engine>/**` | `Verify` of every track graded by that engine (`engine` or `languages` in `track.json`) and `structure` |
| `src/verify/<id>.test.ts` | `Verify <id>` |
| any other `src/verify/` file, `src/engines/shared/`, top-level files of `src/engines/` and `src/content/`, `src/sandbox/`, `sandbox.html`, `package.json`, `package-lock.json`, `vite.config.ts`, `tsconfig.json`, `.nvmrc`, `ci.yml`, `scripts/`, `plugins/`, `vendor/` | every suite and `python` |
| `.claude/docs/CURRICULUM.md`, `src/shared/design/tokens.css`, `src/entities/track/**` | `structure` |
| `*.py`, `tests/python/`, `pyproject.toml` | `python` |
| `.github/workflows/**` | `workflows`, CodeQL `actions` |
| anything but Markdown outside `src/`, `.claude/` (except `.claude/hooks/`), `.coderabbit.yaml`, `CODEOWNERS` and `.gitleaksignore` | `checks` |

UI layers need no verify suite: lesson verification lives in the domain layer, which never imports the layers above (`src/architecture.test.ts`). A new shared path that lessons depend on goes into `FULL_RUN_PATTERNS` in the same change.

Pinning: every action and reusable workflow is pinned to a full commit SHA with the version in a comment, and every Docker image to a digest (actionlint, gitleaks, zizmor); `zizmor` fails the build on an unpinned reference. Dependabot updates the pinned SHAs and comments monthly, after a 14-day `cooldown`, so a hijacked or broken release is usually caught and pulled before it is proposed; it cannot update the Docker digests in `run:` lines, which are bumped by hand. Every checkout sets `persist-credentials: false`, so the `GITHUB_TOKEN` is not left in `.git/config` for dependency install scripts to read. `.github/CODEOWNERS` assigns the pipeline, the deploy configuration, the review rules, the Claude Code harness and the learner-code isolation files to the maintainers. Why each control exists, and what was considered and left out, is in [CI_SECURITY.md](CI_SECURITY.md).

### Hosting

The app runs on Cloudflare Workers with static assets, built and deployed by Workers Builds from the repository. Three files configure it:

- `wrangler.jsonc`: the Worker `constela-mission` on `workers.dev`, with `preview_urls` so every branch gets a Preview URL (`<branch>-constela-mission.<subdomain>.workers.dev`, reported to Sentry as `preview`; the setting applies once `main` has deployed it), `dist/` as its assets with `not_found_handling: "single-page-application"`, `run_worker_first: ["/signal"]` so only the tunnel reaches the Worker, and `SENTRY_DSN` (the DSN in `ci.yml`) under `vars` and `previews.vars` (`wrangler preview` refuses a config without a `previews` block).
- `worker/index.ts`: forwards `POST /signal` to `sentryEnvelopeUrl(SENTRY_DSN)` and answers other methods with 405.
- `public/_headers` (copied into `dist/`): the worker CSP and the immutable cache rules.

`worker/index.test.ts` checks them against `WORKER_CSP`, `CSP_WORKERS` and the DSN in `ci.yml`. To run the deploy locally: `npm run build`, `npx wrangler@4.158.0 dev`, then `npm run smoke:worker-csp -- --url http://localhost:8787 --dist dist`.

What the host provides, and where:

- SPA fallback: every path without a file serves `/index.html` with status 200 (routing uses `BrowserRouter`); `not_found_handling` in `wrangler.jsonc`.
- `Content-Security-Policy` on `/assets/python.worker-*` and `/assets/csharp.worker-*`, the same value as `WORKER_CSP` in `plugins/pythonWorkerCspPlugin.ts` (its `CSP_WORKERS` lists the workers); `public/_headers`, kept in sync by `worker/index.test.ts`.
- Long-lived cache on `/assets/*` (hashed file names) and `/dotnet/*` (`dotnet/<version>/`, where the version is the hash of the served set), in `public/_headers`, and Brotli on the `.js` and `.wasm` files (Cloudflare compresses both content types); `dotnet/` serves nothing else (no `.dll`), and the C# worker never sends a Range request, which hosts answer uncompressed.
- The Sentry tunnel: `POST /signal` proxied to the envelope endpoint of the project in `VITE_SENTRY_DSN` (`sentryEnvelopeUrl` in `plugins/sentryTunnel.ts`), before the SPA fallback ("Sentry" below); `worker/index.ts`.
- The build: `npm ci` (its `postinstall` downloads and verifies the Pyodide packages and the .NET files) then `npm run build`, with `VITE_SENTRY_DSN` and, as a secret, `SENTRY_AUTH_TOKEN`. The Sentry release is `WORKERS_CI_COMMIT_SHA` on Cloudflare Workers Builds and `GITHUB_SHA` in CI; the deploy environment is `production` for `main`.
- Deploys through Workers Builds (the Git integration), so CI holds no deploy token; the gate is branch protection.

`npm run smoke:worker-csp -- --url <origin> --dist dist` checks a deployed build against a local build of the same commit (worker CSP, SPA fallback, Pyodide and .NET files).

Setup, once, by an admin of the Cloudflare account: Workers → `constela-mission` → Settings → Build: Git repository connected with `main` as the production branch, Previews enabled under Branch control (Worker Previews, not the older preview versions), build command `npm ci && npm run build` with the build variable `SKIP_DEPENDENCY_INSTALL=1` (production and Previews), deploy command `npx wrangler@4.158.0 deploy`, non-production branch deploy command `npx wrangler@4.158.0 preview` (a Worker Preview per branch), root directory `/`; build variables `VITE_SENTRY_DSN` and, as a secret, `SENTRY_AUTH_TOKEN`. Bump the Wrangler version in these commands and in the local command above together. Without `SKIP_DEPENDENCY_INSTALL`, Workers Builds also runs `pip install .` because of `pyproject.toml`, creating `build/` and `*.egg-info/` in the checkout. Both are covered by the repository's `.gitignore`, so Tailwind's automatic source detection skips them. Without `wrangler.jsonc`, `wrangler deploy` tries to configure the project itself, detects Hono (a dependency of the Node.js engine) and fails.

Setup, once, by a repository admin:

1. GitHub: protect `main` (Settings → Branches or Rulesets): require a pull request, review from code owners, the branch to be up to date before merging, and the status checks `Detect affected checks`, `Lint, typecheck, unit tests, build`, `Verify result`, `Python lessons on CPython (pytest)`, `Pull request size (CodeRabbit reviews at most 300 files)`, `Lint workflows (actionlint, zizmor)`, `npm audit`, `Dependency review (new dependencies in this pull request)` and `Secret scan (gitleaks, full history)` (a job skipped by its condition reports as skipped, which counts as passed); never the `Verify <suite>` or `CodeQL <language>` matrix jobs, which do not report when their matrix is empty; **do not allow administrators to bypass** it. A direct push or a bypass would reach `main` without the checks; an out-of-date branch could merge into a `main` it was never tested against. Required checks are matched by name: renaming a job's `name:` leaves branch protection waiting for a check that never reports, so update this list and the branch protection rule in the same change.
2. Settings → Code security: enable **private vulnerability reporting** (the channel [SECURITY.md](../../SECURITY.md) points to), **secret scanning** and **push protection** (free for public repositories), so GitHub blocks a push that contains a known provider key before it reaches the history.
3. Code scanning: `security.yml` is an advanced CodeQL setup; if CodeQL default setup is enabled in Settings → Code security, switch it off, or the `codeql` jobs fail.
4. Settings → Secrets and variables → Actions → **Variables**: add `VITE_SENTRY_DSN` with the same value as the host's build variable, and update both together. `ci.yml` builds with it, falling back to the DSN in the workflow.

### Sentry

What the code does is in ARCHITECTURE.md "Error monitoring". The project is `lcruz-development/advanced-dev-dojo-ultimate-master` (`vite.config.ts`). Setup, once, by an admin of the Sentry organization and the host:

1. **Host build variables.** `VITE_SENTRY_DSN` (public, also the `VITE_SENTRY_DSN` GitHub variable, step 4 above) and `SENTRY_AUTH_TOKEN` as a secret: an organization auth token (Sentry → Settings → Developer Settings → Organization Tokens, scope `org:ci`), which uploads source maps and creates releases. Without it the build still passes; source maps stay in `dist/` and no release is created.
2. **GitHub integration.** Sentry → Settings → Integrations → GitHub: install it for the repository and add a code mapping (stack trace root `/`, source code root `src/`, branch `main`). Releases then list their commits (`setCommits: { auto: true }` in `vite.config.ts`, which warns in the build log until the integration exists), issues show suspect commits, and `Fixes <SHORT-ID>` in a commit message resolves an issue on release.
3. **Alerts.** Alerts → Create: a new issue in `production`; an issue that regresses; more than 20 events of one issue in an hour; the `Python runtime did not start`/`C# runtime did not start` titles more than 5 times in an hour; LCP p75 above 2.5 s on `/:trackId/:lessonId`. Route them to email or Slack.
4. **Inbound filters.** Project Settings → Inbound Filters: on for browser extensions, legacy browsers and web crawlers.
5. **User feedback.** Feedback from the **Report a problem** dialog appears under User Feedback with the waypoint tags and the replay; no setup needed, notifications are in Project Settings → User Feedback.

Changing the DSN (a new project): update the host build variable (production and Previews), the GitHub variable, the fallback in `ci.yml`, `SENTRY_DSN` under `vars` and `previews.vars` in `wrangler.jsonc` (the `/signal` target) and `org`/`project` in `vite.config.ts`, in one pull request.

Checking it locally: put the DSN in `.env.local`, `npm run build && npx vite preview`, and watch the `POST /signal` requests in DevTools; events arrive in the `development` environment. `npm run dev` sends nothing.

## Code review (CodeRabbit)

CodeRabbit reviews every non-draft pull request, whatever its base branch (`main` or, for stacked parts, the previous part's branch). Its configuration is `.coderabbit.yaml` at the repository root (schema `https://coderabbit.ai/integrations/schema.v2.json`); the file wins over the repository and organization settings in the CodeRabbit UI (only organization global overrides rank above it), so change it here, not in the UI. `@coderabbitai configuration` in a pull request prints the resolved configuration with the source of each value. Its review is advice: CI and a human reviewer decide the merge, and CodeRabbit is not a required check.

| Setting | Value | Why |
| --- | --- | --- |
| `language`, `profile` | `en-US`, `chill` | the project is in English; content pull requests touch hundreds of files, so only real issues are reported |
| `auto_review` | non-draft pull requests on any base branch (`base_branches: [".*"]`, so stacked parts are reviewed), incremental on each push; skipped when the title has `[WIP]` or `[skip review]` | review once the author asks for it |
| `path_filters` | skip `dist/`, `vendor/`, `__pycache__/`; keep `package-lock.json` for `osvScanner` | omit generated or downloaded files while retaining resolved dependencies for security scanning |
| `path_instructions` | per area: lessons, Python lessons, engines and sandbox, verify, the CI script, shared, UI layers, tokens, workflows, docs | the project rules that apply to each folder |
| `pre_merge_checks` | title in conventional commit format, description present, two custom checks (lessons listed in `CURRICULUM.md`, new track registered everywhere, blueprint logo glyph included), all as warnings; docstring coverage off | the checks CI cannot express; docs sync stays in `.github/workflows/docs-sync.yml` |
| `tools` | on: `shellcheck`, `actionlint`, `zizmor`, `yamllint`, `gitleaks`, `trufflehog`, `osvScanner`, GitHub checks. Off: `ruff`, `pylint`, `flake8`, `biome`, `eslint`, `oxc`, `reactDoctor`, `stylelint`, `markdownlint`, `languagetool` | lesson starters are incomplete on purpose, so Python and style linters would only add noise; ESLint already runs in CI (`npm run lint`, lesson folders excluded) and GitHub checks bring its result into the review |
| `knowledge_base` | learnings kept to this repository; guidelines: `.claude/CLAUDE.md` and this file (repository-wide), `ARCHITECTURE.md` (code), `CONTENT_GUIDE.md` (content, engines, verify), Python content standards and working agreement (Python track) | reviews follow the same rules as authors and Claude Code |

`path_instructions` and `custom_checks` restate rules that live in `.claude/CLAUDE.md`, `ARCHITECTURE.md`, `CONTENT_GUIDE.md` and `.github/workflows/ci.yml`: when one of those rules changes, update `.coderabbit.yaml` in the same change. Teach CodeRabbit in the pull request (`@coderabbitai` replies); its learnings stay in this repository. Rules that apply to everyone belong in the documents above, not in learnings or personal settings.

## Documentation upkeep

Documentation is incremental: every change that alters behavior, structure, commands, conventions or the curriculum updates the matching document in the same change, not in a later pass. Describe the current state (what exists and how to use it), not a changelog.

| When you change | Update |
| --- | --- |
| a lesson (new, renamed, removed) | `CURRICULUM.md` (`✓`, enforced by `src/verify/curriculum.test.ts`) |
| a Python track lesson or its plan | `python-track/03-curriculum.md`, then `npm run python:curriculum` (the Python section of `CURRICULUM.md` is generated, never hand-edited) |
| the Python engine, harness or worker | `python-track/01-platform-and-engine.md`, `CONTENT_GUIDE.md` "Python engine"; run both the `python` and `ai-engineering` suites |
| the C# engine, its host, worker, `vendor/dotnet/manifest.json`, `scripts/csharp-track/` | `csharp-engine.md`, `CONTRIBUTING.md` "Hosting", `ARCHITECTURE.md` "The C# engine", `CONTENT_GUIDE.md` "C# engine", `CI_SECURITY.md` for pins and checks; run `npx vitest run src/verify/csharpSandbox.test.ts` and the browser check |
| `track.json`, a new track or a hidden/shown track | `README.md` tracks table, `CURRICULUM.md`, `CONTENT_GUIDE.md` |
| an engine, its `registry.ts`, test globals or installed libraries | `CONTENT_GUIDE.md` (globals, versions), `ARCHITECTURE.md` (engine sections) |
| `src/sandbox/`, `sandbox.html`, the runner | `ARCHITECTURE.md` |
| a slice in `app`, `pages`, `features`, `entities`, `shared` | `ARCHITECTURE.md`, `.claude/CLAUDE.md` source map |
| routing, state or storage | `ARCHITECTURE.md` "Routing" / "State and storage", `.claude/CLAUDE.md` |
| motion, scene, tokens, accents | `.claude/CLAUDE.md` "Motion and the ambient scene" / "UI and styling", `.claude/specs/` |
| `src/verify/` | `CONTENT_GUIDE.md` "Verification", `.claude/CLAUDE.md` commands |
| `package.json` scripts, `vite.config.ts`, `plugins/`, `scripts/`, `index.html` | `README.md` "Run", `.claude/CLAUDE.md` "Commands" |
| `.claude/settings.json`, `.claude/hooks/` | this file, "Harness" |
| `wrangler.jsonc`, `worker/`, `public/_headers` | this file, "Hosting"; `CI_SECURITY.md` "No deploy secrets in CI" |
| `.github/`, `.nvmrc`, `.gitleaksignore` | this file, "CI and deploy"; `CI_SECURITY.md` for the reason behind each control; `README.md` "Requirements" for the Node version |
| `eslint.config.js`, `pyproject.toml`, `tests/python/` | this file, "Checks before a pull request"; `README.md`; `.claude/CLAUDE.md` "Commands" |
| `.coderabbit.yaml` | this file, "Code review (CodeRabbit)" |
| a rule restated in `.coderabbit.yaml` (layers, performance, accessibility, lesson contract, sandbox isolation, new track steps) | the matching `path_instructions` or `custom_checks` entry in `.coderabbit.yaml` |
| a convention or workflow rule | this file |

Tests keep part of this honest: `curriculum.test.ts` (lessons ↔ `CURRICULUM.md`), `trackPresentation.test.ts` (accents), `architecture.test.ts` (layer rules).

### Docs sync check

`.claude/hooks/docs-sync.mjs` compares the changed files against the table above. A changed file counts as covered when at least one of its documents also changed. It reads the working tree (staged, unstaged and untracked) plus commits not yet on the upstream branch (or on `main`, for a branch without upstream). Unit tests (`*.test.ts`) and lesson folders are skipped: lessons are covered by `curriculum.test.ts`. It reads the committed file list NUL-separated (`git diff -z`), so paths with non-ASCII characters, such as the visual spec's file name, match their directory prefix instead of arriving quoted by git. Control characters in a path are printed escaped, so a crafted file name cannot forge lines in the CI log.

- `npm run docs:check` prints the uncovered files and exits with 1 when there are any. Run it before pushing.
- In Claude Code the same script runs as a `Stop` hook (see [Harness](#harness)).

When a change touches an area but nothing a document describes (a bug fix, an internal rename), no doc update is needed; the check is a prompt to review, not a gate.

In CI the check runs in its own workflow (`.github/workflows/docs-sync.yml`) on every pull request and on pushes to `main`, and lists the uncovered files in the job log. When a reviewer confirms that nothing a document describes changed, add the `docs:none` label: the check still runs and prints the list, but reports a notice instead of failing, and the label records the decision on the pull request. Adding or removing the label re-runs only this workflow. The waiver covers only the reviewed state: it applies to the run started by adding `docs:none` itself (or by opening the pull request with it), so a new push, an unrelated label or reopening never waives. Events for other labels run under a separate check, `Docs sync (label event, ignored)`, in their own concurrency group, and do nothing. They can neither waive, cancel the `docs:none` run, nor replace the `Docs sync` check. Dependabot adds several labels in a row, and a skipped `Docs sync` would hide an earlier warning. After a push the check fails again until a reviewer removes and re-applies `docs:none`, and a checker error (as opposed to a list of uncovered files) is never waived. Pushes to `main` are checked one by one and never cancel each other. Dependabot pull requests get the label automatically (`.github/dependabot.yml`), since they only bump versions. Labels need triage permission on the repository, so a contributor without it cannot waive the check on their own pull request.

## Harness

`.claude/` is shared with everyone working on the project:

| Path | Purpose |
| --- | --- |
| `.claude/CLAUDE.md` | project instructions Claude Code loads in every session |
| `.claude/docs/` | project documentation (this folder) |
| `.claude/specs/` | visual and motion spec (Portuguese) |
| `.claude/settings.json` | shared Claude Code settings: the docs sync `Stop` hook |
| `.claude/hooks/docs-sync.mjs` | docs sync check, used by the hook and `npm run docs:check` |
| `.claude/settings.local.json` | personal overrides (ignored by git) |
| `.claude/worktrees/` | local worktrees (ignored by git) |

The `Stop` hook runs when Claude finishes a turn. When a documented area changed without its documents, it blocks the stop once with the list of files and documents, so Claude updates the docs (or states that nothing documented changed) before handing back. Changes to `.coderabbit.yaml` are covered by an update to this file. The same set of uncovered files is reported only once; the state lives in `.git/constela-docs-sync`. Review or disable hooks with `/hooks`; personal settings go in `.claude/settings.local.json` or `~/.claude/settings.json`, never in the shared file.

Personal Claude Code rules (`~/.claude/CLAUDE.md`, memory) are not shared. Anything the whole team must follow belongs in `.claude/CLAUDE.md` or this file.
