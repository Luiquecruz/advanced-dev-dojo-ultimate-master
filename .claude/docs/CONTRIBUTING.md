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

Conventional commits, short and objective, one subject line naming what changed. Pull request titles follow the same format (CodeRabbit's title check enforces it as a warning, rule in `.coderabbit.yaml` `pre_merge_checks.title`):

```
feat(python): add module 11 metaprogramming
fix(engines): keep nested None as JSON null in Python fake model replies
docs(curriculum): mark AI Engineering modules 12-13 written
ci: waive docs sync only when docs:none itself is added
```

- Types: `feat`, `fix`, `docs`, `perf`, `refactor`, `test`, `chore`, `ci`.
- Scope (optional): a track id (`typescript`, `react`, `react-state`, `architecture`, `ai-engineering`, `node`, `python`, `vue`, `angular`) or an area (`engines`, `sandbox`, `verify`, `content`, `curriculum`, `lesson`, `routing`, `scene`, `motion`, `ui`, `deps`, `ci`, `review`, `docs`, `harness`). A new scope is added to this list and to `.coderabbit.yaml` in the same change.
- Subject: starts with a lowercase imperative verb (`add`, `fix`, `remove`, `update`, `mark`...); product and language names keep their casing after it. No trailing period.
- A body, when needed, is a list of what changed.

### Pull request size

CodeRabbit reviews at most **300 changed files**; above that it skips the whole pull request, which would then merge with no automated review. The `Pull request size` job in `ci.yml` fails a pull request over 300 files. Keep pull requests well below the limit (one module or one platform change per pull request when possible), and split larger work into **stacked pull requests**:

1. Cut the work into parts that each build and pass the checks on their own: platform and docs first, then content in groups of modules. A track stays hidden (`TRACK_FLAGS`) until the part that completes it, and `CURRICULUM.md` marks only the lessons each part ships.
2. Open the first part against `main` and each next part against the previous part's branch, so every diff shows only that part.
3. Merge bottom-up. When a part merges and its branch is deleted, GitHub retargets the next pull request to `main`; merge `main` into it and re-run the checks before merging. Netlify builds Deploy Previews only for pull requests against `main`, so the `smoke` job of a stacked part is skipped until that retarget. CodeRabbit reviews pull requests on any base branch (`base_branches: [".*"]` in `.coderabbit.yaml`), so each part gets its own review.

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

Workflows run on every pull request, on every push to `main` and by hand (`workflow_dispatch`); Security also runs weekly. Node comes from `.nvmrc`; npm, pip and the Pyodide packages are cached (the cache is safe: postinstall re-verifies every wheel against `pyodide-lock.json`). A pushed commit on a pull request cancels the run still going for the previous one; on `main` every commit runs in its own concurrency group, so a run never waits behind the previous commit's production smoke test. Jobs run on `ubuntu-24.04`, pinned instead of `ubuntu-latest` (which moves to Ubuntu 26 from October 2026), so the runner image changes only in a reviewed change that bumps every workflow at once.

| Workflow | Job | Runs | Fails the run |
| --- | --- | --- | --- |
| `ci.yml` | `checks` | `npm run lint`, `npm run typecheck`, `npm run test`, `vite build`, `npm run smoke:worker-csp` (the build under `vite preview`); uploads `dist/` as the `dist` artifact | yes |
| `ci.yml` | `suites` | lists the verify suites: `structure` plus one per `src/content/<id>/track.json` | yes |
| `ci.yml` | `verify` (matrix) | one job per suite from `suites`: `src/verify/<id>.test.ts` for each track (a track without its suite fails, Vitest finds no file) plus `structure` (every `src/verify/*.test.ts` that is not a track suite: content, curriculum, track presentation, Python conventions and sandbox) and `npm run python:curriculum -- --check`. A new track needs no workflow change | yes, each suite reports on its own (`fail-fast: false`) |
| `ci.yml` | `python` | `python -m pytest` on CPython 3.14 (see "Python on CPython") | yes |
| `ci.yml` | `pr-size` | pull requests only: fails above 300 changed files, the most CodeRabbit reviews (see "Pull request size") | yes |
| `ci.yml` | `workflows` | `actionlint` (with shellcheck) and `zizmor` (offline, severity low and up: template injection, excessive permissions, unpinned uses, dangerous triggers) on every workflow | yes |
| `ci.yml` | `smoke` | after `checks`: waits until Netlify serves the commit, then runs `npm run smoke:worker-csp -- --url <deploy> --dist <build>` against it. The build it compares with is the one Netlify made: on a pull request the job builds the pull request head (CI's own `dist` is the merge with `main`, which differs once `main` moves) and reads the Deploy Preview URL from Netlify's `netlify/adv-dv-doj/deploy-preview` commit status (up to 20 minutes; fork pull requests are skipped, their previews may wait for approval); on `main` it uses the `dist` artifact and polls production. Waiting and checking are separate: `--build-only` only asks whether the page is this build's `index.html`, and the full check runs once that is true, so a broken deploy fails at once with its real cause instead of retrying. On `main` the job exits with a notice when a newer commit reaches `main` before this one goes live (that commit's run checks production), fails after 15 minutes when production never serves the commit (failed Netlify build, or auto publishing locked), and fails with the rollback steps when production serves it but the check fails. The full check: the page and the SPA fallback serve this build's `index.html` (every line of it in order, so a changed meta tag counts, while lines the host injects are tolerated; the `dojo-pyodide` meta tag carries a hash of every file under `pyodide/`, so a change there alone, such as a wheel update, also counts as a new build) with the `<div id="root">` the app mounts on, and the hashed entry assets it names match byte-for-byte, so an older deploy still live cannot pass; the worker CSP header and the page without it; every file under `pyodide/` byte-for-byte equal to the build (a missing file would otherwise pass as the SPA fallback's `index.html` with status 200) | yes |
| `security.yml` | `npm-audit` | `npm audit --audit-level=moderate` on pushes to `main`, weekly and by hand; not on pull requests, where a new advisory against a dependency already on `main` would fail every unrelated pull request (pull requests get `dependency-review` and `osv-scan-pr`, which report only what they add); a weekly failure means a dependency on `main` needs an update or an `overrides` entry | yes |
| `security.yml` | `dependency-review` | pull requests only: fails when the pull request adds a dependency with a known vulnerability of moderate severity or more (`actions/dependency-review-action`) | yes |
| `security.yml` | `secrets` | gitleaks over the whole git history, every ref and merge commit diffs included (`--log-opts="--full-history --all --diff-filter=tuxdb -m"`, gitleaks' default plus `-m`); the fake credentials lessons use on purpose (the hooks lesson redacts secrets, the JWT lesson uses the jwt.io sample token) are listed by fingerprint in `.gitleaksignore`, so a new key, even in a lesson, still fails. Add a fingerprint only after checking the value is fake | yes |
| `security.yml` | `osv-scan` / `osv-scan-pr` | OSV-Scanner over `package-lock.json` and `tests/python/requirements.txt` (on pull requests, only vulnerabilities the pull request adds); results go to code scanning | yes |
| `security.yml` | `codeql` (matrix) | CodeQL for `javascript-typescript`, `python` and `actions` (lesson folders `src/content/*/**` excluded; `src/content/*.ts` is scanned); results go to code scanning | yes, on findings |
| `docs-sync.yml` | `docs` | `docs-sync.mjs --check` against the PR base or the previous `main` commit | no, shows a warning |
| `scorecard.yml` | `analysis` | OpenSSF Scorecard on `main`, weekly and when branch protection changes: scores the repository's security practices, uploads to code scanning and publishes the result behind the README badge | no (a score, not a gate) |

Pinning: every action and reusable workflow is pinned to a full commit SHA with the version in a comment, and every Docker image to a digest (actionlint, gitleaks, zizmor); `zizmor` fails the build on an unpinned reference. Dependabot updates the pinned SHAs and comments monthly, after a 14-day `cooldown`, so a hijacked or broken release is usually caught and pulled before it is proposed; it cannot update the Docker digests in `run:` lines, which are bumped by hand. Every checkout sets `persist-credentials: false`, so the `GITHUB_TOKEN` is not left in `.git/config` for dependency install scripts to read. `.github/CODEOWNERS` assigns the pipeline, the deploy configuration, the review rules, the Claude Code harness and the learner-code isolation files to the maintainers. Why each control exists, and what was considered and left out, is in [CI_SECURITY.md](CI_SECURITY.md).

### Netlify (`netlify.toml`)

`netlify.toml` holds what the host must provide:

- SPA fallback: every path without a file rewrites to `/index.html` (routing uses `BrowserRouter`).
- `Content-Security-Policy` on `/assets/python.worker-*`, the same value as `PYTHON_WORKER_CSP` in `plugins/pythonWorkerCspPlugin.ts`; keep both in sync. The `smoke` job checks it on every Deploy Preview and production deploy.
- Long-lived cache on `/assets/*` (hashed file names).

Netlify deploys through its Git integration: a Deploy Preview for every pull request (`deploy-preview-<number>--adv-dv-doj.netlify.app`) and production for every push to `main`. CI holds no Netlify token. Netlify does not wait for GitHub Actions, so the gate is branch protection: only a pull request whose required checks passed can reach `main`, and only then does Netlify publish it. The `smoke` job then checks what Netlify serves.

Setup, once, by a repository admin:

1. Netlify: keep the Git integration with **Deploy Previews on**, and enable **Enforce Git-based deployments** (Project configuration → Developer settings → Continuous deployment → Enforce deployment methods), so production can only be published by a push to `main`, never through the CLI, the API or a leaked token. No Netlify token is created for CI.
2. GitHub: protect `main` (Settings → Branches or Rulesets): require a pull request, review from code owners, the branch to be up to date before merging, and the status checks `Lint, typecheck, unit tests, build`, `List verify suites`, every `Verify <suite>`, `Python lessons on CPython (pytest)`, `Pull request size (CodeRabbit reviews at most 300 files)`, `Lint workflows (actionlint, zizmor)`, `Smoke test the Netlify deploy (worker CSP, SPA fallback, Pyodide files)`, `npm audit` (reported as skipped on pull requests, which counts as passed), `Dependency review (new dependencies in this pull request)`, `Secret scan (gitleaks, full history)` and the CodeQL and OSV jobs; **do not allow administrators to bypass** it. A direct push or a bypass would reach production without the checks; an out-of-date branch could merge into a `main` it was never tested against. Required checks are matched by name: renaming a job's `name:` (or a track, which renames its `Verify <id>`) leaves branch protection waiting for a check that never reports, so update this list and the branch protection rule in the same change.
3. Settings → Code security: enable **private vulnerability reporting** (the channel [SECURITY.md](../../SECURITY.md) points to), **secret scanning** and **push protection** (free for public repositories), so GitHub blocks a push that contains a known provider key before it reaches the history.
4. Code scanning: `security.yml` is an advanced CodeQL setup; if CodeQL default setup is enabled in Settings → Code security, switch it off, or the `codeql` jobs fail.

### Rolling back production

Netlify publishes `main` before the production `smoke` runs, so a failed `smoke` on `main` means the broken build is already live. GitHub emails the author of the run and the job summary repeats these steps.

1. **Restore the last good deploy (seconds).** Netlify → Deploys → open the last deploy that passed `smoke` → **Publish deploy**. Netlify publishes that atomic deploy again; nothing is rebuilt.
2. **Lock auto publishing.** Netlify → Deploys → **Lock to stop auto publishing**. Without the lock the next push to `main` overwrites the rollback. Netlify still builds new deploys while locked; it only stops publishing them.
3. **Fix forward through a pull request.** Revert the merge (`git revert -m 1 <merge commit>`) or fix the cause, open a pull request and let the checks and its Deploy Preview `smoke` pass.
4. **Unlock.** After that pull request merges, Netlify → Deploys → **Unlock to start auto publishing**, then publish the new deploy. The `smoke` run of the merge confirms production.

When rolling back from the UI is not possible, step 3 alone also restores production, at the cost of a full pipeline run.

## Code review (CodeRabbit)

CodeRabbit reviews every non-draft pull request, whatever its base branch (`main` or, for stacked parts, the previous part's branch). Its configuration is `.coderabbit.yaml` at the repository root (schema `https://coderabbit.ai/integrations/schema.v2.json`); the file wins over the repository and organization settings in the CodeRabbit UI (only organization global overrides rank above it), so change it here, not in the UI. `@coderabbitai configuration` in a pull request prints the resolved configuration with the source of each value. Its review is advice: CI and a human reviewer decide the merge, and CodeRabbit is not a required check.

| Setting | Value | Why |
| --- | --- | --- |
| `language`, `profile` | `en-US`, `chill` | the project is in English; content pull requests touch hundreds of files, so only real issues are reported |
| `auto_review` | non-draft pull requests on any base branch (`base_branches: [".*"]`, so stacked parts are reviewed), incremental on each push; skipped when the title has `[WIP]` or `[skip review]` | review once the author asks for it |
| `path_filters` | skip `dist/`, `vendor/`, `__pycache__/`; keep `package-lock.json` for `osvScanner` | omit generated or downloaded files while retaining resolved dependencies for security scanning |
| `path_instructions` | per area: lessons, Python lessons, engines and sandbox, verify, shared, UI layers, tokens, workflows, `netlify.toml`, docs | the project rules that apply to each folder |
| `pre_merge_checks` | title in conventional commit format, description present, two custom checks (lessons listed in `CURRICULUM.md`, new track registered everywhere), all as warnings; docstring coverage off | the checks CI cannot express; docs sync stays in `.github/workflows/docs-sync.yml` |
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
| `track.json`, a new track or a hidden/shown track | `README.md` tracks table, `CURRICULUM.md`, `CONTENT_GUIDE.md` |
| an engine, its `registry.ts`, test globals or installed libraries | `CONTENT_GUIDE.md` (globals, versions), `ARCHITECTURE.md` (engine sections) |
| `src/sandbox/`, `sandbox.html`, the runner | `ARCHITECTURE.md` |
| a slice in `app`, `pages`, `features`, `entities`, `shared` | `ARCHITECTURE.md`, `.claude/CLAUDE.md` source map |
| routing, state or storage | `ARCHITECTURE.md` "Routing" / "State and storage", `.claude/CLAUDE.md` |
| motion, scene, tokens, accents | `.claude/CLAUDE.md` "Motion and the ambient scene" / "UI and styling", `.claude/specs/` |
| `src/verify/` | `CONTENT_GUIDE.md` "Verification", `.claude/CLAUDE.md` commands |
| `package.json` scripts, `vite.config.ts`, `plugins/`, `scripts/`, `index.html` | `README.md` "Run", `.claude/CLAUDE.md` "Commands" |
| `.claude/settings.json`, `.claude/hooks/` | this file, "Harness" |
| `.github/`, `netlify.toml`, `.nvmrc`, `.gitleaksignore` | this file, "CI and deploy"; `CI_SECURITY.md` for the reason behind each control; `README.md` "Requirements" for the Node version |
| `eslint.config.js`, `pyproject.toml`, `tests/python/` | this file, "Checks before a pull request"; `README.md`; `.claude/CLAUDE.md` "Commands" |
| `.coderabbit.yaml` | this file, "Code review (CodeRabbit)" |
| a rule restated in `.coderabbit.yaml` (layers, performance, accessibility, lesson contract, sandbox isolation, new track steps) | the matching `path_instructions` or `custom_checks` entry in `.coderabbit.yaml` |
| a convention or workflow rule | this file |

Tests keep part of this honest: `curriculum.test.ts` (lessons ↔ `CURRICULUM.md`), `trackPresentation.test.ts` (accents), `architecture.test.ts` (layer rules).

### Docs sync check

`.claude/hooks/docs-sync.mjs` compares the changed files against the table above. A changed file counts as covered when at least one of its documents also changed. It reads the working tree (staged, unstaged and untracked) plus commits not yet on the upstream branch (or on `main`, for a branch without upstream). Unit tests (`*.test.ts`) and lesson folders are skipped: lessons are covered by `curriculum.test.ts`.

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

The `Stop` hook runs when Claude finishes a turn. When a documented area changed without its documents, it blocks the stop once with the list of files and documents, so Claude updates the docs (or states that nothing documented changed) before handing back. Changes to `.coderabbit.yaml` are covered by an update to this file. The same set of uncovered files is reported only once; the state lives in `.git/dev-dojo-docs-sync`. Review or disable hooks with `/hooks`; personal settings go in `.claude/settings.local.json` or `~/.claude/settings.json`, never in the shared file.

Personal Claude Code rules (`~/.claude/CLAUDE.md`, memory) are not shared. Anything the whole team must follow belongs in `.claude/CLAUDE.md` or this file.
