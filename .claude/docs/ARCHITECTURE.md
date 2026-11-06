# Architecture and Adding a Track

This document describes how Constela Mission is built and the step-by-step pattern to add a new track (for example Svelte, Solid or Python-in-the-browser). For the lesson file format see [CONTENT_GUIDE.md](CONTENT_GUIDE.md); for the lesson plan see [CURRICULUM.md](CURRICULUM.md). All project docs live in `.claude/docs/`.

## Overview

```
src/
├── main.tsx             Entry: mounts App and the Tailwind stylesheet
├── app/                 Composition root: App, routing adapter (route → layers, motion, scene), ActivityShell, styles.css
├── pages/               One screen per route: home/HomePage, track/TrackPage, lesson/LessonRoute (lazy LessonPage)
├── features/            User-facing capabilities, each with an index.ts public API
│   ├── lesson/          LessonPanel, Quiz, CodeEditor (Monaco), PreviewFrame, runner (grading bridge)
│   ├── curriculum/      ModuleList, CurriculumDrawer, CurriculumPanel (frosted panel + glow border)
│   ├── path-carousel/   3D path carousel, PathCard, tilt adapter
│   └── ambient-scene/   AmbientScene host (lazy WebGL scene) and the ?debug=perf overlay
├── entities/            Domain state and domain widgets
│   ├── progress/        progress store (localStorage), isLessonComplete, summarizeTrack
│   └── track/           TrackLogo
├── shared/              Building blocks with no course knowledge
│   ├── ui/              classNames, icons, ProgressBar, Markdown, BrandMark, GlowBorder
│   ├── motion/          motion coordinator (state machine), FLIP, tilt, gyro, carousel drag, useMotionState
│   ├── scene/           persistent Three.js ambient scene (particles, grid, shaders)
│   ├── capabilities/    device detection and performance tiers
│   ├── design/          tokens.css: Tailwind @theme tokens, registered properties, per-track accents
│   ├── routing/         route parsing on top of react-router, link paths
│   └── lib/             small React hooks (useMediaQuery)
├── content/
│   ├── index.ts         Public API for the app: catalog (tracks, modules, lesson entries), loadLesson, LANGUAGES
│   ├── allContent.ts    Full tracks built synchronously from an eager glob, for src/verify only
│   ├── loader.ts        buildTracks: tracks → modules → lessons → challenge variants; splitCatalog, restoreLesson
│   ├── virtual.d.ts     Types of the virtual:dojo-content modules
│   ├── languages.ts     LANGUAGES registry for multi-language tracks (language → label, engine)
│   ├── types.ts         Track, Lesson, Challenge, EngineId, LanguageId...
│   └── <track>/         track.json (declares its engine or languages) + <NN-module>/module.json + <NN-lesson>/...
├── engines/
│   ├── shared/          Engine-agnostic runtime: compiler, module loader, test runner, expect, fake API, fake model
│   ├── typescript/      Static engine: TypeScript compiler API in Web Workers (type/runtime/pattern tests)
│   ├── react/           Framework adapter: module registry, Testing Library scope, preview renderer
│   ├── vue/             Framework adapter + SFC compiler
│   └── angular/         Framework adapter + JIT transform for signal APIs
├── sandbox/             sandbox.html entry: loads one framework engine inside an iframe
├── verify/              Vitest suites that validate every lesson (solution passes, starter fails)
└── ../plugins/          contentPlugin: Vite plugin serving the catalog and one lazy module per lesson
└── architecture.test.ts Enforces the layer rules below
```

## Frontend architecture

The UI follows feature-sliced design: code is grouped by what it does for the learner, and dependencies only point down.

```
app ──► pages ──► features ──► entities ──► shared
 │        │          │            │
 └────────┴──────────┴────────────┴──► domain (content, engines, sandbox)    shared never imports the domain
```

| Layer | Responsibility | Rules |
| --- | --- | --- |
| `app` | Wires everything: chooses the page for the route, keeps the base layer and the activity shell mounted, drives the motion coordinator and the scene target | May import anything |
| `pages` | Compose features and entities into one screen; own screen-level state (tabs, test report, console) | No page imports another page |
| `features` | One capability each, with its own components, hooks and logic | No feature imports another feature; others reach it through its `index.ts` |
| `entities` | Domain state and the small widgets that render it | Same isolation as features |
| `shared` | Generic UI, motion, scene, capabilities, design tokens, routing | Imports only `shared`; no course knowledge |

Conventions:

- Imports use the `@/` alias (configured in `tsconfig.json` and `vite.config.ts`). Relative imports are only for files of the same slice.
- A slice's `index.ts` lists its public API with explicit named exports. Shared modules are imported by their path (`@/shared/ui/icons`).
- A type used by several layers lives in the lowest one (`SceneTarget` is in `shared/scene/types.ts`, not in the app router).
- `src/architecture.test.ts` checks every import against these rules; `npm run test` fails on a violation.

### Data flow

```
history change ─► useRoute (shared/routing) ─► useMotionRouting (app/routing)
                                               ├─► layers: base page + optional activity (React state)
                                               ├─► motionCoordinator.go() ─► FLIP / view transition ─► MotionState
                                               └─► sceneTargetFor(MotionState, route) ─► AmbientScene ─► SceneAPI
learner actions ─► progress.* (entities/progress) ─► localStorage + useProgress subscribers ─► summarizeTrack (derived)
```

### Routing

`src/main.tsx` wraps `App` in react-router's `BrowserRouter` (`basename` = `import.meta.env.BASE_URL`, `useTransitions={false}` so a navigation commits synchronously, which the motion adapter and the `flushSync` inside the base page view transition rely on). Routes are clean paths: `/`, `/<track>`, `/<track>/<lesson>`.

- `shared/routing/route.ts` is the only module that knows the URL shape: `parseRoute` matches the pathname with `matchPath`, `useRoute()` reads it from `useLocation()`, and `hrefTo(route)` builds the `to` of every `Link`. Navigation always goes through `<Link to={hrefTo(...)}>`; never build paths by hand.
- The router only provides the location. Layers, transitions and focus stay in `useMotionRouting` (`app/routing/router-adapter.ts`); no `<Routes>`, nested routes, loaders or layout routes, because the base page stays mounted under the activity.
- A legacy `#/<track>/<lesson>` URL is rewritten to its path with `history.replaceState` before the first render (`legacyHashRedirect`).
- Hosting: any host must serve `index.html` for unknown paths (SPA fallback); `vite` and `vite preview` already do. `sandbox.html`, `/assets/` and `/pyodide/` are real files and are never shadowed, since no track id collides with them.

