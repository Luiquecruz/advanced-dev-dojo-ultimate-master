# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Dev Dojo is a browser-only learning platform (theory, test-validated coding challenges, hints, quizzes) for TypeScript, React, React State Management, React Architecture, AI Engineering (Node.js and Python variants), Node.js, Python, C# and .NET (on the C# engine; theory and quizzes, graded challenges in the optional fundamentals module 00 and in modules 02–04, 08–10, 12 and 14), Vue and Angular. There is no backend: grading, previews, a fake REST API and a fake model provider all run client-side. Everything (code, content, docs, commit messages) is written in English. The project has more than one contributor: workflow, commit format and the documentation upkeep rule are in `.claude/docs/CONTRIBUTING.md`.

## Commands

```bash
npm run dev                                                    # Vite dev server, http://localhost:5173
npm run build                                                  # tsc --noEmit + vite build (two inputs: index.html, sandbox.html)
npm run lint                                                   # ESLint (lesson folders excluded)
npm run typecheck                                              # tsc --noEmit
npm run test                                                   # unit + architecture tests (everything except src/verify)
npm run verify                                                 # lesson verification (src/verify): solution passes, starter fails
npx vitest run src/shared/motion                               # one folder of unit tests
npm run docs:check                                             # changed areas whose documents were not updated (.claude/hooks/docs-sync.mjs)
npx vitest run src/verify/<track>.test.ts                      # one track (typescript, react, react-state, architecture, ai-engineering, node, python, csharp, vue, angular)
npx vitest run src/verify/csharpSandbox.test.ts                # C# engine regression tests in Node: loop kills, tampering, lock-down probes, escape scan
npm run python:new -- <NN-module> <NN-lesson-id>               # scaffold a Python track lesson (writes meta.json.draft)
npm run python:curriculum                                      # regenerate the Python section of CURRICULUM.md (-- --check to verify)
npm run python:vendor                                          # download the pinned Pyodide packages (runs as postinstall; -- --check to verify)
npm run csharp:vendor                                          # assemble vendor/dotnet/ (Webcil .wasm, no .dll) for the C# engine (postinstall; on Netlify the build command; -- --check to verify)
.venv/bin/python -m pytest                                     # Python lessons + harness on CPython 3.14 (venv setup in CONTRIBUTING.md)
npm run smoke:worker-csp                                       # build + vite preview layout check (-- --url <origin> --dist dist for a deploy)
LESSON=use-effect npx vitest run src/verify/react.test.ts      # lessons whose id contains "use-effect"
LESSON=use-effect npx vitest run src/verify/content.test.ts    # structure checks only
LESSON=react/use-effect npx vitest run src/verify/react.test.ts # one exact lesson (track/id)
DEMO_OUTPUT=1 LESSON=ai-engineering/calling-a-model npx vitest run src/verify/ai-engineering.test.ts --silent=false # print demo output
```

Debug query params: `?debug=perf` shows the scene panel (fps, frame time, tier, particles, DPR, render mode, renderer count, `renderer.info`, motion state); `?tier=high|mid|low` forces a performance tier. Example: `http://localhost:5173/typescript?debug=perf&tier=mid`.

ESLint 10 (`eslint.config.js`, `npm run lint`) lints everything except lesson folders; `tsconfig.json` also excludes them (`src/content/*/**`), so lesson code is only checked by `verify` and, for Python, by `pytest` on CPython. Rules and setup in CONTRIBUTING.md "Checks before a pull request".

## Documentation

All project documentation lives in `.claude/docs/` (the root `README.md` is the entry point: tracks, requirements, commands, layout, links). Read the relevant file before working in its area.

**Documentation is incremental and part of every change.** Each implementation or improvement that alters behavior, structure, commands, conventions or the curriculum updates the documents that describe it in the same change, before reporting the task as done: `README.md` and this file included. Write the current state, not a changelog. The code area → document map is in CONTRIBUTING.md "Documentation upkeep". The shared `Stop` hook (`.claude/settings.json` → `.claude/hooks/docs-sync.mjs`) lists changed areas whose documents were not touched; when it fires, update those documents, or state in one line that nothing they describe changed.

