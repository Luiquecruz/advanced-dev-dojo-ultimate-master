# Architecture and Adding a Track

This document describes how Dev Dojo is built and the step-by-step pattern to add a new track (for example Svelte, Solid or Python-in-the-browser). For the lesson file format see [CONTENT_GUIDE.md](CONTENT_GUIDE.md); for the lesson plan see [CURRICULUM.md](CURRICULUM.md). All project docs live in `.claude/docs/`.

## Overview

```
src/
├── main.tsx             Entry: mounts App and the Tailwind stylesheet
├── app/                 Composition root: App, routing adapter (route → layers, motion, scene), ActivityShell, styles.css
├── pages/               One screen per route: home/HomePage, track/TrackPage, lesson/LessonPage
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
│   ├── routing/         hash route parsing and links
│   └── lib/             small React hooks (useMediaQuery)
├── content/
│   ├── index.ts         Content loader: builds tracks → modules → lessons from the folders below
│   └── <track>/         track.json (declares its engine) + <NN-module>/module.json + <NN-lesson>/...
├── engines/
│   ├── shared/          Engine-agnostic runtime: compiler, module loader, test runner, expect, fake API
│   ├── typescript/      Static engine: TypeScript compiler API in Web Workers (type/runtime/pattern tests)
│   ├── react/           Framework adapter: module registry, Testing Library scope, preview renderer
│   ├── vue/             Framework adapter + SFC compiler
│   └── angular/         Framework adapter + JIT transform for signal APIs
├── sandbox/             sandbox.html entry: loads one framework engine inside an iframe
├── verify/              Vitest suites that validate every lesson (solution passes, starter fails)
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
hash change ─► useRoute (shared/routing) ─► useMotionRouting (app/routing)
                                               ├─► layers: base page + optional activity (React state)
                                               ├─► motionCoordinator.go() ─► FLIP / view transition ─► MotionState
                                               └─► sceneTargetFor(MotionState, route) ─► AmbientScene ─► SceneAPI
learner actions ─► progress.* (entities/progress) ─► localStorage + useProgress subscribers ─► summarizeTrack (derived)
```

### State and storage

| State | Owner | Read with | Persisted |
| --- | --- | --- | --- |
| Route | `shared/routing/route.ts` (hash) | `useRoute()` | URL |
| Motion state | `shared/motion/coordinator.ts` | `useMotionState()` | no |
| Learner progress and code | `entities/progress/progressStore.ts` | `useProgress()`, `progress.getState()` | `localStorage` `dev-dojo:progress:v1`, debounced 300ms |
| Screen state (tabs, report, console, carousel index) | the page component | React state | no |
| Ambient scene | `shared/scene/scene.ts` | imperative `SceneAPI` | no |

Stores are plain external stores read through `useSyncExternalStore`: no state library, no context providers. Derived values (`summarizeTrack`, `isLessonComplete`) are computed from the store, never stored.

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

Pick the **framework engine** for anything that renders UI or needs a DOM, or that needs a module registry and a runtime (Node.js). Pick the **static engine** pattern for languages or topics where type checking or pure functions are the subject.

### The Node.js engine

`engines/node/` reuses the framework pipeline with a headless adapter:

- `runtime/` implements Node built-ins in the browser: `process` (env, argv, exit, nextTick, signals), `timers` (Node handles with `ref`/`unref`, tracked so a run knows when the event loop is empty), `fs` (in-memory volume rooted at `/`, cwd `/app`), `path` (POSIX), `http` (in-memory servers on virtual ports, `IncomingMessage`/`ServerResponse` as real streams), `crypto` (pure JS SHA-256/SHA-1, HMAC, PBKDF2), `util`, `assert`, `os`, `url`. `events`, `buffer` and `stream` come from the npm packages `events`, `buffer` and `readable-stream`, imported by file path (`events/events.js`, `buffer/index.js`) so Vitest uses the same code as the browser instead of Node's built-ins.
- `runtime/index.ts`: `installNodeFetch` routes `fetch('http://localhost:<port>')` to listening in-memory servers (other URLs fall through to the fake API), `resetNodeRuntime` clears files, env, listeners, timers and servers, and `modulePrelude` binds `process`, `Buffer`, the timer globals, `__filename` and `__dirname` at the top of every learner module.
- `registry.ts` exposes each built-in as `name` and `node:name` (`moduleOf` turns namespaces and instances into CommonJS-friendly objects), plus Hono, `@hono/zod-validator` and Zod.
- `adapter.ts`: `nodeAdapter` (test scope: `request`, `writeFiles`, `captureLogs`, `fs`, `process`, `Buffer`; the runtime is reset before and after every test) and `runNodeProgram`, used by the sandbox `run` mode behind the lesson **Run** button.

