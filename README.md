# Dev Dojo

A freeCodeCamp-style learning platform for front-end, back-end and AI engineering: theory, hands-on challenges validated by automated tests, progressive hints, a solution path, reference solutions and quizzes. Everything runs in the browser, with no backend: grading, previews, a fake REST API and a fake model provider are all client-side.

## Tracks

| Track | Engine | Lessons | Covers |
| --- | --- | --- | --- |
| TypeScript | TypeScript compiler in Web Workers | 82 | types, narrowing, generics, type-level programming, tooling |
| React | React | 100 | hooks, performance, React 19, routing, data fetching, forms, testing |
| React State Management | React | 26 | Context, Zustand, Redux Toolkit, Jotai, XState, TanStack Query, state architecture |
| React Architecture | React | 41 | static pages, MVC, SPA, SSR, streaming, SSG, ISR, islands, RSC, web vitals, feature-based and hexagonal code, URL state, modular monolith, BFF, micro-frontends, monorepos, Module Federation, ADRs |
| AI Engineering | Node.js and Python (Pyodide), chosen per challenge | 122 | models, context, tools and MCP, RAG, knowledge graphs, memory, agents, harness and loops, multi-agent, evals, security, governance, agentic engineering |
| Node.js | in-browser Node runtime + Hono | 77 | runtime, async, core modules, HTTP, REST APIs, persistence, security, scaling |
| Python | Python 3.14 on Pyodide (WebAssembly) | 94 | object model, functions and closures, classes and descriptors, iterators, context managers, standard library, pattern matching, type hints, asyncio, metaprogramming, tooling |
| Vue | Vue | 44 | hidden while in progress |
| Angular | Angular | 53 | hidden while in progress |

Hidden tracks are toggled in `src/content/featureFlags.ts`. Module and lesson plans live in [CURRICULUM.md](.claude/docs/CURRICULUM.md).

## Requirements

Node.js 26 (`.nvmrc`, the version CI and Netlify use) and npm. No environment variables or API keys.

CI runs on GitHub Actions (`.github/workflows/ci.yml`) and `main` deploys to Netlify (`netlify.toml`); details in [CONTRIBUTING.md](.claude/docs/CONTRIBUTING.md#ci-and-deploy).

## Run

```bash
npm install          # also downloads the pinned Pyodide packages (postinstall)
npm run dev          # http://localhost:5173
npm run build        # production build in dist/ (needs an SPA fallback to index.html when hosted)
npm run preview      # serve the production build
npm run typecheck    # tsc --noEmit
npm run test         # unit and architecture tests
npm run verify       # validates every lesson (solution passes, starter fails, structure, curriculum)
npm run docs:check   # lists changed areas whose documents were not updated
npm run python:new -- <NN-module> <NN-lesson-id>   # scaffold a Python track lesson
npm run python:curriculum                          # regenerate the Python section of CURRICULUM.md
```

One track or lesson: `npx vitest run src/verify/<track>.test.ts`, `LESSON=<track>/<lesson> npx vitest run src/verify/<track>.test.ts`.

## Project layout

| Path | Holds |
| --- | --- |
| `src/app`, `src/pages`, `src/features`, `src/entities`, `src/shared` | the UI, in feature-sliced layers (rules enforced by `src/architecture.test.ts`) |
| `src/content/` | tracks, modules and lessons as plain files (`track.json`, `meta.json`, theory, starter, solution, tests, quiz) |
| `src/engines/` | grading engines: TypeScript, React, Vue, Angular, Node.js, Python |
| `src/sandbox/`, `sandbox.html` | the iframe where learner code runs |
| `src/verify/` | lesson verification suites |
| `plugins/` | Vite plugins: lesson content as virtual modules, Pyodide runtime |
| `scripts/` | authoring scripts (Python track scaffolding and curriculum sync) |
| `.claude/` | documentation, specs and the shared Claude Code harness |
| `.github/`, `netlify.toml` | CI workflow, Dependabot, pull request template, Netlify build, headers and SPA fallback |

## Contributing

Read [CONTRIBUTING.md](.claude/docs/CONTRIBUTING.md) before the first change: branches, commit format, checks before a pull request, and the documentation upkeep rule (every change updates the documents that describe it, in the same change).

## Documentation

All project documentation lives in [`.claude/docs/`](.claude/docs):

| Document | Read it to |
| --- | --- |
| [CONTRIBUTING.md](.claude/docs/CONTRIBUTING.md) | set up, branch, commit, check and keep the docs in step with the code; what the shared harness does |
| [ARCHITECTURE.md](.claude/docs/ARCHITECTURE.md) | understand the frontend layers, routing, state, engines and sandbox, and add a track, an engine or a UI feature |
| [CONTENT_GUIDE.md](.claude/docs/CONTENT_GUIDE.md) | write a lesson: file format, test globals per engine, fake API, fake model, installed library versions |
| [CURRICULUM.md](.claude/docs/CURRICULUM.md) | see every track, its modules and which lessons are written |
| [python-track/](.claude/docs/python-track) | plan, content standards, module specs and working agreement of the Python track |

The visual and motion spec (Portuguese) is in [`.claude/specs/`](.claude/specs). Guidance for AI agents is in [`.claude/CLAUDE.md`](.claude/CLAUDE.md); Claude Code loads it, plus the shared hooks in `.claude/settings.json`, automatically.
