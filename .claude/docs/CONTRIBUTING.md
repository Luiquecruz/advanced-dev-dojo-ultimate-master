# Contributing

How to set up the project, ship a change and keep the documentation in step with the code. Everything (code, content, docs, commit messages) is written in English.

## Setup

- Node.js 26 (pinned in `.nvmrc`, used by CI and Netlify; `nvm use` picks it up) and npm. Older versions may build the app but fail the Python verify suites: the sandboxed child process (`src/verify/pythonSandbox.ts`) passes `--disable-sigusr1`, which Node 22.13 rejects.
- `npm install`, then `npm run dev` (http://localhost:5173).
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
npm run typecheck
npm run test                                         # unit + architecture rules
npx vitest run src/verify/<track>.test.ts            # tracks whose lessons or engine changed
npm run verify                                       # every lesson, when an engine or shared runner changed
npm run build
npm run docs:check                                   # documents updated for every documented area that changed
```

Python track lessons follow their own process (scaffold, Definition of Ready and Done, WIP limits, review checklist) in [python-track/11-working-agreement.md](python-track/11-working-agreement.md).

UI, motion and scene changes are also checked in a real browser (jsdom has no layout); see `.claude/CLAUDE.md` "Tests".

## CI and deploy

### GitHub Actions (`.github/workflows/ci.yml`)

Runs on every pull request, on every push to `main` and by hand (`workflow_dispatch`). Node comes from `.nvmrc`, npm downloads are cached.

| Job | Runs | Fails the run |
| --- | --- | --- |
| `checks` | `npm run typecheck`, `npm run test`, `vite build` | yes |
| `verify` (matrix) | one job per track suite (`src/verify/<track>.test.ts`) plus `structure` (every other `src/verify/*.test.ts`: content, curriculum, track presentation, Python conventions and sandbox) and `npm run python:curriculum -- --check` | yes, each suite reports on its own (`fail-fast: false`) |
| `docs` | `docs-sync.mjs --check` against the PR base or the previous `main` commit | no, shows a warning |

A new track needs its id in the `verify` matrix and in the `structure` exclusion list of the workflow. A pushed commit on a pull request cancels the run still going for the previous one. `.github/dependabot.yml` opens a monthly grouped PR for action versions; npm dependencies are updated by hand, because lessons and `CONTENT_GUIDE.md` "Installed versions" depend on exact library versions (Pyodide is pinned on purpose). `npm audit` must stay clean: a vulnerable transitive dependency whose parent has no fixed release yet is pinned in `overrides` in `package.json`, scoped to that parent (`monaco-editor` → `dompurify`, `js-beautify`/`editorconfig` → `glob`, `minimatch`); remove the entry once the parent ships a fixed range. Never run `npm audit fix --force`: it downgrades direct dependencies (it moved `@vue/test-utils` back to 2.4).

### Netlify (`netlify.toml`)

Netlify builds `main` on every push (Git integration) with `npm run build` and publishes `dist/`. `netlify.toml` holds what the host must provide:

- SPA fallback: every path without a file rewrites to `/index.html` (routing uses `BrowserRouter`).
- `Content-Security-Policy` on `/assets/python.worker-*`, the same value as `PYTHON_WORKER_CSP` in `plugins/pythonWorkerCspPlugin.ts`; keep both in sync.
- Long-lived cache on `/assets/*` (hashed file names).

Netlify does not wait for GitHub Actions: a push to `main` deploys even when CI fails. To deploy only tested code, protect `main` on GitHub (require pull requests and the `checks` and `verify` jobs) so changes reach `main` only through a green pull request; Netlify deploy previews then show each pull request before merge.

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
| a convention or workflow rule | this file |

Tests keep part of this honest: `curriculum.test.ts` (lessons ↔ `CURRICULUM.md`), `trackPresentation.test.ts` (accents), `architecture.test.ts` (layer rules).

### Docs sync check

`.claude/hooks/docs-sync.mjs` compares the changed files against the table above. A changed file counts as covered when at least one of its documents also changed. It reads the working tree (staged, unstaged and untracked) plus commits not yet on the upstream branch (or on `main`, for a branch without upstream). Unit tests (`*.test.ts`) and lesson folders are skipped: lessons are covered by `curriculum.test.ts`.

- `npm run docs:check` prints the uncovered files and exits with 1 when there are any. Run it before pushing.
- In Claude Code the same script runs as a `Stop` hook (see [Harness](#harness)).

When a change touches an area but nothing a document describes (a bug fix, an internal rename), no doc update is needed; the check is a prompt to review, not a gate.

In CI the check runs in its own workflow (`.github/workflows/docs-sync.yml`) on every pull request and on pushes to `main`, and lists the uncovered files in the job log. When a reviewer confirms that nothing a document describes changed, add the `docs:none` label: the check still runs and prints the list, but reports a notice instead of failing, and the label records the decision on the pull request. Adding or removing the label re-runs only this workflow. Dependabot pull requests get the label automatically (`.github/dependabot.yml`), since they only bump versions. Labels need triage permission on the repository, so a contributor without it cannot waive the check on their own pull request.

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