`content/index.ts` treats `typescript` and `node` as headless engines (no preview by default); `features/lesson/runner.ts` decides which engines get a **Run** button (`canRunProgram`) and runs them (`runProgram`: TypeScript in a worker, Node.js in a `mode=run` sandbox iframe that streams `console` messages back and answers `run-complete`).

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
- `sandbox/sandbox.ts`: picks the engine from `?engine=`, installs the loop guard and fake API, forwards `console` to the parent in preview mode, and answers `preview` / `run-tests` messages (`sandbox/protocol.ts`).
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
4. **Verification suite**: `src/verify/<track-id>.test.ts` calling `defineChallengeSuite('<track-id>', reactAdapter)`.
5. **Plan and guide**: add the module and lesson plan to [CURRICULUM.md](CURRICULUM.md) (written lessons get `✓`) and list new libraries in [CONTENT_GUIDE.md](CONTENT_GUIDE.md).
6. **Copy that names the tracks**: update the `<meta name="description">` in `index.html` when the new track should be named there.

No change is needed in the runner, sandbox, loader, pages or features: they read `track.engine`, and the home carousel, curriculum, progress, stats, logo and ambient scene pick the track up from `track.json` and its accent rule.

## Track presentation

Everything the UI shows about a track comes from two places:

| Where | Field | Used for |
| --- | --- | --- |
| `track.json` | `title`, `description`, `version` | carousel card, curriculum header, breadcrumbs |
| `track.json` | `monogram` (1–3 characters, required) | the track logo (`entities/track/TrackLogo.tsx`) |
| `track.json` | `shortTitle` (optional) | the giant backdrop word on the home page; set it when `title` is longer than about 10 characters (`react-state` uses `"State"`) |
| `track.json` | `order` | position in the home carousel and the track list |
| `tokens.css` | `[data-trail='<id>'] { --accent; --accent-rgb }` | every accent: buttons, borders, glow, scene particles, headline highlight |

Visibility: `src/content/featureFlags.ts` (`TRACK_FLAGS`) hides a track from learners when its flag is `false` (code only, no UI or env toggle; currently `vue` and `angular`). The UI reads `availableTracks` / `availableTrackById` from `@/content`, so a disabled track leaves the home carousel and stats and its routes answer "Page not found". `tracks` / `trackById` still hold every track, so content, curriculum and verification suites keep covering disabled tracks. Flip the flag to `true` (or remove it) to publish the track.

Accent rules, enforced by `src/verify/trackPresentation.test.ts`:

- At least 4.5:1 contrast against `void` (`#0a0f18`), `panel` (`#121c2a`) and `elevated` (`#1b293a`), and at least 4.5:1 for the dark `on-accent` text drawn on top of it.
- At least 30° of hue away from every other track accent, so tracks stay distinguishable (also for color-blind users; the monogram and title are the second cue).
- `--accent-rgb` must be the same color as `--accent` written as `R G B`.

Current accents and their hues, to pick the next one from a free region (only the 303°–321° band, magenta, is still open):

| Track | Accent | Hue |
| --- | --- | --- |
| architecture | `#ffb547` | 36° |
| node | `#9be15d` | 92° |
| vue | `#6de6b2` | 154° |
| typescript | `#4dd9ff` | 193° |
| react | `#8c8cff` | 240° |
| react-state | `#d29cff` | 273° |
| angular | `#ff6b81` | 351° |

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
| `src/content/index.ts` | Add the engine to `EngineId` and `DEFAULT_ENTRY` (e.g. `{ svelte: 'App.svelte', ts: 'main.ts' }`); the track declares `"engine": "svelte"` in `track.json` |
| `src/engines/shared/project.ts` | Add the file extension to `EXTENSIONS` if learners import it without an extension |
| `src/features/lesson/monacoSetup.ts` | Map the extension in `languageForFile`; adjust `configureLanguageService` if the track needs different compiler options |
| `src/content/<id>/track.json` + `src/shared/design/tokens.css` | `monogram` (and `shortTitle` when needed) plus a `[data-trail='<id>']` accent rule, see [Track presentation](#track-presentation) |

`features/lesson/runner.ts` needs no change: every engine other than `typescript` goes through the sandbox.

### 4. Add the verification suite

`src/verify/<track>.test.ts`:

```ts
import { svelteAdapter } from '../engines/svelte/adapter';
import { defineChallengeSuite } from './challengeSuite';

defineChallengeSuite('svelte', svelteAdapter);
```

Then add the engine id to the list of valid engines in `src/verify/content.test.ts`.

### 5. Create the content skeleton

```
src/content/svelte/track.json                 { "engine", "order", "title", "monogram", "description", "version" }
src/content/svelte/01-foundations/module.json { "title", "description" }
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
- [ ] Engine registered in `protocol.ts`, `sandbox.ts`, `content/index.ts`, `monacoSetup.ts`, and listed in `src/verify/content.test.ts`
- [ ] *(track)* `track.json` with `monogram` (and `shortTitle` if the title is long), first module and one hand-written reference lesson passing verification
- [ ] *(track)* `[data-trail]` accent rule in `tokens.css` passing `src/verify/trackPresentation.test.ts`
- [ ] *(track)* `src/verify/<track>.test.ts`
- [ ] *(track)* `CURRICULUM.md` plan with `✓` on written lessons (`src/verify/curriculum.test.ts`), new libraries in `CONTENT_GUIDE.md`
- [ ] *(track)* `index.html` meta description names the track if it should
- [ ] *(track)* Carousel, curriculum, preview and test run checked in the browser; `npm run test`, `npm run verify` and `npm run build` pass