### Content loading

The app never imports lesson files directly. `plugins/contentPlugin.ts` reads `src/content/<track>/**`, runs `buildTracks` and `splitCatalog`, and serves two kinds of virtual modules:

- `virtual:dojo-content`: the catalog (track meta, modules and `LessonEntry` items with `hasChallenge`/`hasQuiz`) plus `lessonLoaders`, one dynamic import per lesson. It is the only content in the initial load.
- `virtual:dojo-content/lesson/<track>/<lesson>`: the lesson body (theory, concepts, variants, quiz, resources), one chunk per lesson. Both are generated as JavaScript by `plugins/contentPlugin.ts`; every value goes through `jsLiteral` (JSON with `<`, `>`, `/`, U+2028 and U+2029 escaped), so lesson text can never close a string or a script context in the generated code.

`loadLesson(entry)` (`content/index.ts`) imports the body once and caches the promise; `restoreLesson` rebuilds `challenge` as `variants[0]`. `pages/lesson/LessonRoute.tsx` lazy-loads `LessonPage` (Monaco, engines, runner) and the lesson body in parallel, suspends on them and shows a placeholder with the lesson screen layout meanwhile (top bar, the lesson header with its real title, summary and tab outlines, skeleton lines, and an orbit loader with "Plotting course to waypoint…"), so the loaded page replaces it without a jump. After 10 seconds it adds "Still plotting course…" with a Retry (page reload); if loading the screen or the body throws, `LessonLoadBoundary` shows the same placeholder with "Signal lost" and Retry instead of unmounting the app; the `LessonPanel` header has no entrance animation for the same reason; when the coordinator focused that placeholder title, focus moves to the real `[data-activity-title]` once the page mounts. Everything outside the lesson screen works on `LessonEntry` (`isLessonComplete`, `summarizeTrack`, curriculum, carousel). In dev, a change under `src/content/<track>/` invalidates the virtual modules and reloads the page. `src/verify` builds full tracks from `content/allContent.ts` (eager glob), and `content.test.ts` checks that the served catalog matches them.

### State and storage

| State | Owner | Read with | Persisted |
| --- | --- | --- | --- |
| Route | `shared/routing/route.ts` (react-router `BrowserRouter`) | `useRoute()` | URL |
| Motion state | `shared/motion/coordinator.ts` | `useMotionState()` | no |
| Learner progress and code (passed challenges and the languages they passed in, quizzes, chosen language per track, code per lesson and language) | `entities/progress/progressStore.ts` | `useProgress()`, `progress.getState()` | `localStorage` `dev-dojo:progress:v1`, debounced 300ms |
| Screen state (tabs, report, console, carousel index) | the page component | React state | no |
| Ambient scene | `shared/scene/scene.ts` | imperative `SceneAPI` | no |

Stores are plain external stores read through `useSyncExternalStore`: no state library, no context providers. Derived values (`summarizeTrack`, `isLessonComplete`) are computed from the store, never stored.

`summarizeTrack` (`entities/progress/trackSummary.ts`) is the single source of track `done`/`total`/`percent`/`status` and of the resume lesson for the carousel card and the track page. A module marked `"optional": true` in `module.json` (`Module.optional`, `false` by default; the loader rejects a non-boolean value) counts toward `done` and `total` as a whole once the learner has started it: once a lesson of the module that has a challenge (`LessonEntry.hasChallenge`) and is not its last lesson is complete, or every lesson is. A lesson without a challenge (the quiz-only Python map `00-foundations/01-foundations-map`) and the last lesson (the challenge that doubles as the skip test) do not start it, and visits never count. So C# 00/01 `first-program`, which teaches and grades a challenge, starts C# module zero, while passing the Python map does not start Python module zero; it starts at 00/02. A learner who reads the skip rule, passes the skip test and skips the rest reaches 100% when every required lesson is done; a learner who began working through the module reaches 100% only after finishing it. `src/verify/content.test.ts` checks that only a module numbered 0 is optional, that its last lesson has a challenge and that an earlier lesson has one too (otherwise the module could never start counting). The resume lesson is the last visited lesson while it is unfinished; once it is complete, it is the next unfinished counted lesson after it, wrapping to the first one (so a started optional module is resumed after the required modules are done, and a never started one is not). The resume lesson of a fresh track is still the first lesson of the track. Per-module counts in `ModuleList` and `ModuleProgress` always include every lesson of the module; an optional module that is neither complete nor the current stage has the `ModuleProgress` state `optional` instead of `upcoming`, and in a completed track no module is `current`. `ModuleList` and the `PathCard` timeline show an `optional` tag on such modules, and the track page explains the rule in one line.

Modules are numbered for learners by their folder prefix, never by position: the loader sets `Module.number` from the prefix (`00-fundamentals` → 0, and rejects a module folder without one), and `moduleNumberLabel` (`entities/track`) renders it as two digits in `ModuleList` and the `PathCard` timeline, so the UI matches lesson text that cites "module 07" even when an optional module zero precedes module 01. The `PathCard` stage line (`stageLine` in `features/path-carousel/stageLine.ts`, unit-tested) reads `Stage <number> of <lastStageNumber>` (`TrackSummary.lastStageNumber`, the highest number of a required module), `Optional module <NN>` while the resume lesson sits in an optional module, and `All <lastStageNumber> stages done` for a completed track. Stage numbers are folder numbers, and the last one doubles as the stage count: `src/verify/content.test.ts` requires module numbers to be unique in every track and the required modules of every shown track to be numbered 1 to N without gaps (a hidden track with a backlog gap, such as Angular without `06-`, must close it before it is enabled).

### Adding UI

1. Decide the layer: a new screen goes in `pages/`, a capability used by a screen in `features/<name>/`, domain state in `entities/<name>/`, anything generic in `shared/`.
2. Export what other slices need from the slice's `index.ts`.
3. Put pure logic in plain TypeScript next to the component and cover it with a `*.test.ts` file.
4. Run `npm run test` (architecture and unit tests), `npm run typecheck` and, for interaction work, check real input in the browser.

### Two engine families