| Document | Covers | Read before |
| --- | --- | --- |
| `.claude/docs/CONTRIBUTING.md` | setup, branches, commit format, checks before a pull request, documentation upkeep map, shared harness (`.claude/settings.json`, hooks) | any change; editing `.claude/settings.json` or `.claude/hooks/` |
| `.claude/docs/CI_SECURITY.md` | why each CI/CD security control exists (no deploy secrets, pinning, token permissions, triggers, secret and dependency scanning, deploy smoke test), threat model, what was left out | editing `.github/`, `netlify.toml`, `.nvmrc` or `.gitleaksignore` |
| `.claude/docs/ARCHITECTURE.md` | frontend layers and rules, data flow, state and storage, engines, sandbox, adding a track, an engine or a UI feature, track presentation rules | touching engines, adding a track, adding or moving a slice |
| `.claude/docs/CONTENT_GUIDE.md` | lesson file format, `track.json` fields, test globals per engine, fake REST API data, installed library versions, verification commands | writing or fixing a lesson |
| `.claude/docs/CURRICULUM.md` | every track, its modules and lessons; `✓` marks written lessons and the rest is the backlog | adding lessons or planning a track |
| `.claude/docs/csharp-engine.md` | the C# engine: status, giving a lesson a C# challenge, pins, served files (Webcil) and the Brotli budget, download and prefetch, the Netlify build cache, security findings, open items | touching `src/engines/csharp/`, `vendor/dotnet/` or writing a C# challenge |
| `.claude/docs/python-track/` | the Python track: decisions, platform tasks, content standards, full curriculum and per-module lesson specs | writing or planning Python lessons |
| `.claude/specs/` | the visual and motion spec (Portuguese) | changing the scene, motion or the visual system |

Docs are kept honest by tests: `src/verify/curriculum.test.ts` (every written lesson is `✓` in CURRICULUM.md and every `✓` exists), `src/verify/trackPresentation.test.ts` (accent rules), `src/architecture.test.ts` (layer rules described in ARCHITECTURE.md).

## Source map

The UI follows feature-sliced design. Import with the `@/` alias (`@/shared/ui/icons`, `@/features/lesson`). `src/architecture.test.ts` enforces the rules below, so run `npm run test` after moving code.

| Layer | Path | Holds | May import |
| --- | --- | --- | --- |
| app | `src/app/` | `App.tsx` (composition root), `routing/router-adapter.ts` (route → layers, motion, scene), `layout/ActivityShell.tsx`, `styles.css` (Tailwind entry) | everything |
| pages | `src/pages/{home,track,lesson}/` | one screen per route: `HomePage`, `TrackPage`, `LessonRoute` (lazy `LessonPage`) | features, entities, shared, domain |
| features | `src/features/{lesson,curriculum,path-carousel,ambient-scene}/` | user-facing capabilities | entities, shared, domain |
| entities | `src/entities/{progress,track}/` | domain state and domain widgets: progress store, `summarizeTrack`, `TrackLogo` | shared, `@/content` |
| shared | `src/shared/{ui,motion,scene,capabilities,design,routing,lib}/` | framework-agnostic building blocks, no course knowledge | shared only |
| domain | `src/content/`, `src/engines/`, `src/sandbox/`, `src/verify/` | lessons, grading engines, sandbox iframe, lesson verification | never the layers above |

- Pages, features and entities never import a sibling slice of the same layer.
- Another feature or entity is reached only through its `index.ts` (public API, explicit named exports). Shared is imported by deep path.
- Relative imports stay inside their own slice.
- `shared` never imports `content`, `engines` or `sandbox`; types that cross layers (e.g. `SceneTarget`) live in the lower layer.

## Domain: content, engines, sandbox

