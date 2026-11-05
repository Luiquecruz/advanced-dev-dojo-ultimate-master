# Contributing

How to set up the project, ship a change and keep the documentation in step with the code. Everything (code, content, docs, commit messages) is written in English.

## Setup

- Node.js 26 (pinned in `.nvmrc`, used by CI and Netlify; `nvm use` picks it up) and npm. Older versions may build the app but fail the Python verify suites: the sandboxed child process (`src/verify/pythonSandbox.ts`) passes `--disable-sigusr1`, which Node 22.13 rejects.
- `npm install`, then `npm run dev` (http://localhost:5173). `npm install` needs network: its `postinstall` (`scripts/python-track/vendor-packages.mjs`) downloads the Pydantic wheels into `vendor/pyodide-packages/` (git-ignored, like `node_modules`; only `manifest.json` is committed) and checks them against `pyodide-lock.json`. When they are already present and match, it uses no network. After `npm ci --ignore-scripts`, run `npm run python:vendor` before building or verifying; the build fails with `Missing Pyodide package …` otherwise.
- Python 3.14 for the CPython test suite (`tests/python`), optional locally and always run in CI: `python3 -m venv .venv && .venv/bin/pip install --require-hashes -r tests/python/requirements.txt`, then `.venv/bin/python -m pytest` (or `uv venv --python 3.14 .venv && uv pip install --python .venv/bin/python --require-hashes -r tests/python/requirements.txt`).
- No backend, no environment variables, no API keys: grading, previews, the fake REST API and the fake model all run in the browser. The Python engine loads Pyodide from `node_modules/pyodide`, served by `plugins/pyodidePlugin.ts`.

## Workflow

1. Branch from `main`: `feat/<topic>`, `fix/<topic>`, `docs/<topic>`, `perf/<topic>`, `refactor/<topic>`. Never commit straight to `main`.
2. Make the change and update the documents that describe it in the same change (see [Documentation upkeep](#documentation-upkeep)).
3. Run the checks below.
4. Push the branch and open a pull request against `main`.

Parallel work on the same machine uses git worktrees under `.claude/worktrees/` (ignored by git).

### Commits

Conventional commits, short and objective, one subject line naming what changed:

```
feat(ai-engineering): Python variants for the governance module
fix(engines): keep nested None as JSON null in Python fake model replies
docs(curriculum): mark AI Engineering modules 12-13 written
perf(content): load lesson bodies and lesson screen on demand
```

Types used: `feat`, `fix`, `docs`, `perf`, `refactor`, `test`, `chore`. The scope is a track id (`react`, `node`, `ai-engineering`...) or an area (`engines`, `routing`, `verify`, `content`, `curriculum`, `scene`, `motion`). A body, when needed, is a list of what changed.

### Checks before a pull request

```bash
npm run lint                                         # ESLint (eslint.config.js)
npm run typecheck
npm run test                                         # unit + architecture rules
npx vitest run src/verify/<track>.test.ts            # tracks whose lessons or engine changed
npm run verify                                       # every lesson, when an engine or shared runner changed
npm run build
npm run docs:check                                   # documents updated for every documented area that changed
.venv/bin/python -m pytest                           # Python lessons and harness on CPython, when Python lessons or the harness changed
```

**Lint.** `eslint.config.js` (ESLint 10 flat config): `@eslint/js` and `typescript-eslint` recommended everywhere, `eslint-plugin-react-hooks` and `eslint-plugin-jsx-a11y-x` recommended on `src/**/*.tsx`. `jsx-a11y-x` is the maintained fork of `eslint-plugin-jsx-a11y`, which has had no release since 2024 and does not support ESLint 10. Lesson folders (`src/content/*/**`) are not linted: starters are broken on purpose. `no-explicit-any` is off in `src/engines/`, which implements untyped runtime surfaces (Jest-like `expect`, the CommonJS loader, Node built-ins). An `eslint-disable-next-line` always names the rule and a reason after `--`. Dialog backdrops are `role="presentation"` and close on `event.target === event.currentTarget`; every dialog also closes on Escape.

**Python on CPython.** `tests/python` grades the Python challenges (Python track lessons and the `variants/python` of AI Engineering; those that use the fake model are skipped, see below) with the real harness (`dojo_harness.py`) under CPython 3.14: the solution passes every test and the starter fails at least one test, the same contract `npm run verify` checks under Pyodide, so a lesson cannot teach a Pyodide quirk as Python behavior. Each project runs in a fresh `python -s -P` child (hash seed 0, like Pyodide) (`tests/python/run_lesson.py`) whose `DOJO_APP_DIRECTORY` and `DOJO_SCRATCH_DIRECTORIES` point at a temporary directory; the runner refuses to start without them, because the harness deletes new files in its scratch directories (`/tmp` and `~` in Pyodide). `tests/python/stubs/` stands in for `js`, `pyodide.ffi` and the fake model bridge; lessons that use the fake model (`dojo_ai`) are skipped, since it runs only in Pyodide. `tests/python/test_harness.py` covers test discovery, failure messages, isolation between tests and the runner's guard. Dependencies are locked with hashes in `tests/python/requirements.txt` (generated from `requirements.in`, command in its header); Pydantic and its dependencies match the wheels vendored for Pyodide.

Python track lessons follow their own process (scaffold, Definition of Ready and Done, WIP limits, review checklist) in [python-track/11-working-agreement.md](python-track/11-working-agreement.md).

UI, motion and scene changes are also checked in a real browser (jsdom has no layout); see `.claude/CLAUDE.md` "Tests".

## CI and deploy

### GitHub Actions

Workflows run on every pull request, on every push to `main` and by hand (`workflow_dispatch`); Security also runs weekly. Node comes from `.nvmrc`; npm, pip and the Pyodide packages are cached (the cache is safe: postinstall re-verifies every wheel against `pyodide-lock.json`). A pushed commit on a pull request cancels the run still going for the previous one.

| Workflow | Job | Runs | Fails the run |
| --- | --- | --- | --- |
| `ci.yml` | `checks` | `npm run lint`, `npm run typecheck`, `npm run test`, `vite build`, `npm run smoke:worker-csp` (the build under `vite preview`); uploads `dist/` as the `dist` artifact | yes |
| `ci.yml` | `verify` (matrix) | one job per track suite (`src/verify/<track>.test.ts`) plus `structure` (every other `src/verify/*.test.ts`: content, curriculum, track presentation, Python conventions and sandbox) and `npm run python:curriculum -- --check` | yes, each suite reports on its own (`fail-fast: false`) |
| `ci.yml` | `python` | `python -m pytest` on CPython 3.14 (see "Python on CPython") | yes |
| `ci.yml` | `workflows` | `actionlint` (with shellcheck) on every workflow | yes |
| `ci.yml` | `deploy` | pushes to `main` only, after all of the above: deploys the `dist` artifact to Netlify production | yes; skipped with a notice when the Netlify secrets are missing |
| `ci.yml` | `smoke` | `npm run smoke:worker-csp -- --url <production> --dist dist` against the deploy just made: worker CSP header, page without it, SPA fallback, and the Pyodide files and wheels byte-for-byte equal to the build (a missing file would otherwise pass as the SPA fallback's `index.html` with status 200); runs only when `deploy` produced a URL | yes |
| `security.yml` | `npm-audit` | `npm audit --audit-level=moderate` | yes |
| `security.yml` | `secrets` | gitleaks over the whole git history; the fake credentials lessons use on purpose (the hooks lesson redacts secrets, the JWT lesson uses the jwt.io sample token) are listed by fingerprint in `.gitleaksignore`, so a new key, even in a lesson, still fails. Add a fingerprint only after checking the value is fake | yes |
| `security.yml` | `osv-scan` / `osv-scan-pr` | OSV-Scanner over `package-lock.json` and `tests/python/requirements.txt` (on pull requests, only vulnerabilities the pull request adds); results go to code scanning | yes |
| `security.yml` | `codeql` (matrix) | CodeQL for `javascript-typescript`, `python` and `actions` (lesson folders `src/content/*/**` excluded; `src/content/*.ts` is scanned); results go to code scanning | yes, on findings |
| `docs-sync.yml` | `docs` | `docs-sync.mjs --check` against the PR base or the previous `main` commit | no, shows a warning |

Pinning: GitHub's own actions (`actions/*`, `github/codeql-action`) use their major tag; third-party code is pinned to an immutable reference with the version in a comment: the OSV reusable workflows by commit SHA, the actionlint and gitleaks images by digest, `netlify-cli` by exact version. Every checkout sets `persist-credentials: false`, so the `GITHUB_TOKEN` is not left in `.git/config` for dependency install scripts to read. A new track needs its id in the `verify` matrix and in the `structure` exclusion list of `ci.yml`. `.github/dependabot.yml` opens a monthly grouped PR for action versions; npm dependencies are updated by hand, because lessons and `CONTENT_GUIDE.md` "Installed versions" depend on exact library versions (Pyodide is pinned on purpose), and the Python test lock follows the vendored Pyodide wheels. `npm audit` must stay clean: a vulnerable transitive dependency whose parent has no fixed release yet is pinned in `overrides` in `package.json`, scoped to that parent (`monaco-editor` → `dompurify`, `js-beautify`/`editorconfig` → `glob`, `minimatch`; the ESLint toolchain → `minimatch` 11, for GHSA-g3hv-75wg-m249); remove the entry once the parent ships a fixed range. Never run `npm audit fix --force`: it downgrades direct dependencies (it moved `@vue/test-utils` back to 2.4).

### Netlify (`netlify.toml`)

`netlify.toml` holds what the host must provide:

- SPA fallback: every path without a file rewrites to `/index.html` (routing uses `BrowserRouter`).
- `Content-Security-Policy` on `/assets/python.worker-*`, the same value as `PYTHON_WORKER_CSP` in `plugins/pythonWorkerCspPlugin.ts`; keep both in sync. The `smoke` job checks it on every deploy.
- Long-lived cache on `/assets/*` (hashed file names).

Production deploys go through the `deploy` job, so only code that passed every check on `main` is published. The token must stay out of reach of pull requests: GitHub runs a pull request's own copy of `ci.yml`, so a repository secret would be readable by any branch that edits the workflow. It therefore lives only on the `production` environment, whose deployment branches are limited to `main`, and CI never deploys pull requests. The job also never installs or runs repository code: it checks out only `netlify.toml` and `.nvmrc` (sparse checkout; `setup-node` reads the Node version from `.nvmrc`), downloads the `dist` artifact that `checks` built and runs a pinned `netlify-cli deploy --no-build --prod` from a directory outside the checkout that holds only `dist/` and `netlify.toml`, so no project `.npmrc` or `package.json` can steer `npx`. Pull requests get the same layout check from `checks` (`smoke:worker-csp` under `vite preview`).

Setup, once, by a repository admin:

1. Netlify: create a personal access token **with an expiration date** (renew it before it expires) and note the site id (Site configuration → General); in Build & deploy → Continuous deployment, **stop builds**, so Netlify no longer builds and publishes every push on its own. This also stops Netlify's deploy previews; there are no per-pull-request previews.
2. GitHub: Settings → Environments → `production`: under deployment branches allow only `main`, then add the `NETLIFY_AUTH_TOKEN` and `NETLIFY_SITE_ID` **environment** secrets (never repository secrets). Without them `deploy` exits early with a notice and `smoke` is skipped, because no deployment URL is available; the rest of CI is unaffected.
3. GitHub: protect `main` (Settings → Branches): require a pull request and the status checks `Lint, typecheck, unit tests, build`, every `Verify <suite>`, `Python lessons on CPython (pytest)`, `Lint workflows (actionlint)`, `npm audit` and the CodeQL and OSV jobs.
4. Settings → Code security: enable **secret scanning** and **push protection** (free for public repositories), so GitHub blocks a push that contains a known provider key before it reaches the history.
5. Code scanning: `security.yml` is an advanced CodeQL setup; if CodeQL default setup is enabled in Settings → Code security, switch it off, or the `codeql` jobs fail.

## Documentation upkeep

Documentation is incremental: every change that alters behavior, structure, commands, conventions or the curriculum updates the matching document in the same change, not in a later pass. Describe the current state (what exists and how to use it), not a changelog.

| When you change | Update |
| --- | --- |
| a lesson (new, renamed, removed) | `CURRICULUM.md` (`✓`, enforced by `src/verify/curriculum.test.ts`) |
| a Python track lesson or its plan | `python-track/03-curriculum.md`, then `npm run python:curriculum` (the Python section of `CURRICULUM.md` is generated, never hand-edited) |
| the Python engine, harness or worker | `python-track/01-platform-and-engine.md`, `CONTENT_GUIDE.md` "Python engine"; run both the `python` and `ai-engineering` suites |
| `track.json`, a new track or a hidden/shown track | `README.md` tracks table, `CURRICULUM.md`, `CONTENT_GUIDE.md` |
| an engine, its `registry.ts`, test globals or installed libraries | `CONTENT_GUIDE.md` (globals, versions), `ARCHITECTURE.md` (engine sections) |
| `src/sandbox/`, `sandbox.html`, the runner | `ARCHITECTURE.md` |
| a slice in `app`, `pages`, `features`, `entities`, `shared` | `ARCHITECTURE.md`, `.claude/CLAUDE.md` source map |
| routing, state or storage | `ARCHITECTURE.md` "Routing" / "State and storage", `.claude/CLAUDE.md` |
| motion, scene, tokens, accents | `.claude/CLAUDE.md` "Motion and the ambient scene" / "UI and styling", `.claude/specs/` |
| `src/verify/` | `CONTENT_GUIDE.md` "Verification", `.claude/CLAUDE.md` commands |
| `package.json` scripts, `vite.config.ts`, `plugins/`, `scripts/`, `index.html` | `README.md` "Run", `.claude/CLAUDE.md` "Commands" |
| `.claude/settings.json`, `.claude/hooks/` | this file, "Harness" |
| `.github/`, `netlify.toml`, `.nvmrc` | this file, "CI and deploy"; `README.md` "Requirements" for the Node version |
| `eslint.config.js`, `pyproject.toml`, `tests/python/` | this file, "Checks before a pull request"; `README.md`; `.claude/CLAUDE.md` "Commands" |
| a convention or workflow rule | this file |

Tests keep part of this honest: `curriculum.test.ts` (lessons ↔ `CURRICULUM.md`), `trackPresentation.test.ts` (accents), `architecture.test.ts` (layer rules).

### Docs sync check

`.claude/hooks/docs-sync.mjs` compares the changed files against the table above. A changed file counts as covered when at least one of its documents also changed. It reads the working tree (staged, unstaged and untracked) plus commits not yet on the upstream branch (or on `main`, for a branch without upstream). Unit tests (`*.test.ts`) and lesson folders are skipped: lessons are covered by `curriculum.test.ts`.

- `npm run docs:check` prints the uncovered files and exits with 1 when there are any. Run it before pushing.
- In Claude Code the same script runs as a `Stop` hook (see [Harness](#harness)).

When a change touches an area but nothing a document describes (a bug fix, an internal rename), no doc update is needed; the check is a prompt to review, not a gate.

In CI the check runs in its own workflow (`.github/workflows/docs-sync.yml`) on every pull request and on pushes to `main`, and lists the uncovered files in the job log. When a reviewer confirms that nothing a document describes changed, add the `docs:none` label: the check still runs and prints the list, but reports a notice instead of failing, and the label records the decision on the pull request. Adding or removing the label re-runs only this workflow. The waiver covers only the reviewed state: it applies to the run started by adding `docs:none` itself (or by opening the pull request with it), so a new push, an unrelated label or reopening never waives; after a push the check fails again until a reviewer removes and re-applies `docs:none`, and a checker error (as opposed to a list of uncovered files) is never waived. Pushes to `main` are checked one by one and never cancel each other. Dependabot pull requests get the label automatically (`.github/dependabot.yml`), since they only bump versions. Labels need triage permission on the repository, so a contributor without it cannot waive the check on their own pull request.

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

The `Stop` hook runs when Claude finishes a turn. When a documented area changed without its documents, it blocks the stop once with the list of files and documents, so Claude updates the docs (or states that nothing documented changed) before handing back. The same set of uncovered files is reported only once; the state lives in `.git/dev-dojo-docs-sync`. Review or disable hooks with `/hooks`; personal settings go in `.claude/settings.local.json` or `~/.claude/settings.json`, never in the shared file.

Personal Claude Code rules (`~/.claude/CLAUDE.md`, memory) are not shared. Anything the whole team must follow belongs in `.claude/CLAUDE.md` or this file.