| Family | Used by | Runs in | How it grades |
| --- | --- | --- | --- |
| **Static engine** | TypeScript | Web Workers (`analysis.worker.ts`, `runtime.worker.ts`) | Type checks with the compiler API, runs plain JS with `assert`, regex pattern tests. Tests written in `tests.md`. |
| **Framework engine** | React, Vue, Angular, Node.js | Same-origin iframe (`sandbox.html?engine=<id>`) | Transpiles learner files to CommonJS, evaluates them with a module registry, runs `test()` blocks with Testing Library and a Jest-like `expect`. Tests written as a script. |
| **Python engine** | Python variants of multi-language tracks | Web Worker with Pyodide (`python.worker.ts`) | Writes the project to Pyodide's file system, imports the entry fresh for every test, runs `@test` functions from `tests.py` with plain `assert`. |
| **C# engine** | The C# track (26 lessons with a challenge, modules 00, 02–04, 08–10, 12 and 14; `fixtures/basic/` is graded too) | Web Worker with the .NET WebAssembly runtime (`csharp.worker.ts`) | Compiles the project and `tests.cs` with Roslyn into one assembly, loads it in a collectible context and runs the `[Test("…")]` methods of `tests.cs` with `Assert`. |

Pick the **framework engine** for anything that renders UI or needs a DOM, or that needs a module registry and a runtime (Node.js). Pick the **static engine** pattern for languages or topics where type checking or pure functions are the subject.

### The Node.js engine

`engines/node/` reuses the framework pipeline with a headless adapter:

- `runtime/` implements Node built-ins in the browser: `process` (env, argv, exit, nextTick, signals), `timers` (Node handles with `ref`/`unref`, tracked so a run knows when the event loop is empty), `fs` (in-memory volume rooted at `/`, cwd `/app`), `path` (POSIX), `http` (in-memory servers on virtual ports, `IncomingMessage`/`ServerResponse` as real streams), `crypto` (pure JS SHA-256/SHA-1, HMAC, PBKDF2), `util`, `assert`, `os`, `url`. `events`, `buffer` and `stream` come from the npm packages `events`, `buffer` and `readable-stream`, imported by file path (`events/events.js`, `buffer/index.js`) so Vitest uses the same code as the browser instead of Node's built-ins.
- `runtime/index.ts`: `installNodeFetch` routes `fetch('http://localhost:<port>')` to listening in-memory servers (other URLs fall through to the fake API), `resetNodeRuntime` clears files, env, listeners, timers and servers, and `modulePrelude` binds `process`, `Buffer`, the timer globals, `__filename` and `__dirname` at the top of every learner module.
- `registry.ts` exposes each built-in as `name` and `node:name` (`moduleOf` turns namespaces and instances into CommonJS-friendly objects), plus Hono, `@hono/zod-validator`, Zod and the fake model (`@dojo/ai`, `@dojo/ai/testing`).
- `ai.ts`: the engine's instance of the fake model provider (`engines/shared/fakeModel.ts`, `createFakeModelProvider`). Its delays run on runtime timers, so a program waiting for a reply keeps the **Run** alive. The provider core is engine-agnostic so a future Python engine can expose the same model.
- `adapter.ts`: `nodeAdapter` (test scope: `request`, `writeFiles`, `captureLogs`, `fs`, `process`, `Buffer`, `fakeModel`, `respond`, `forEachSeed`; the runtime and the fake model are reset before and after every test) and `runNodeProgram`, used by the sandbox `run` mode behind the lesson **Run** button.

`content/loader.ts` treats `typescript` and `node` as headless engines (no preview by default); `features/lesson/runner.ts` decides which engines get a **Run** button (`canRunProgram`) and runs them (`runProgram`: TypeScript in a worker, Node.js in a `mode=run` sandbox iframe that streams `console` messages back and answers `run-complete`).

### The Python engine

`engines/python/` runs CPython 3.14 compiled to WebAssembly (Pyodide, pinned in `package.json`):

