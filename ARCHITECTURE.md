# Architecture and Adding a Track

This document describes how Dev Dojo is built and the step-by-step pattern to add a new track (for example Svelte, Solid, Node.js or Python-in-the-browser). For the lesson file format see [CONTENT_GUIDE.md](CONTENT_GUIDE.md).

## Overview

```
src/
├── app/                 UI shell (React 19): pages, Monaco editor, preview frame, quiz, progress store
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
└── verify/              Vitest suites that validate every lesson (solution passes, starter fails)
```

### Two engine families

| Family | Used by | Runs in | How it grades |
| --- | --- | --- | --- |
| **Static engine** | TypeScript | Web Workers (`analysis.worker.ts`, `runtime.worker.ts`) | Type checks with the compiler API, runs plain JS with `assert`, regex pattern tests. Tests written in `tests.md`. |
| **Framework engine** | React, Vue, Angular | Same-origin iframe (`sandbox.html?engine=<id>`) | Transpiles learner files to CommonJS, evaluates them with a module registry, runs `test()` blocks with Testing Library and a Jest-like `expect`. Tests written as a script. |

Pick the **framework engine** for anything that renders UI or needs a DOM. Pick the **static engine** pattern for languages or topics where type checking or pure functions are the subject.

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
- `app/runner.ts`: the UI side. Test runs create a hidden iframe per run (`mode=test`); the preview uses a persistent iframe (`mode=preview`) that re-renders on edits.

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
2. **Track folder**: `src/content/<track-id>/track.json` with `"engine": "react"` and an `"order"` (position on the home page), plus one `module.json` per module.
3. **Verification suite**: `src/verify/<track-id>.test.ts` calling `defineChallengeSuite('<track-id>', reactAdapter)`.
4. **Logo**: add a label to `LABELS` in `src/app/TrackLogo.tsx` (it falls back to the engine label) and a `.track-logo-<track-id>` style in `src/app/styles.css`.
5. **Plan and guide**: add the module/lesson plan to `CURRICULUM.md` and list new libraries in `CONTENT_GUIDE.md`.

No change is needed in the runner, sandbox, loader or pages: they read `track.engine`.

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
| `src/sandbox/sandbox.ts` | Add a lazy loader to `engines` (`() => import('../engines/svelte/adapter')`) so each engine stays in its own chunk |
| `src/content/index.ts` | Add the engine to `EngineId` and `DEFAULT_ENTRY` (e.g. `{ svelte: 'App.svelte', ts: 'main.ts' }`); the track declares `"engine": "svelte"` in `track.json` |
| `src/engines/shared/project.ts` | Add the file extension to `EXTENSIONS` if learners import it without an extension |
| `src/app/monacoSetup.ts` | Map the extension in `languageForFile`; adjust `configureLanguageService` if the track needs different compiler options |
| `src/app/TrackLogo.tsx` + `src/app/styles.css` | Add a label and a `.track-logo-<id>` style |

`app/runner.ts` needs no change: every engine other than `typescript` goes through the sandbox.

### 4. Add the verification suite

`src/verify/<track>.test.ts`:

```ts
import { svelteAdapter } from '../engines/svelte/adapter';
import { defineChallengeSuite } from './challengeSuite';

defineChallengeSuite('svelte', svelteAdapter);
```

Then update the expected track list in `src/verify/content.test.ts`.

### 5. Create the content skeleton

```
src/content/svelte/track.json                 { "title", "description", "version", "accent" }
src/content/svelte/01-foundations/module.json { "title", "description" }
src/content/svelte/01-foundations/01-.../     one reference lesson (see CONTENT_GUIDE.md)
```

Write **one reference lesson by hand first** and run `LESSON=<id> npx vitest run src/verify/svelte.test.ts`. It proves the engine end to end (compile, evaluate, render, test, starter fails). Then open it in the browser (`npm run dev`) and check the preview and the test run.

### 6. Document and plan

- Add the track section (test globals, preview contract, quirks) to `CONTENT_GUIDE.md`.
- Add the module and lesson plan to `CURRICULUM.md`.
- Write the remaining lessons following the plan, verifying each one.

## Adding a static (non-DOM) track

Follow the TypeScript engine (`src/engines/typescript`): a worker that analyzes code, a worker that runs it with a timeout, a test DSL parsed from `tests.md` (`testsDsl.ts`), and a branch in `app/runner.ts` (`testNamesFor`, `gradeChallenge`) plus `src/verify/typescript.test.ts` for verification.

## Checklist

- [ ] Engine folder with `registry.ts`, `adapter.ts` (and compiler/transform if needed)
- [ ] Registered in `protocol.ts`, `sandbox.ts`, `content/index.ts`, `monacoSetup.ts`, `TrackLogo.tsx`, `styles.css`
- [ ] `src/verify/<track>.test.ts` and updated `content.test.ts`
- [ ] `track.json`, first module and one hand-written reference lesson passing verification
- [ ] Preview and test run checked in the browser, `npm run build` passes
- [ ] `CONTENT_GUIDE.md` and `CURRICULUM.md` updated