- **`src/content/`**: lessons as plain files. `content/loader.ts` (`buildTracks`) builds `tracks → modules → lessons → challenge variants`. The app never globs lesson files: `plugins/contentPlugin.ts` serves `virtual:dojo-content` (catalog: tracks, modules, `LessonEntry` with `hasChallenge`/`hasQuiz`) and one lazy `virtual:dojo-content/lesson/<track>/<lesson>` chunk per lesson body, loaded with `loadLesson(entry)`; `LessonRoute` lazy-loads `LessonPage` (Monaco, engines) with it. Only the lesson screen sees a full `Lesson`. `src/verify` reads full tracks from `content/allContent.ts` (eager glob). Details in ARCHITECTURE.md "Content loading". Numeric folder prefixes set order and are stripped from ids. A lesson folder only exists once it has `meta.json`. Single-file `starter.<ext>`/`solution.<ext>` are renamed to the engine default entry (`DEFAULT_ENTRY`); multi-file challenges use `starter/` + `solution/` folders and need `entry` in `meta.json`; an optional `run` names the file the **Run** button executes. Only the entry and what it imports are evaluated for tests; other files load lazily through `modules`. Each `track.json` declares its `engine`, so several tracks share one engine (`react-state` runs on `react`), or `languages` for a multi-language track: each lesson then ships `variants/<language>/` challenges, the learner picks the language in the editor toolbar (`LanguageSwitch`), and every challenge carries its own `engine` (use `challenge.engine`, not `track.engine`). Languages are registered in `content/languages.ts`; details in ARCHITECTURE.md "Multi-language challenges". `content/featureFlags.ts` (`TRACK_FLAGS`, code only) hides disabled tracks (`vue`, `angular`): the UI reads `availableTracks`/`availableTrackById`, verification uses `tracks`/`trackById` from `content/allContent.ts`.
- **`src/engines/`**: two families. *Static* (`typescript/`): TypeScript compiler API in Web Workers; tests are a Markdown DSL (`tests.md`, parsed by `testsDsl.ts`). *Framework* (`react/`, `vue/`, `angular/`, `node/`): each exports a `FrameworkAdapter`; `node/` has no preview and runs Node built-ins implemented in the browser (`node/runtime/`: in-memory `fs`, `http`, `process`, timers, crypto, util) plus Hono; `shared/` holds `transpile()` with a loop guard, a tiny CommonJS loader, the test runner, Jest-like `expect`, the fake `/api/*` server and the fake model provider (`fakeModel.ts`, exposed by the Node.js engine as `@dojo/ai`; never call real models, see CONTENT_GUIDE.md "Fake model"). Learner code's bare module imports resolve through the engine's `registry.ts`; relative imports resolve between project files. *Python* (`python/`): Pyodide (CPython in WebAssembly) in a Web Worker, used for the Python variants of multi-language tracks and as the engine of the single-language Python track; `dojo_ai` wraps the same fake model provider and `tests.py` uses `@test` functions with plain `assert` (CONTENT_GUIDE.md "Python engine"). *C#* (`csharp/`): the .NET WebAssembly runtime and Roslyn in a Web Worker (files in `vendor/dotnet/`, hash-checked against the manifest bundled into the worker, lock-down after boot, a fresh worker per run); `tests.cs` uses `[Test("…")]` methods with `Assert` (CONTENT_GUIDE.md "C# engine"); status, pins and security findings in `.claude/docs/csharp-engine.md`. The C# track runs on it; 26 lessons (modules 00, 02–04, 08–10, 12 and 14) have a C# challenge, marked **(challenge)** in CURRICULUM.md.
- **`src/sandbox/` + `sandbox.html`**: framework code never runs in the app window. `features/lesson/runner.ts` creates a hidden iframe per test run (`mode=test`) or program run (`mode=run`, Node.js **Run** button, console streamed back) and `PreviewFrame` keeps a persistent one (`mode=preview`), talking through `sandbox/protocol.ts`. The TypeScript engine grades and runs in workers instead.
- `vite.config.ts` defines the `@/` alias, aliases `vue` to the full ESM build and `@vue/compiler-sfc` to its browser build; Vitest runs in jsdom and inlines `@angular`/`@ngrx` deps.

## State and storage