- `engine.ts`: `createPythonEngine(pyodide)` registers the JS fake model provider as the `_dojo_ai_bridge` module, writes the Python runtime (`runtime/dojo_ai/`, `runtime/dojo_harness.py`, imported with `?raw`) to `/dojo` and returns `runTests` and `runProgram`. The same function serves the browser worker and Node verification.
- `runtime/dojo_ai/`: the Python face of the fake model (`create_model`, `count_tokens`, `ModelError`, `testing.fake_model`, `respond`, `for_each_seed`), converting dicts to JS objects and back; `python.test.ts` fails when the JS provider gains a builder or method the wrapper lacks.
- `runtime/dojo_harness.py`: writes learner files to `/app`, checks syntax (a `SyntaxError` becomes the report's `compileError`), and for every test unloads the learner modules, imports the entry, executes `tests.py` with the test globals and runs the test at that index (4 s `asyncio.wait_for`). Failed asserts are described from the AST of the assert statement and the frame's variables. `run_program` executes the entry as `__main__`, turning `asyncio.run(main())` into a task it awaits, and returns the exit code.
- `python.worker.ts` + `browserClient.ts`: one long-lived worker loads Pyodide from `<base>pyodide/` (served and emitted by `plugins/pyodidePlugin.ts`); requests are queued, and a run that exceeds its timeout terminates the worker (the only way to stop a synchronous infinite loop), so the next request starts a fresh one. `prepareEngine` (`features/lesson/runner.ts`) starts the worker when a Python challenge opens.
- `testNames.ts`: `listPythonTestNames` reads `@test("…")` names for the test list shown before the first run.

`features/lesson/runner.ts` routes `python` to the worker in `testNamesFor`, `gradeChallenge` and `runProgram`; Monaco highlights `.py` files (no language service).

### The C# engine

Status, pins, served files and the Brotli budget, the Netlify build cache, the security findings and open items are in [csharp-engine.md](csharp-engine.md); how to write a C# challenge is in CONTENT_GUIDE.md "C# engine".

`engines/csharp/` runs .NET 10 (Mono interpreter, single-threaded `browser-wasm` runtime pack) with Roslyn 5.9, all assembled into `vendor/dotnet/` by `scripts/csharp-track/vendor-dotnet.mjs` (pinned in `vendor/dotnet/manifest.json`, CI_SECURITY.md "Dependencies") and served unchanged at `<base>dotnet/<version>/` (the manifest's hash of the served set) by `plugins/dotnetPlugin.ts`. No `.dll` is served: CoreLib, the BCL, Roslyn and the host are Webcil (`.wasm`, the format the .NET 10 SDK publishes, converted at install time by `scripts/csharp-track/WebcilConvert.cs` with the SDK pack's converter) and the reference assemblies are their PE bytes in one custom section `dojo.pe` of a minimal module (`ref/*.wasm`), so the host Brotli-compresses every file as `application/wasm` or JavaScript:

- `host/` (C#, compiled by the vendor script, never committed as a binary): `DojoHost.dll` exports `RunTests(fileNames, fileSources, testsName, tests, startAt)` and `RunProgram(fileNames, fileSources)`, both `Task<string>` (JSON report, so `await` in a test or an async `Main` yields to the event loop instead of blocking, which the single-threaded runtime refuses), and `Warm()`. It reports `start` (with the number of tests discovered, `total`)/`result` per test and `console` lines through `[JSImport("emit", "dojo-host")]`; console output goes out in events of at most 8192 characters and stops after 1,000,000 per run. `///` comments are not processed (`DocumentationMode.None`), and string literals naming `System.Reflection.Emit` or `System.Runtime.InteropServices.JavaScript` are a DOJO001 compile error. Learner files with top-level statements (a `Program.cs` demo) make the test compilation a console application whose entry point is never called. `Dojo.Testing.dll` is the test API (`[Test]`, `Assert`).
- `engine.ts`: `bootFiles` (download order: the runtime's JavaScript, then the largest file first), `dotnetConfig` (the `withConfig` boot config: every file as a `pendingDownload` whose response is the checked bytes, so the runtime starts while assemblies still arrive; every Webcil assembly as a core asset; references unwrapped by `unwrapReference` and mounted at `/ref/<name>.dll`; invariant globalization), `checkDotnetFile` (size and SHA-256 against the manifest) and `createCsharpEngine(runtime)` with `warm`, `runTests` and `runProgram`; it empties `/tmp` and restores the working directory before each run. Shared by the browser worker and Node verification.
- `csharp.worker.ts`: fetches every runtime file from `<base>dotnet/<version>/` in parallel (one HTTP/2 connection, `bootFiles` order, the runtime's own files with `priority: 'high'`) and checks each file against the manifest pins **bundled into the worker script** (a tampered `dotnet/` folder cannot ship its own manifest), imports `dotnet.js`, `dotnet.native.js` and `dotnet.runtime.js` from those immutable URLs as soon as their own bytes are checked, sets `dotnetSidecar` (the worker is the runtime's host, not a pthread), starts the runtime while the assemblies are still arriving (each reaches it only after its check), boots, warms Roslyn and the harness with a throwaway test project, then applies `lockdown.ts` before any learner code. It listens with `addEventListener`, answers `failed` to a request that arrives before the boot, and reports an `ExitStatus` (stack overflow, `Environment.Exit`) as "the program exited".
- `lockdown.ts` (on top of `engines/shared/workerLockdown.ts`, shared with Python): learner C# can bind and call any function at a dotted path under `globalThis`, the runtime's `INTERNAL` object or a registered module (`JSFunctionBinding.BindJSFunction` and `InvokeJS`, reachable from a `DynamicMethod`; `JSHost.GlobalThis` is built on the same bindings). The runtime turns every such binding into `fn.bind(owner)` and calls `bind` nowhere else after boot, so `blockFunctionBinding` makes `Function.prototype.bind` throw once the warm-up has bound the host's `emit`: no new binding can be made. Behind that boundary the network globals, the runtime's `getDotnetRuntime`/`dotnetDebugger`/`dotnetSidecar`, the worker globals in `DOTNET_WORKER_GLOBALS` (`postMessage`, `close`, `onmessage`, `navigator`, the file system handles, `OffscreenCanvas`, `Notification`) and every code generator are removed or replaced, and `lockDownDotnetInternals` removes `INTERNAL.require`, `INTERNAL.process` (the Node `process` in verification), `dynamic_import` (`JSHost.ImportAsync`), `loadLazyAssembly`, `loadSatelliteAssemblies` and every `http_wasm_*`/`ws_*` binding. `System.Net.Http` is not shipped, so `HttpClient` neither compiles nor loads.
- Verification (`src/verify/csharpSandbox.ts`, `csharpGrader()` in `graders.ts`): the same boot, hash check (against the pins bundled into the child) and lock-down run in a Node child under the permission model (read access to `vendor/dotnet/` and the bundled child script only, empty environment, heap and wasm memory caps), plus a `resolve` hook that refuses every import and an allow-list `process`. A fresh child per test run and Run demo, one prewarmed spare (`DOJO_CSHARP_PREWARM` raises it; more made the Python sandbox tests time out when both files run at once), the same 6 s per-test kill and resume. `csharpSandbox.test.ts` covers the fixture (solution passes, starter fails), `///` comments, the console cap, loop kills, a tampered file with a forged served manifest, lock-down probes written in C# (DOJO001, `JSHost.GlobalThis` and `ImportAsync` failing, and the `DynamicMethod` probe `fixtures/probes/JsCall.cs` failing to bind `globalThis.*`, `INTERNAL.*` and `dojo-host`), fresh state per run and the escape scan `csharpEscapeScan.ts`, which walks every object reachable by property names from `globalThis` and `INTERNAL` and must find no original code generator, network global, runtime internal loader or Node host object.
- `browserClient.ts`: the Python protocol with `crypto.randomUUID()` request ids. Every grading run and every Run uses a **fresh worker**, so MEMFS writes, static fields of the BCL and `AppContext` switches never reach the next run; one spare is booted and warmed after each run (never during one), dropped when its boot fails, and terminated by `disposeCsharp` when the learner leaves C# challenges. The first spare is a prefetch: `warmUpCsharp` starts it with `requestIdleCallback` (at the latest after 3 s; a short timeout in Safari), and not at all with Save-Data or a `slow-2g`/`2g`/`3g` `navigator.connection` (`mayPrefetchCsharp`), in which case the first run starts the runtime; a run cancels a prefetch still waiting. The browser HTTP cache is the only store: the URLs are versioned and immutable, so every later worker boots without network. Each test has 6 s: the worker is terminated (the only way to stop a busy loop), the test fails and the remaining tests run in a fresh worker from the next index, up to the `total` the host reported. A report counts only when its results equal the result events watched and the names listed from `tests.cs` (`reportMismatch` in `protocol.ts`). Compiling has 20 s before the first test starts; a Run has 15 s, and a worker crash during a Run is reported at once. Console lines are cut at 10,000 characters.
- `testNames.ts`: `listCsharpTestNames` reads `[Test("…")]` names (regular and verbatim strings, comments skipped) for the list shown before the first run, in the order the host runs them.
- `fixtures/basic/`: a starter, solution and `tests.cs` used by the unit tests and the browser check; not a lesson.

`features/lesson/runner.ts` routes `csharp` in `testNamesFor`, `prepareEngine` (`LessonPage` passes the engine only when the lesson has a challenge, so a theory or quiz lesson downloads nothing and a challenge lesson prefetches while the learner reads the Learn tab; `undefined` cancels the prefetch and terminates the warm C# runtime), `gradeChallenge`, `runProgram` and `canRunProgram`; Monaco highlights `.cs` files (no language service). Measured in Chromium on `npm run dev` (localhost, uncompressed): boot 0.19–0.27 s, warm-up 0.6–1.1 s in the background, first learner run in a warmed worker 0.22–0.26 s, a further compile and run in the same worker 0.07–0.13 s, a stopped test costs its 6 s plus about 1 s for the next fresh worker (two stopped tests of the fixture: 13.8 s for the whole run).

### Framework engine pipeline

```
learner files ──► FrameworkAdapter.compileFile ──► CommonJS strings
                                                     │
tests script ──► transpile (classic JSX, adapter.testTransformers)
                                                     │
for each test:  beforeEach → evaluateProject(compiled, entry, registry) → build scope → run test → afterEach
```

- `shared/compile.ts`: `transpile()` uses TypeScript `transpileModule` (TS/TSX/JS/JSX → CommonJS, decorators enabled) and injects a loop guard into every loop. Extra AST transforms are passed through `transformers`.
- `shared/project.ts`: `compileProject()` and `evaluateProject()` implement a tiny CommonJS loader. Bare imports resolve through the adapter **registry**; relative imports resolve between project files (`.ts`, `.tsx`, `.js`, `.jsx`, `.vue`).
- `shared/testRunner.ts`: `runTests(adapter, { files, entry, tests })` evaluates the project **fresh for every test**, resets the fake API and DOM, and injects the shared globals (`expect`, `fn`, `mod`, `modules`, `require`, `source`, `sources`, `sleep`, `mockApi`, ...) plus `adapter.createScope(project)`.
- `sandbox/sandbox.ts`: picks the engine from `?engine=` (only the engines it registers: any other value, such as `constructor`, throws before anything loads), installs the loop guard and fake API, forwards `console` to the parent in preview mode, and answers `preview` / `run-tests` messages (`sandbox/protocol.ts`).
- `features/lesson/runner.ts`: the UI side. Test runs create a hidden iframe per run (`mode=test`); the preview uses a persistent iframe (`mode=preview`) that re-renders on edits.

### The `FrameworkAdapter` contract

```ts
interface FrameworkAdapter {
  registry: ModuleRegistry;                       // bare import name → module namespace (wrap with esModule())
  testFileName: string;                           // file name used to parse tests ('tests.tsx' enables JSX)
  testTransformers?: ts.TransformerFactory<ts.SourceFile>[];
  compileFile(name: string, code: string): string; // learner file → CommonJS
  createScope(project: EvaluatedProject): Record<string, unknown>; // framework test globals
  beforeEach?(): void | Promise<void>;
  afterEach?(): void | Promise<void>;
}
```

Plus one preview function per engine: `(files, entry, container) => void | Promise<void>`.

## Adding a track on an existing engine (fast path)

Most new tracks do not need a new engine. `react-state` (React State Management) runs on the React engine; a future React ecosystem track (Next.js concepts, testing, animation...) or a Vue/Angular deep dive works the same way.

1. **Libraries**: install what the lessons import and register each import path in the engine registry (`src/engines/react/registry.ts` for React). Check the package `exports` map for subpaths (`zustand/react/shallow`, `@reduxjs/toolkit/query/react`, `valtio/utils`). Run the engine's existing suite afterwards to prove nothing broke.
2. **Track folder**: `src/content/<track-id>/track.json` (see [Track presentation](#track-presentation)) with `"engine": "react"` and an `"order"` (position on the home carousel), plus one `module.json` per module.
3. **Accent**: a `[data-trail='<track-id>']` rule in `src/shared/design/tokens.css` (see [Track presentation](#track-presentation)).
4. **Verification suite**: `src/verify/<track-id>.test.ts` calling `defineChallengeSuite('<track-id>', frameworkGrader(reactAdapter))`.
5. **Plan and guide**: add the module and lesson plan to [CURRICULUM.md](CURRICULUM.md) (written lessons get `✓`) and list new libraries in [CONTENT_GUIDE.md](CONTENT_GUIDE.md).
6. **Copy that names the tracks**: update the `<meta name="description">` in `index.html` when the new track should be named there.

No change is needed in the runner, sandbox, loader, pages or features: they read the engine of each challenge (`challenge.engine`, the track engine for single-language tracks), and the home carousel, curriculum, progress, stats, logo and ambient scene pick the track up from `track.json` and its accent rule.

## Multi-language challenges

Generic tracks (AI Engineering today, more later) are not tied to one language: the learner picks the language of each challenge, and the same lesson ships one challenge per language. Registered languages: Node.js (`node` engine) and Python (`python` engine).

### Content

```
src/content/<track>/track.json                      { "languages": ["node", "python"], ... } instead of "engine"
src/content/<track>/<NN-module>/<NN-lesson>/
├── meta.json                                       "entry" may be a string or { "<language>": "<file>" }
├── theory.md, concepts.json, quiz.json             shared by every language
├── challenge.md, hints.md, approach.md             shared defaults
└── variants/<language>/
    ├── starter.<ext> or starter/                   required: a variant exists only when it has a starter
    ├── solution.<ext> or solution/
    ├── tests.<ext>                                  the test format of that language's engine
    └── challenge.md, hints.md, approach.md          optional overrides (names that differ per language)
```

- A track declares either `engine` (single language, unchanged) or `languages` (ids from `LANGUAGES` in `src/content/languages.ts`). The track engine becomes the engine of its first language; an unknown language id fails the build.
- In a multi-language track, challenge files outside `variants/` are ignored. A lesson offers only the languages it ships, so a Python variant can be added lesson by lesson.

### Model

- `buildTracks` (`src/content/loader.ts`) gives every lesson `variants: Challenge[]`: one per language in track order, or the single lesson-level challenge for single-language tracks (`language` undefined). `lesson.challenge` is `variants[0]`, the default.
- Each `Challenge` carries its `engine` (and `language`). Everything that grades, runs, previews or configures Monaco uses `challenge.engine`, never `track.engine` directly.

### Progress

- A lesson counts as complete when its challenge passed in **any** language (`challenges[lessonKey]`), so switching languages never loses completion.
- `challengeLanguages[lessonKey][language]` records every language that passed (per-language check marks).
- `language[trackId]` remembers the language chosen in that track.
- Learner code is stored per lesson and language: `codeKeyFor(lessonKey, language)` returns `<lessonKey>#<language>` (or `lessonKey` for single-language lessons).
- The fields are additive: older saved progress loads with empty defaults, so the storage key stays `dev-dojo:progress:v1` without a migration.

### UI

`LessonPage` keeps the selected language in state (initialised from the track's remembered language when the lesson ships it, otherwise the first variant). `LanguageSwitch` (`features/lesson/LanguageSwitch.tsx`) appears in the editor toolbar only when the lesson has more than one variant; each option shows a check when that language passed. Switching loads that language's saved code or starter, opens its entry file, clears the report and console, and reloads the preview. `LessonPanel` receives the active `challenge`, so instructions, tests, hints and the solution path follow the language.

### Verification

`defineChallengeSuite(trackId, grader, language?)` verifies the variants of one language (and, when a challenge declares a `run` file and the grader can run programs, that the solution's demo runs cleanly). Graders live in `src/verify/graders.ts`: `frameworkGrader(adapter)` for the JavaScript framework engines and `pythonGrader()` (Pyodide in Node, loaded once per suite). A multi-language track calls it once per language (`defineChallengeSuite('ai-engineering', frameworkGrader(nodeAdapter), 'node')` and `defineChallengeSuite('ai-engineering', pythonGrader(), 'python')`). `src/verify/content.test.ts` checks that every declared language is registered and that each variant uses its language's engine.

### Adding a language (Python is the worked example)

1. Build the engine (see [Adding a framework track](#adding-a-framework-track-step-by-step), [Adding a static track](#adding-a-static-non-dom-track) or [The Python engine](#the-python-engine)): a runtime that can stop runaway code (a worker for anything that cannot inject a loop guard), a test runner and the fake model exposed in that language.
2. Register the engine (`EngineId`, `DEFAULT_ENTRY` such as `{ py: 'main.py' }`, sandbox, runner, `monacoSetup.ts` language for the file extension).
3. Add the language to `LANGUAGES` (`python: { label: 'Python', engine: 'python' }`).
4. List it in the `languages` of the tracks that will offer it and add `variants/python/` to their lessons.
5. Add `defineChallengeSuite('<track>', <language>Grader(), '<language>')` to the track's verify suite (`pythonGrader()` for Python).

A worker engine (one that runs a downloaded language runtime) touches the same places. Python and C# side by side:

| Step | Python | C# |
| --- | --- | --- |
| Runtime files | `node_modules/pyodide` plus wheels from `scripts/python-track/vendor-packages.mjs` (`vendor/pyodide-packages/`) | `scripts/csharp-track/vendor-dotnet.mjs` (`vendor/dotnet/`, host compiled with `csc.dll`); both run as `postinstall`, both have `--check` |
| Serving | `plugins/pyodidePlugin.ts` (`pyodide/`, `dojo-pyodide` meta) | `plugins/dotnetPlugin.ts` (`dotnet/`, `dojo-dotnet` meta) |
| Worker CSP | `CSP_WORKERS` in `plugins/pythonWorkerCspPlugin.ts` and a `netlify.toml` header per worker (`assets/python.worker-*`, `assets/csharp.worker-*`), checked by `scripts/python-track/check-worker-csp.mjs` | same |
| Engine | `engines/python/` (worker, `browserClient.ts`, `lockdown.ts`, `protocol.ts`, `testNames.ts`, Python harness) | `engines/csharp/` (same files, `engine.ts`, C# `host/`); both lock-downs build on `engines/shared/workerLockdown.ts` |
| Registration | `EngineId`, `DEFAULT_ENTRY.python = { py: 'main.py' }`, `runner.ts`, `monacoSetup.ts`, `content.test.ts` engine list | `EngineId`, `DEFAULT_ENTRY.csharp = { cs: 'Program.cs' }`, the same files |
| Language | `LANGUAGES.python`, `variants/python/` in multi-language tracks; also the engine of the Python track | not in `LANGUAGES`; a single-language track declares `"engine": "csharp"` |
| Verification | `verify/pythonSandbox.ts`, `pythonGrader()`, `pythonSandbox.test.ts`, `pythonEscapeScan.py` | `verify/csharpSandbox.ts`, `csharpGrader()`, `csharpSandbox.test.ts`, `csharpEscapeScan.ts` |
| Ownership (`.github/CODEOWNERS`) | `lockdown.ts`, the CSP plugin, `verify/pythonSandbox*.ts` | `lockdown.ts`, `csharp.worker.ts`, `host/`, `verify/csharpSandbox*.ts`, `verify/csharpEscapeScan.ts`, `vendor-dotnet.mjs`, `WebcilConvert.cs`, `plugins/netlify-dotnet-cache/`, `vendor/dotnet/manifest.json`, `dotnetPlugin.ts` |

## Track presentation

Everything the UI shows about a track comes from two places:

| Where | Field | Used for |
| --- | --- | --- |
| `track.json` | `title`, `description`, `version` | carousel card, curriculum header, breadcrumbs |
| `entities/track/trackGlyphs.ts` | `TRACK_GLYPHS[<id>]`: `concept`, `lines` (SVG paths), `stars` (vertices) and `key` (the bright star), on a 48 × 48 canvas kept 6 units from the edges | the track logo (`entities/track/TrackLogo.tsx`): the concept constellation drawn on a blueprint (grid paper, dashed construction circle, registration marks) in the track accent, the same frame and stroke for every track; `trackGlyphs.test.ts` fails for a track without a glyph or a point outside the margin |
| `track.json` | `monogram` (1–3 characters, required) | fallback of the track logo when a track has no glyph |
| `track.json` | `shortTitle` (optional) | the giant backdrop word on the home page; set it when `title` is longer than about 10 characters (`react-state` uses `"State"`) |
| `track.json` | `order` | position in the home carousel and the track list |
| `tokens.css` | `[data-trail='<id>'] { --accent; --accent-rgb }` | every accent: buttons, borders, glow, scene particles, headline highlight |
| lessons | count of lessons plus coding challenges | the track mass (`entities/track/trackMass.ts`): 0 to 1 relative to the track with the most content; `sceneTargetFor` passes it to the scene, where the grid well (`uMass` in `shared/scene/shaders/grid.vert.glsl`) sinks deeper (depth follows mass^1.6, so light and heavy tracks differ clearly) and wider (radius up to 17 units, so on desktop the walls show beside and below the carousel and the curriculum panel), with slightly brighter rings inside the well and no lines in the first 4 to 16 units in front of the camera (they would cross the footer text); carousel cards stay at `bg-panel/96` so the grid and the backdrop word never show through their text, and a `void` gradient sits under the home footer, eased with `MASS_RATE` and snapped under reduced motion. Without a track (home before a card is active) the mass is 0.5 |

Brand and vocabulary: the product is **Constela Mission**, a space-mission theme over the starfield and the gravity-well grid. The mark (`shared/ui/BrandMark.tsx`, mirrored by `public/logo.svg`, also the favicon) is an eight-point guiding star (long vertical arms, shorter horizontal ones, short diagonals) inside a tilted orbit with a probe on it and two distant stars, with no tile: a radial halo (dark `void`/`panel` fading to transparent) sits behind it like a soft drop shadow, so it blends into dark pages and stays legible on light browser tabs. UI copy uses the mission vocabulary while code, content files and documentation keep the technical names:

| Code and docs | UI copy |
| --- | --- |
| track | mission |
| module | stage (`Stage 2 of 6`, `optional stage`) |
| lesson | waypoint (`Next waypoint`, `Waypoint reached.`, `12/41 waypoints reached`) |
| curriculum (track page, drawer) | star map |
| Learn tab | Briefing |
| challenge, quiz | unchanged |

The storage key stays `dev-dojo:progress:v1` so saved progress survives the rename. Internal `dojo` identifiers are kept on purpose because they are API surface, pinned or compared by CI: `@dojo/ai`, `dojo_ai`, `dojo_harness.py`, `DojoHost`/`Dojo.Testing` and the C# `using Dojo;` namespace (hashed into `vendor/dotnet/manifest.json`), `virtual:dojo-content`, the `dojo-pyodide`/`dojo-dotnet` meta tags (the deploy smoke test reads them), the `DOJO_*` variables of `tests/python` and the `.dojo-preview-*` classes of `sandbox.html`. The repository (`advanced-dev-dojo-ultimate-master`) and the Sentry project keep their names. New identifiers use `constela` (package `constela-mission`, Monaco theme `constela`, docs-sync state `constela-docs-sync`).

Visibility: `src/content/featureFlags.ts` (`TRACK_FLAGS`) hides a track from learners when its flag is `false` (code only, no UI or env toggle; currently `vue` and `angular`). The UI reads `availableTracks` / `availableTrackById` from `@/content`, so a disabled track leaves the home carousel and stats and its routes answer "Page not found". `tracks` / `trackById` still hold every track, so content, curriculum and verification suites keep covering disabled tracks. Flip the flag to `true` (or remove it) to publish the track.

### Track logos

Every track has a blueprint logo, and every new track **must** ship one in the same change (`trackGlyphs.test.ts` fails without it; the monogram only covers a missing glyph at runtime). `TrackLogo` draws the shared frame; a track adds only its glyph to `TRACK_GLYPHS` in `src/entities/track/trackGlyphs.ts`. Rules:

- **Shared frame, never per track.** Rounded tile in the track accent (`bg-accent/10`, `ring-accent/30`), 6-unit grid paper, dashed construction circle (r 17.5) and four registration marks. A glyph never draws its own frame, background, fill or color: everything is `currentColor` (the accent) except the key star.
- **Constellation line art.** `lines` are SVG paths stroked at 1.35 with round caps and joins, no fills; `stars` (r 1.6) sit on the vertices and ends of those lines; exactly one `key` star (bright `ink` core with an accent halo) marks the focal point.
- **Canvas.** 48 × 48 with every coordinate between 6 and 42 (the test checks it); arcs use non-negative x-axis rotations so the check can parse them. Keep 3–7 stars so the glyph reads at 28–32 px.
- **Subject.** A language or framework track evokes its official logo about 30% of the way (TypeScript as two overlapping rounded squares of its badge, a union and its intersection, React as an atom of three orbits, Node.js as a hexagon around the event loop, Python as two interlocked serpents, C# as a sharp sign grid, Vue as converging chevrons, Angular as a shield with an A) without copying it: no official colors, shapes redrawn as constellation lines, and no initials or wordmarks, which read as a monogram instead of a logo. A concept track draws its concept (Frontend Architecture as stacked decision layers, React State Management as a state cycle, AI Engineering as generative sparkles).
- **Trace.** `TrackLogo animate` replays a trace each time it turns on: a light beam (`logo-trace`, `stroke-ink` over `pathLength={1}` copies of the lines) runs along the constellation while the key star halo pulses (`logo-pulse`), both `--dur-trace` (500 ms) with `--ease-out`, starting and ending on the static logo; reduced motion skips it. `delayMs` delays only the trace played on mount, so it lands after the entrance motion: the active carousel card (`animate={active}`, 850 ms on load, none when the carousel moves), the track page header (450 ms) and the star map drawer (160 ms). Glyph `lines` therefore need no extra work: every path is traced.
- **Check.** Render the new glyph next to the others at 120, 48 and 32 px in a browser before merging; it must read as the same family.

Accent rules, enforced by `src/verify/trackPresentation.test.ts`:

- At least 4.5:1 contrast against `void` (`#0a0f18`), `panel` (`#121c2a`) and `elevated` (`#1b293a`), and at least 4.5:1 for the dark `on-accent` text drawn on top of it.
- At least 30° of hue away from the accent of every other track shown to learners, so tracks stay distinguishable (also for color-blind users; the logo glyph and title are the second cue). Tracks hidden in `src/content/featureFlags.ts` never share a screen with the others and are left out; enabling one whose hue collides fails the test, and the accents are revisited then.
- `--accent-rgb` must be the same color as `--accent` written as `R G B`.

Current accents and their hues. Python took the last band 30° away from every accent (around 123°), so the rule now counts only the tracks shown to learners: C# uses the band of the hidden Angular track (about 358°), and Vue's band (about 154°) is free while Vue stays hidden.

| Track | Accent | Hue |
| --- | --- | --- |
| architecture | `#ffb547` | 36° |
| ai-engineering | `#f07ad9` | 312° |
| node | `#9be15d` | 92° |
| python | `#62e869` | 123° |
| vue (hidden) | `#6de6b2` | 154° |
| typescript | `#4dd9ff` | 193° |
| react | `#8c8cff` | 240° |
| react-state | `#d29cff` | 273° |
| angular (hidden) | `#ff6b81` | 351° |
| csharp | `#ff7a7f` | 358° |

## Adding a framework track (step by step)

The example adds a **Svelte** track; replace names for any other framework.

### 1. Install dependencies

Install the framework, its in-browser compiler (if it has one), its Testing Library flavor and the libraries lessons will import:

```bash
npm i svelte @testing-library/svelte
```

Check that the compiler runs in the browser (some packages ship a separate browser build; alias it in `vite.config.ts` the same way `vue` and `@vue/compiler-sfc` are aliased).

### 2. Create the engine folder `src/engines/<track>/`

**`registry.ts`**: every module learner code may import.

```ts
import * as Svelte from 'svelte';
import * as SvelteStore from 'svelte/store';
import { esModule, type ModuleRegistry } from '../shared/project';

export const svelteRegistry: ModuleRegistry = {
  svelte: esModule(Svelte),
  'svelte/store': esModule(SvelteStore),
};
```

**Compiler** (only when the framework has its own file format, like `.vue` or `.svelte`): turn the file into an ES module string, then pass it to the shared `transpile()` so imports become CommonJS and loops get guarded. See `vue/sfc.ts` (`compileVueFile`). If the framework needs an AST rewrite on top of TypeScript (Angular signal APIs), write a `ts.TransformerFactory` like `angular/jitTransform.ts` and pass it in `transformers`.

**`adapter.ts`**: the `FrameworkAdapter` plus the preview renderer.

- `compileFile`: route by extension (framework files through the compiler, `.ts/.js` through `transpile`).
- `createScope`: expose the framework testing helpers (`render`, `screen`, `user: userEvent.setup()`, ...). Keep names consistent with the other tracks so the content guide stays uniform.
- `beforeEach` / `afterEach`: unmount everything and remove injected styles, so every test starts clean.
- `render<Track>Preview(files, entry, container)`: unmount the previous app, evaluate the project with `evaluateProject(compileProject(files, compileFile), entry, registry)`, mount the entry's default export, and print errors with the `.dojo-preview-error` class.

### 3. Register the engine

| File | Change |
| --- | --- |
| `src/sandbox/protocol.ts` | Add the id to `FrameworkEngine` |
| `src/sandbox/sandbox.ts` | Add a lazy loader to `engines` (`() => import('../engines/svelte/adapter')`) so each engine stays in its own chunk; it returns `adapter` plus `preview` (visual engines) or `run` and `format` (headless engines) |
| `src/content/types.ts`, `src/content/loader.ts` | Add the engine to `EngineId` (types) and `DEFAULT_ENTRY` (loader) (e.g. `{ svelte: 'App.svelte', ts: 'main.ts' }`); the track declares `"engine": "svelte"` in `track.json` |
| `src/engines/shared/project.ts` | Add the file extension to `EXTENSIONS` if learners import it without an extension |
| `src/features/lesson/monacoSetup.ts` | Map the extension in `languageForFile`; adjust `configureLanguageService` if the track needs different compiler options |
| `src/content/<id>/track.json` + `src/shared/design/tokens.css` | `monogram` (and `shortTitle` when needed) plus a `[data-trail='<id>']` accent rule and a glyph in `entities/track/trackGlyphs.ts`, see [Track presentation](#track-presentation) |

`features/lesson/runner.ts` needs no change: every engine other than `typescript` goes through the sandbox.

### 4. Add the verification suite

`src/verify/<track>.test.ts`:

```ts
import { svelteAdapter } from '../engines/svelte/adapter';
import { defineChallengeSuite } from './challengeSuite';
import { frameworkGrader } from './graders';

defineChallengeSuite('svelte', frameworkGrader(svelteAdapter));
```

Then add the engine id to the list of valid engines in `src/verify/content.test.ts`.

### 5. Create the content skeleton

```
src/content/svelte/track.json                 { "engine", "order", "title", "monogram", "description", "version" }
src/content/svelte/01-foundations/module.json { "title", "description", "optional"? }   (the folder prefix is the module number shown to learners)
src/content/svelte/01-foundations/01-.../     one reference lesson (see CONTENT_GUIDE.md)
```

Write **one reference lesson by hand first** and run `LESSON=<id> npx vitest run src/verify/svelte.test.ts`. It proves the engine end to end (compile, evaluate, render, test, starter fails). Then open it in the browser (`npm run dev`) and check the preview and the test run.

### 6. Document and plan

- Add the track section (test globals, preview contract, quirks) to [CONTENT_GUIDE.md](CONTENT_GUIDE.md).
- Add the module and lesson plan to [CURRICULUM.md](CURRICULUM.md).
- Write the remaining lessons following the plan, verifying each one.

## Adding a static (non-DOM) track

Follow the TypeScript engine (`src/engines/typescript`): a worker that analyzes code, a worker that runs it with a timeout, a test DSL parsed from `tests.md` (`testsDsl.ts`), and a branch in `src/features/lesson/runner.ts` (`testNamesFor`, `gradeChallenge`) plus `src/verify/typescript.test.ts` for verification. The UI only special-cases the static engine in two places: the **Run** button (`canRunProgram`/`runProgram` in `src/features/lesson/runner.ts`, shared with the Node.js engine) and the strict compiler options in `src/features/lesson/monacoSetup.ts`.

## Checklist

For a track on an existing engine, only the items marked *(track)* apply.

- [ ] Engine folder with `registry.ts`, `adapter.ts` (and compiler/transform if needed)
- [ ] Engine registered in `protocol.ts`, `sandbox.ts`, `content/types.ts` + `content/loader.ts`, `monacoSetup.ts`, and listed in `src/verify/content.test.ts`
- [ ] Worker engine only: vendor script with `--check`, serving plugin, `CSP_WORKERS` + `netlify.toml` header, lock-down, verify sandbox with regression tests, `CODEOWNERS` (table in "Adding a language")
- [ ] *(track)* `track.json` with `monogram` (and `shortTitle` if the title is long), a concept glyph in `entities/track/trackGlyphs.ts`, first module and one hand-written reference lesson passing verification
- [ ] *(track)* `[data-trail]` accent rule in `tokens.css` passing `src/verify/trackPresentation.test.ts`
- [ ] *(track)* `src/verify/<track>.test.ts`
- [ ] *(track)* `CURRICULUM.md` plan with `✓` on written lessons (`src/verify/curriculum.test.ts`), new libraries in `CONTENT_GUIDE.md`
- [ ] *(track)* `index.html` meta description names the track if it should
- [ ] *(track)* Carousel, curriculum, preview and test run checked in the browser; `npm run test`, `npm run verify` and `npm run build` pass
