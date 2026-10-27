# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Dev Dojo is a browser-only learning platform (theory, test-validated coding challenges, hints, quizzes) for TypeScript, React, React State Management, Vue and Angular. There is no backend: grading, previews and a fake REST API all run client-side. Everything (code, content, docs) is written in English.

## Commands

```bash
npm run dev                                                    # Vite dev server, http://localhost:5173
npm run build                                                  # tsc --noEmit + vite build (two inputs: index.html, sandbox.html)
npm run typecheck                                              # tsc --noEmit
npm run verify                                                 # vitest run: validates every lesson
npx vitest run src/verify/<track>.test.ts                      # one track (typescript, react, react-state, vue, angular)
LESSON=use-effect npx vitest run src/verify/react.test.ts      # lessons whose id contains "use-effect"
LESSON=use-effect npx vitest run src/verify/content.test.ts    # structure checks only
```

No linter is configured. `tsconfig.json` excludes lesson folders (`src/content/*/**`), so lesson code is only checked by the verify suites, not by `typecheck`.

## Architecture

Three layers, documented in depth in `ARCHITECTURE.md` (read it before touching engines or adding a track):

- **`src/content/`**: lessons as plain files. `content/index.ts` builds `tracks → modules → lessons` at build time via `import.meta.glob` (eager, `?raw` for text). Numeric folder prefixes set order and are stripped from ids. A lesson folder only exists once it has `meta.json`. Single-file `starter.<ext>`/`solution.<ext>` are renamed to the engine default entry (`DEFAULT_ENTRY`); multi-file challenges use `starter/` + `solution/` folders and need `entry` in `meta.json`. Each `track.json` declares its `engine`, so several tracks share one engine (`react-state` runs on `react`).
- **`src/engines/`**: two families.
  - *Static* (`typescript/`): TypeScript compiler API in Web Workers; tests are a Markdown DSL (`tests.md` with `## type:|runtime:|pattern:|forbid:` sections, parsed by `testsDsl.ts`).
  - *Framework* (`react/`, `vue/`, `angular/`): each exports a `FrameworkAdapter` (registry of importable modules, `compileFile`, `createScope`, preview renderer). `shared/` holds the engine-agnostic pieces: `transpile()` to CommonJS with an injected loop guard, a tiny CommonJS loader (`project.ts`), the test runner (fresh project evaluation per test), Jest-like `expect`, and the fake `/api/*` server.
- **`src/sandbox/` + `sandbox.html`**: framework code never runs in the app window. `app/runner.ts` creates a hidden iframe per test run (`mode=test`) and `PreviewFrame` keeps a persistent one (`mode=preview`); they talk through the `postMessage` protocol in `sandbox/protocol.ts`. The TypeScript engine skips the sandbox and grades in workers.

Adding a library a lesson imports means registering its import path (and subpaths) in the engine's `registry.ts`; learner code can only import what is registered there.

`vite.config.ts` aliases `vue` to the full ESM bundler build (runtime template compiler) and `@vue/compiler-sfc` to its browser build; Vitest runs in jsdom and inlines `@angular`/`@ngrx` deps.

## UI shell (`src/app/`)

- React 19, hash routing (`route.ts`: `#/`, `#/<track>`, `#/<track>/<lesson>`), no router library.
- `LessonPage` is the main screen: resizable split (`react-resizable-panels`) with `LessonPanel` (Learn / Challenge / Quiz tabs) on the left and the Monaco editor, preview, tests and console on the right. Stacks vertically under 900px.
- Progress and per-lesson code live in `localStorage` (`progress.ts`, key `dev-dojo:progress:v1`) exposed through `useSyncExternalStore`; `useProgress()` is the read API, `progress.*` the write API.
- Styling is **Tailwind CSS 4** (`@tailwindcss/vite`), utilities inline in components. `src/app/styles.css` is the Tailwind entry: it imports `src/design/tokens.css`, excludes `src/content` from class scanning, and keeps only what utilities cannot reach (generated Markdown/highlight.js HTML under `@layer components`, ambient fallback `@utility` backgrounds). Repeated class sets live in `src/app/ui.ts` (`buttonClass`, `iconButtonClass`, `tagClass`, shared constants); compose with `clsx`.
- Tokens (`src/design/tokens.css`) are the single source of truth: `@theme` colors (`void`, `panel`, `elevated`, `hover`, `code`, `line`, `ink`, `ink-muted`, `ink-faint`, `success`, `danger`, `warning`...), `rounded-card`/`rounded-panel`, `ease-out`, custom breakpoint `wide` (900px, use `max-wide:` for narrow layouts), plus plain vars (`--dur-*`, `--persp`, `--tilt-*`). Dark only.
- Per-track accent: put `data-trail={track.id}` on an element and use `accent` utilities (`bg-accent`, `text-accent`, `border-accent/25`). Values live in `[data-trail='<id>']` rules (`--accent` + `--accent-rgb`); `track.json` has no color. `--accent` is a registered `@property <color>` so it can transition. Text on accent backgrounds uses `text-on-accent`.
- Tailwind preflight forces `[hidden] { display: none !important }`; to keep an element mounted but invisible (the preview iframe) use `invisible pointer-events-none` instead of `hidden`.
- Monaco uses its own `dev-dojo` theme from `monacoSetup.ts` with hex values mirroring the tokens.

