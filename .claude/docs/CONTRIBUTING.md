# Contributing

How to set up the project, ship a change and keep the documentation in step with the code. Everything (code, content, docs, commit messages) is written in English.

## Setup

- Node.js `^22.12.0`, `^24` or `>=26` (Vitest 5 and Vite 8 requirement) and npm.
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
| a convention or workflow rule | this file |

Tests keep part of this honest: `curriculum.test.ts` (lessons ↔ `CURRICULUM.md`), `trackPresentation.test.ts` (accents), `architecture.test.ts` (layer rules).

### Docs sync check

`.claude/hooks/docs-sync.mjs` compares the changed files against the table above. A changed file counts as covered when at least one of its documents also changed. It reads the working tree (staged, unstaged and untracked) plus commits not yet on the upstream branch (or on `main`, for a branch without upstream). Unit tests (`*.test.ts`) and lesson folders are skipped: lessons are covered by `curriculum.test.ts`.

- `npm run docs:check` prints the uncovered files and exits with 1 when there are any. Run it before pushing.
- In Claude Code the same script runs as a `Stop` hook (see [Harness](#harness)).

When a change touches an area but nothing a document describes (a bug fix, an internal rename), no doc update is needed; the check is a prompt to review, not a gate.

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