- **Route**: react-router `BrowserRouter` in `src/main.tsx`; `shared/routing/route.ts` parses paths (`/`, `/<track>`, `/<track>/<lesson>`) with `matchPath` into `useRoute()` and builds links with `hrefTo` (always `<Link to={hrefTo(...)}>`). Legacy `#/...` URLs are rewritten on boot; hosts need an SPA fallback to `index.html`. The router only supplies the location: routes decide content only, layers and transitions stay in `useMotionRouting`. Details in ARCHITECTURE.md "Routing".
- **Motion state**: `motionCoordinator` (`shared/motion/coordinator.ts`, states in `states.ts`) is an external store read with `useMotionState`. `useMotionRouting` in `app/routing/router-adapter.ts` turns route changes into `go()` calls; the scene target follows the motion state (`sceneTargetFor`), not the route.
- **Progress**: `entities/progress/progressStore.ts` is an external store (`useProgress()` to read in React, `progress.getState()` outside, `progress.*` to write) persisted to `localStorage` (`dev-dojo:progress:v1`, debounced 300ms). It holds completed challenges/quizzes (a challenge passed in any language completes it; `challengeLanguages` records each passing language), quiz answers, visited lessons, the last lesson and the chosen language per track, and the learner code per lesson and language (`codeKeyFor`). Derived data (`summarizeTrack`, `isLessonComplete`) is computed, never stored; a module with `"optional": true` in `module.json` counts toward `done`/`total` as a whole only once a lesson between its first and its last is complete (or all of them), so skipping it still reaches 100%. Modules are numbered for learners by their folder prefix (`Module.number`, `moduleNumberLabel`), never by position.
- **Writing to stores from React**: never call `progress.*` (or any external store) inside a `setState` updater; React runs queued updaters during render, so subscribers such as `ModuleList` would update mid-render. `pages/lesson/useLessonFiles.ts` keeps the latest files in a ref and saves the learner code from the change handler.
- **Component state**: everything else (lesson tabs, test report, console, carousel index on the home page) is local React state. The scene is imperative behind `SceneAPI`.

## UI and styling

- `LessonPage` is the main screen: resizable split (`react-resizable-panels`) with `LessonPanel` (Learn / Challenge / Quiz tabs) and the Monaco editor, preview, tests and console. Stacks vertically under 900px.
- **Tailwind CSS 4**, utilities inline. `app/styles.css` is the entry: imports `shared/design/tokens.css`, excludes `src/content` from scanning, and keeps only what utilities cannot reach (generated Markdown/highlight.js HTML, `@utility` helpers such as `carousel-slide`, `tilt-surface`, `enter`, view transition rules). Repeated class sets live in `shared/ui/classNames.ts` (`buttonClass`, `iconButtonClass`, `tagClass`); compose with `clsx`. Two utilities setting the same property on one element conflict (Tailwind orders them, not the class list): use the variant map or the `!` modifier.
- Tokens (`shared/design/tokens.css`) are the single source of truth: `@theme` colors (`void`, `panel`, `elevated`, `hover`, `code`, `line`, `ink`, `ink-muted`, `ink-faint`, `success`, `danger`, `warning`...), `rounded-card`/`rounded-panel`, `ease-out`, breakpoint `wide` (900px, `max-wide:` for narrow), plus `--dur-*`, `--persp` and the registered `@property` values. Dark only.
- Per-track accent: `data-trail={track.id}` on an element plus `accent` utilities. Values live in `[data-trail='<id>']` rules (`--accent` + `--accent-rgb`); `track.json` has no color. Text on accent backgrounds uses `text-on-accent`.
- Accessibility: one exposed `<main>` per page; inactive layers use `inert` only (never `aria-hidden` on a subtree that may hold focus); headings do not skip levels; text tokens are AA-checked (keep `ink-faint` at `#8394ad` or lighter, Monaco line numbers `#7686a0`); touch targets are at least 24px.
- Tailwind preflight forces `[hidden] { display: none !important }`; to keep an element mounted but invisible (the preview iframe) use `invisible pointer-events-none`.
- Brand: `shared/ui/BrandMark.tsx` (torii gate in track-gradient strokes plus a cursor) mirrors `public/logo.svg`; keep both in sync.

## Motion and the ambient scene

The visual/motion spec lives in `.claude/specs/` (Portuguese; phases 1 scene, 2 tilt cards, 3 curriculum glow border, 4 coordinator and FLIP, 5 calibration).

