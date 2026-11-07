# Constela Mission

[![CI](https://github.com/Luiquecruz/constela-mission/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/Luiquecruz/constela-mission/actions/workflows/ci.yml)
[![Security](https://github.com/Luiquecruz/constela-mission/actions/workflows/security.yml/badge.svg?branch=main)](https://github.com/Luiquecruz/constela-mission/actions/workflows/security.yml)
[![OpenSSF Scorecard](https://api.scorecard.dev/projects/github.com/Luiquecruz/constela-mission/badge)](https://scorecard.dev/viewer/?uri=github.com/Luiquecruz/constela-mission)
[![CodeRabbit Reviews](https://img.shields.io/coderabbit/prs/github/Luiquecruz/constela-mission?labelColor=171717&color=FF570A&label=CodeRabbit+Reviews)](https://coderabbit.ai)

![Node.js](https://img.shields.io/badge/Node.js-26-5FA04E?logo=nodedotjs&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)
![Python](https://img.shields.io/badge/Python-3.14_on_Pyodide-3776AB?logo=python&logoColor=white)
![Vitest](https://img.shields.io/badge/Vitest-5-6E9F18?logo=vitest&logoColor=white)
![ESLint](https://img.shields.io/badge/ESLint-10-4B32C3?logo=eslint&logoColor=white)

Constela Mission (formerly Dev Dojo) is a freeCodeCamp-style learning platform for front-end, back-end and AI engineering: theory, hands-on challenges validated by automated tests, progressive hints, a solution path, reference solutions and quizzes. Everything runs in the browser, with no backend: grading, previews, a fake REST API and a fake model provider are all client-side. 853 lessons in 12 tracks, 809 of them public.

## Tracks

| Track | Engine | Lessons | Covers |
| --- | --- | --- | --- |
| TypeScript | TypeScript compiler in Web Workers | 82 | types, narrowing, generics, type-level programming, tooling |
| React | React | 100 | hooks, performance, React 19, routing, data fetching, forms, testing |
| State Management | React and Angular, by lesson | 30 | React state and query libraries, Angular signal services, NgRx SignalStore and Store, state architecture |
| Frontend Architecture | React | 41 | static pages, MVC, SPA, SSR, streaming, SSG, ISR, islands, RSC, web vitals, feature-based and hexagonal code, URL state, modular monolith, BFF, micro-frontends, monorepos, Module Federation, ADRs |
| AI Engineering | Node.js and Python (Pyodide), chosen per challenge | 122 | models, context, tools and MCP, RAG, knowledge graphs, memory, agents, harness and loops, multi-agent, evals, security, governance, agentic engineering |
| Node.js | in-browser Node runtime + Hono | 77 | runtime, async, core modules, HTTP, REST APIs, persistence, security, scaling |
| Python | Python 3.14 on Pyodide (WebAssembly) | 119 | from programming fundamentals (optional module 00) to the object model, functions and closures, classes and descriptors, iterators, context managers, standard library, pattern matching, type hints, asyncio, metaprogramming, tooling, validation with Pydantic |
| C# and .NET | C# (.NET 10 WebAssembly + Roslyn in a Web Worker); theory and quizzes, graded C# challenges in modules 00, 02–04, 08–10, 12 and 14, practice projects built locally with the .NET 10 SDK | 80 | .NET 10 and C# 14 backend development, from programming fundamentals (optional module 00) to production: runtime and language, LINQ, async, ASP.NET Core APIs, EF Core and Dapper, security, testing, background work and messaging, containers, CI/CD and observability, architecture, legacy .NET Framework and migration, integration, performance and code quality |
| System Design | Node.js, Python (Pyodide) and C# (.NET WebAssembly), chosen per challenge; theory and quizzes, graded challenges in 19 of 29 lessons | 29 | from architecture fundamentals (optional module 00) to the interview framework and capacity estimation, protocols, load balancing and rate limiting, storage engines, replication, sharding and consistent hashing, caching patterns, CAP and PACELC, consensus, message queues, sagas and the outbox, resilience, serverless pipelines, real-world case studies, vector databases and AI gateways, SLOs, multi-region design and design reviews |
| Vue | Vue | 44 | hidden while in progress |
| Angular | Angular | 52 | standalone components, signals, DI, RxJS, change detection, routing, forms, HTTP, testing, legacy Angular and SSR |
| Java and Spring Boot | theory and quizzes plus local Java backend projects (no graded challenges) | 77 | Java from zero, language fundamentals, Maven and tests, Spring Boot REST APIs, persistence with locking and Redis, security, Kafka messaging, delivery, hexagonal and modular architecture, resilience and a backend course-catalog capstone |

Hidden tracks are toggled in `src/content/featureFlags.ts`. Module and lesson plans live in [CURRICULUM.md](.claude/docs/CURRICULUM.md).

## Requirements

- Node.js 26 (`.nvmrc`, the version CI uses) and npm. `npm install` needs network: it also downloads the pinned Pyodide packages and the .NET runtime, Roslyn and reference assemblies of the C# engine.
- Python 3.14, only for the CPython test suite (`tests/python`); CI always runs it.
- No environment variables, API keys or backend.

## Run

```bash
npm install          # also downloads the pinned Pyodide packages and .NET files (postinstall)
npm run dev          # http://localhost:5173
npm run build        # production build in dist/ (needs an SPA fallback to index.html when hosted)
npm run preview      # serve the production build
```

Error monitoring: Sentry (`@sentry/react`, `src/app/monitoring/sentry.ts`) starts in the app window of production builds when `VITE_SENTRY_DSN` is set (copy `.env.example` to `.env.local`; on the host set it as a build environment variable); `npm run dev` never sends events, and `npm run build && npx vite preview` reports as `development`. It reports platform failures (React errors, engines that do not start, a sandbox that does not load, a lost WebGL context), never learner mistakes, with the waypoint, engine and language as tags, a replay on errors, 10% tracing and a **Report a problem** button on every waypoint. Events go through the same-origin tunnel `/signal`. The sandbox iframe and the workers run learner code and are not instrumented. With `SENTRY_AUTH_TOKEN` in the build environment (a secret on the host), `sentryVitePlugin` (`vite.config.ts`) uploads the source maps, deletes the `.map` files from `dist/` and creates the release (the commit SHA) with its commits and deploy; a build with and without the token emits identical JavaScript, which `npm run smoke:worker-csp` relies on. Setup and what the Sentry dashboard needs: `.claude/docs/ARCHITECTURE.md` "Error monitoring" and `.claude/docs/CONTRIBUTING.md` "Sentry".

Debug query params: `?debug=perf` shows the scene panel and `?tier=high|mid|low` forces a performance tier, e.g. `http://localhost:5173/typescript?debug=perf&tier=mid`.

## How it works

```text
Browser ─ React app (routes, curriculum, Monaco editor, progress in localStorage)
          ├─ sandbox iframe  ─ React · Vue · Angular · Node.js runtime + Hono ─ fake /api/* server, fake model
          ├─ Web Workers     ─ TypeScript compiler (static grading)
          └─ Web Worker      ─ Pyodide (CPython 3.14 in WebAssembly) ─ dojo_harness.py, dojo_ai, Pydantic wheels
```

- **Lessons are plain files** in `src/content/<track>/<module>/<lesson>/` (`meta.json`, theory, challenge, starter, solution, tests, hints, quiz). A Vite plugin serves the catalog as a virtual module and loads each lesson body on demand.
- **Grading engines** run the learner project against the lesson tests: the TypeScript compiler API, framework adapters in an iframe, an in-browser Node.js runtime, or Pyodide with a Python test harness (`@test` functions with plain `assert`).
- **Learner code is isolated.** Framework code never runs in the app window. Python runs in a fresh worker per run, with network APIs and JavaScript code generation removed, under a worker Content-Security-Policy without `'unsafe-eval'` that the host must send (CONTRIBUTING.md "Hosting"; checked on every CI run under `vite preview`).
- **No real network or models**: the fake REST API and the fake model provider are deterministic, so lessons and tests are reproducible.

Architecture, layers and engines are described in [ARCHITECTURE.md](.claude/docs/ARCHITECTURE.md).

## Tests and quality gates

```bash
npm run lint         # ESLint 10: typescript-eslint, react-hooks, jsx-a11y (lesson folders excluded)
npm run typecheck    # tsc --noEmit
npm run test         # unit and architecture tests (feature-sliced layer rules)
npm run verify       # every lesson: solution passes, starter fails, structure, curriculum
npm run docs:check   # changed areas whose documents were not updated
npm run smoke:worker-csp                               # production layout: worker CSP, SPA fallback, Pyodide and dotnet/ files
.venv/bin/python -m pytest                             # Python challenges and harness on CPython 3.14
```

One track or lesson: `npx vitest run src/verify/<track>.test.ts`, `LESSON=<track>/<lesson> npx vitest run src/verify/<track>.test.ts`. Python setup for pytest: [CONTRIBUTING.md](.claude/docs/CONTRIBUTING.md#setup).

Every pull request and every push to `main` runs on GitHub Actions:

| Workflow | Checks |
| --- | --- |
| [CI](.github/workflows/ci.yml) | lint, typecheck, unit tests and build; lesson verification per track; Python lessons on CPython (pytest); workflow lint and security audit (actionlint, zizmor); production layout smoke test (worker CSP, SPA fallback, Pyodide files) under `vite preview` |
| [Security](.github/workflows/security.yml) | `npm audit` on `main`; dependency review on pull requests; secret scan of the whole git history (gitleaks); OSV-Scanner over the npm and Python lockfiles; CodeQL for TypeScript, Python and the workflows. Also runs weekly |
| [Scorecard](.github/workflows/scorecard.yml) | OpenSSF Scorecard of the repository's security practices, behind the badge above |
| [Docs sync](.github/workflows/docs-sync.yml) | warns when a documented area changes without its documents (`docs:none` label for reviewed exceptions) |

The app is hosted on Cloudflare Workers with static assets (`wrangler.jsonc`, `worker/index.ts`, `public/_headers`), deployed by Workers Builds through its Git integration; CI holds no deploy token. The gate is branch protection: only a pull request whose required checks passed reaches `main`. Details, branch protection settings and the reasons behind each control in [CONTRIBUTING.md](.claude/docs/CONTRIBUTING.md#ci-and-deploy) and [CI_SECURITY.md](.claude/docs/CI_SECURITY.md).

## Authoring scripts

```bash
npm run python:new -- <NN-module> <NN-lesson-id>   # scaffold a Python track lesson
npm run python:curriculum                          # regenerate the Python section of CURRICULUM.md
npm run python:vendor                              # download and verify the pinned Pyodide packages
npm run csharp:vendor                              # download, verify and assemble the C# engine's .NET files (-- --check to verify)
```

## Project layout

| Path | Holds |
| --- | --- |
| `src/app`, `src/pages`, `src/features`, `src/entities`, `src/shared` | the UI, in feature-sliced layers (rules enforced by `src/architecture.test.ts`) |
| `src/content/` | tracks, modules and lessons as plain files (`track.json`, `meta.json`, theory, starter, solution, tests, quiz) |
| `src/engines/` | grading engines: TypeScript, React, Vue, Angular, Node.js, Python, C# |
| `src/sandbox/`, `sandbox.html` | the iframe where learner code runs |
| `src/verify/` | lesson verification suites |
| `tests/python/` | the CPython test suite: lessons and harness under pytest, with its hashed lockfile |
| `plugins/` | Vite plugins: lesson content as virtual modules, Pyodide runtime, .NET runtime (`dotnet/`), worker CSP |
| `scripts/` | authoring and maintenance scripts (Python lesson scaffolding, curriculum sync, Pyodide packages, .NET files for the C# engine with its Webcil converter, CSP smoke test) |
| `vendor/pyodide-packages/` | `manifest.json` of the Pyodide packages; the wheels are downloaded on install and git-ignored |
| `vendor/dotnet/` | `manifest.json` of the C# engine's files (pinned package and runtime hashes, served file hashes, the version folder they are served under, Brotli sizes against the 8.5 MiB budget); the files (Webcil `.wasm`, no `.dll`) are assembled on install and git-ignored |
| `.claude/` | documentation, specs and the shared Claude Code harness |
| `.github/` | workflows, Dependabot, pull request template, CODEOWNERS |
| `.coderabbit.yaml` | CodeRabbit review configuration (path instructions, pre-merge checks, tools) |

## Limitations

- Lessons that use the fake model (`dojo_ai`) are graded only under Pyodide; the CPython suite skips them.
- A synchronous infinite loop in Python cannot be interrupted inside Pyodide: the worker is terminated and only that test fails.
- Progress lives in the browser (`localStorage`); there are no accounts or sync between devices.
- Vue remains hidden. Angular and Java and Spring Boot are public; the Angular six planned follow-up lessons are listed in [the release audit](.claude/docs/angular-release-audit.md).

## Security

Report vulnerabilities privately, as described in [SECURITY.md](SECURITY.md).

## Contributing

Read [CONTRIBUTING.md](.claude/docs/CONTRIBUTING.md) before the first change: branches, commit format, checks before a pull request, and the documentation upkeep rule (every change updates the documents that describe it, in the same change).

## Documentation

All project documentation lives in [`.claude/docs/`](.claude/docs):

| Document | Read it to |
| --- | --- |
| [CONTRIBUTING.md](.claude/docs/CONTRIBUTING.md) | set up, branch, commit, check and keep the docs in step with the code; CI, deploy and the shared harness |
| [CI_SECURITY.md](.claude/docs/CI_SECURITY.md) | understand why each CI/CD security control exists, what it protects against and what was considered and left out |
| [ARCHITECTURE.md](.claude/docs/ARCHITECTURE.md) | understand the frontend layers, routing, state, engines and sandbox, and add a track, an engine or a UI feature |
| [CONTENT_GUIDE.md](.claude/docs/CONTENT_GUIDE.md) | write a lesson: file format, test globals per engine, fake API, fake model, installed library versions |
| [CURRICULUM.md](.claude/docs/CURRICULUM.md) | see every track, its modules and which lessons are written |
| [python-track/](.claude/docs/python-track) | plan, content standards, module specs and working agreement of the Python track |

The visual and motion spec (Portuguese) is in [`.claude/specs/`](.claude/specs). Guidance for AI agents is in [`.claude/CLAUDE.md`](.claude/CLAUDE.md); Claude Code loads it, plus the shared hooks in `.claude/settings.json`, automatically.