## Ambient scene and motion

The visual/motion spec lives in `.claude/specs/` (written in Portuguese; implementation is phased: 1 scene, 2 tokens and tilt cards, 3 curriculum glow border, 4 motion coordinator and FLIP, 5 calibration).

- One `<canvas>` and one `WebGLRenderer` for the whole session: `AmbientScene` (`src/app/AmbientScene.tsx`) is mounted by `App` outside the routed page and never remounts. It lazy-imports `src/scene/scene.ts` (Three.js stays out of the main chunk) in `requestIdleCallback`, over a static CSS fallback that is the only background without WebGL2.
- Components talk to the scene only through `SceneAPI` (`src/scene/types.ts`: `setAccent`, `setSceneState`, `setFocus`, `setPointer`, `setRenderMode`, `resize`, `destroy`). Never touch camera, materials or buffers from components. `router-adapter.ts` maps a route to the scene target (home: `intro`/`explorer`, track: `curriculum` focus 0.35, lesson: `activity` paused).
- The scene reports to CSS only through attributes on its own canvas (`data-ready`, `data-grid`, `data-tier`). Particles move in the vertex shader (no per-frame buffer writes); performance tiers come from `src/capabilities/capabilities.ts` and drop automatically from measured frame time.
- Motion logic is framework-agnostic TypeScript in `src/motion/` (`tilt.ts`: one shared rAF loop that only runs while a tilt is moving, pointer and touch bindings; `gyro.ts`: opt-in device orientation with calibration). React adapters and motion components live in `src/ui/` (`useTiltGroup`, `PathGrid`, `PathCard`).
- Card tilt is per group: the tilt module writes `--tilt-x`/`--tilt-y` (degrees), `--glow-x`/`--glow-y` and `data-tilting` on the grid; cards consume them through the `tilt-surface` and `tilt-glow` utilities in `styles.css`. Limits ±4°/±6° desktop, ±2°/±3° coarse pointer. Keyboard focus lifts the card (`has-focus-visible:translate-z-*`) without rotation. A tilted card must not use `overflow-hidden` (it flattens `preserve-3d`); use an inset shadow for the accent edge instead. Never leave interactive content coplanar with its `preserve-3d` parent: Chrome hit-tests coplanar 3D planes inconsistently and clicks miss links. Keep content in flat (non-`preserve-3d`) blocks lifted with `translate-z-px`, and only nest `transform-3d` where a layer gets its own `translate-z-*`.
- Curriculum (`src/ui/Curriculum.tsx`) is a frosted panel: `bg-frost` (82% panel + SVG noise), no large `backdrop-filter` over the animated canvas. `GlowBorder` sizes its SVG to the parent with `ResizeObserver`, pauses with `IntersectionObserver` (and a `paused` prop for the activity state), never captures the pointer. `pathLength=100` is kept, but the light count, dash length and duration are derived from the measured perimeter (two lights per ~1400px, ~80px lights, ≥6s, ~160px/s) so tall containers do not get long fast streaks; the keyframe offset reads `--glow-period`.
- Text tokens are AA-checked (≥4.5:1) against panel, elevated and the frosted surface with the brightest curriculum particle behind it; keep `ink-faint` at `#8394ad` or lighter.
- Gyroscope is only started from the "Enable motion" button (iOS needs the user gesture); without it, a horizontal touch drag drives the tilt and vertical drags stay native scroll (`touch-pan-y`).
- Every effect needs a fallback and must respect `prefers-reduced-motion`; nothing visual may be required to complete a lesson.

## Writing lessons

Follow `CONTENT_GUIDE.md` (file format, test globals per engine, fake API data, installed library versions) and `CURRICULUM.md` (planned modules and lessons). Rules the verify suites enforce: the solution passes every test, the starter fails at least one, at least 2 hints separated by `---`, a non-trivial `approach.md`, theory over 200 characters, and a challenge or a quiz in every lesson. Write `meta.json` last. Check library APIs against the type definitions in `node_modules` instead of relying on memory.

When adding a track or engine, follow the checklist at the end of `ARCHITECTURE.md`. Note that `src/verify/content.test.ts` hardcodes the list of valid engines.