- **Scene**: one `<canvas>` and one `WebGLRenderer` per session. `features/ambient-scene/AmbientScene.tsx` is mounted by `App` outside the routed page and lazy-imports `shared/scene/scene.ts` (Three.js stays out of the main chunk) over a static CSS fallback. Components talk to it only through `SceneAPI` (`shared/scene/types.ts`) and the scene reports back only through attributes on its canvas (`data-ready`, `data-grid`, `data-tier`). Particles move in the vertex shader; tiers come from `shared/capabilities/capabilities.ts` and drop on measured frame time.
- **Layers**: `App` renders the base layer (home or curriculum) and, above it, `ActivityShell` with the lesson. The base stays mounted and `inert` under the activity, so returning lands on the same scroll position and origin; a direct lesson load mounts that lesson's curriculum underneath.
- **Coordinator**: the only owner of transitions. `resolveInitial` for direct loads (no animation), `go` to move, `cancelTo` as emergency exit; a navigation mid-transition reverses the running WAAPI animations; a 2× duration timeout forces the final state. Entering focuses `[data-activity-title]`, returning focuses the origin. FLIP origins are `data-motion-origin="lesson:<trackId>/<lessonId>"` or `track:<trackId>`, searched only in the base layer. Only the shell surface is scaled (radius compensated with `clip-path`); the lesson content is a sibling, faded in from 60% and mounted two frames late so the transition is already on the compositor.
- **Base page swaps** (home ↔ curriculum) run a View Transition on `view-transition-name: page` only, so the canvas stays continuous. Reduced motion skips it and turns the FLIP into a 150ms crossfade.
- **Carousel** (`features/path-carousel`): circular `--slide-base` offsets, positioning in the `carousel-slide` utility through the individual `translate`/`rotate` properties so the tilt (`transform`) composes. Swipe/drag is `shared/motion/carousel.ts` (intent at 12px mouse / 10px touch, flick needs 24px, the closing click is swallowed only after 16px). The stage and slide wrappers are always `pointer-events-none` and only the active card is `pointer-events-auto`: a `preserve-3d` wrapper is coplanar with its card and which one wins hit-testing depends on float rounding of perspective × fit scale × window size. Drag, tilt and click-beside-to-navigate live on the viewport element. Cards are single flat planes (no `preserve-3d`/`translate-z` inside, no hover lift); a tilted card must not use `overflow-hidden`. Slide opacity stays 1 up to distance 1 (opacity flattens 3D); side cards are dimmed with `carousel-shade`. The stage scales to the available height; on narrow screens the viewport is capped at the stage height so spare space falls below the controls, not between the headline and the card.
- **Tilt and gyro** (`shared/motion/tilt.ts`, `gyro.ts`, adapter `features/path-carousel/useTiltGroup.ts`): one shared rAF loop that only runs while a tilt moves; pointer input is read on the group and written on the element marked `data-tilt-target` (the active card). Limits ±4°/±6° desktop, ±2°/±3° coarse pointer; frozen while a button is pressed (`hold`). The gyroscope starts only from the "Enable motion" button.
- **Curriculum glow** (`shared/ui/GlowBorder.tsx` inside `features/curriculum/CurriculumPanel.tsx`): sized with `ResizeObserver`, paused off screen and during the activity; light count, length and speed derive from the perimeter.
- **Home** (`pages/home/HomePage.tsx`): full-screen `h-dvh` layout centred on the carousel, with no logo. The rotating headline (`shared/ui/RotatingWords`, random word every ~6.5s, letter-staggered blur/rise, paused on hover and in hidden tabs, static with reduced motion; the `h1` keeps a stable `aria-label`) is a small mono uppercase label in the track accent that mirrors the right track index rail: vertical along the left edge on desktop, reading bottom to top (`writing-mode: vertical-rl` + `rotate-180`), horizontal and centred above the carousel on narrow screens. The active track drives `data-trail` and the scene (`onTrailChange` → `homeTrail`); the backdrop word uses container query units. Carousel navigation is borderless long arrows with custom `cursor-prev`/`cursor-next` cursors (also shown over the click-beside areas) and thin progress segments, one per track, filled with that track's completion.
- **Entrance motion**: the `enter` utility (`rise` keyframes, `backwards` fill so it never keeps overriding `translate`/`filter`), staggered with `--enter-index`/`--enter-delay`; carousel cards rise with the `card-in` transform/opacity keyframe. Never put `enter` on an element that positions itself with `translate`; wrap it.
- Every effect needs a fallback and must respect `prefers-reduced-motion`; nothing visual may be required to complete a lesson.

## Performance rules

- Animate only `transform`, `opacity` and `clip-path`; keyframes on those run on the compositor. Avoid animating custom properties or `filter` on large elements.
- Values written every frame (`--tilt-*`, `--glow-*`, `--drag`, `--slide-*`) are registered in `tokens.css` with `@property … inherits: false` and written on the element that consumes them. An inherited custom property written on an ancestor restyles the whole subtree on every frame; a descendant that needs the value opts in with `--name: inherit`.
- Do not transition an inherited custom property (such as `--accent`) on a large container; it restyles every descendant per frame.
- Memoize list items that re-render on selection changes (`PathCard` is `memo`).
- Measure before and after with the same script at 4× CPU throttling (Long Animation Frames plus rAF intervals); the scene's own budget is visible with `?debug=perf`.

## Tests

- Unit tests sit next to their module (`*.test.ts`) and cover the pure logic: coordinator (with a fake Web Animations API), carousel drag thresholds, tilt, capabilities, progress store, track summary, routing. jsdom has no layout, so hit-testing and real input must be verified in a browser with DevTools/CDP input, not `element.click()`.
- `src/architecture.test.ts` enforces the layer rules; `src/verify/` validates every lesson.

## Writing lessons

Follow `.claude/docs/CONTENT_GUIDE.md` and `.claude/docs/CURRICULUM.md`. The verify suites enforce: the solution passes every test, the starter fails at least one, at least 2 hints separated by `---`, a non-trivial `approach.md`, theory over 200 characters, a challenge or a quiz in every lesson, and a `✓` in CURRICULUM.md for every written lesson. Write `meta.json` last. Check library APIs against the type definitions in `node_modules` instead of relying on memory. C# and Python lessons assume no prior programming language: no comparison with PHP/Magento (C#) or with any other language (Python), in lesson files and in `track.json`/`module.json`; a `## Common mistakes` section (C# theory lessons, Python practice lessons and the capstone); one beginner-mistake test, marked `# beginner mistake:` in Python practice lessons and the capstone and `// beginner mistake:` in every C# challenge (3–6 tests) (`csharp.test.ts` and `pythonConventions.test.ts` enforce it; lessons and track/module texts not yet rewritten sit in `src/verify/pythonPendingRewrite.ts`, the C# lists in `csharpPendingRewrite.ts` are empty, and a stale entry fails).

## Adding a track

New tracks are coming; follow the checklist at the end of `.claude/docs/ARCHITECTURE.md`. In short, a track on an existing engine needs no UI code:

1. `src/content/<id>/track.json`: `engine`, `order`, `title`, `monogram` (1–3 characters), `shortTitle` when the title is long (home backdrop word), `description`, `version`; then modules and lessons.
2. `[data-trail='<id>']` accent rule in `src/shared/design/tokens.css`: AA on void, panel and elevated, AA under dark text, at least 30° of hue from every other accent of a track shown to learners (hidden tracks in `featureFlags.ts` do not count; enabling one whose hue collides fails the test and the accents are revisited then). `trackPresentation.test.ts` checks it.
3. `src/verify/<id>.test.ts` with `defineChallengeSuite` (CI runs it as `Verify <id>`, listed from `track.json`; add the check to branch protection); a track whose lessons are theory and quizzes only adds a standards suite next to it, like `csharp.test.ts`, the plan in CURRICULUM.md, new libraries registered in the engine `registry.ts` and listed in CONTENT_GUIDE.md.
4. Name the track in the `index.html` meta description if it should appear there.

A new engine also needs the registrations listed in ARCHITECTURE.md (`sandbox/protocol.ts`, `sandbox/sandbox.ts`, `content/types.ts` + `content/loader.ts`, `features/lesson/monacoSetup.ts`) and its id in the engine list of `src/verify/content.test.ts`.
