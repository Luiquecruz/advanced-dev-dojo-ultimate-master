# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Dev Dojo is a browser-only learning platform (theory, test-validated coding challenges, hints, quizzes) for TypeScript, React, React State Management, React Architecture, Vue, Angular and Node.js. There is no backend: grading, previews and a fake REST API all run client-side. Everything (code, content, docs) is written in English.

## Commands

```bash
npm run dev                                                    # Vite dev server, http://localhost:5173
npm run build                                                  # tsc --noEmit + vite build (two inputs: index.html, sandbox.html)
npm run typecheck                                              # tsc --noEmit
npm run test                                                   # unit + architecture tests (everything except src/verify)
npm run verify                                                 # lesson verification (src/verify): solution passes, starter fails
npx vitest run src/shared/motion                               # one folder of unit tests
npx vitest run src/verify/<track>.test.ts                      # one track (typescript, react, react-state, architecture, vue, angular, node)
LESSON=use-effect npx vitest run src/verify/react.test.ts      # lessons whose id contains "use-effect"
LESSON=use-effect npx vitest run src/verify/content.test.ts    # structure checks only
```

Debug query params (before the `#`): `?debug=perf` shows the scene panel (fps, frame time, tier, particles, DPR, render mode, renderer count, `renderer.info`, motion state); `?tier=high|mid|low` forces a performance tier. Example: `http://localhost:5173/?debug=perf&tier=mid#/typescript`.

No linter is configured. `tsconfig.json` excludes lesson folders (`src/content/*/**`), so lesson code is only checked by `verify`.

## Documentation

All project documentation lives in `.claude/docs/` (the root `README.md` only links to it). Read the relevant file before working in its area, and update it in the same change when you alter what it describes.

| Document | Covers | Read before |
| --- | --- | --- |
| `.claude/docs/ARCHITECTURE.md` | frontend layers and rules, data flow, state and storage, engines, sandbox, adding a track, an engine or a UI feature, track presentation rules | touching engines, adding a track, adding or moving a slice |
| `.claude/docs/CONTENT_GUIDE.md` | lesson file format, `track.json` fields, test globals per engine, fake REST API data, installed library versions, verification commands | writing or fixing a lesson |
| `.claude/docs/CURRICULUM.md` | every track, its modules and lessons; `✓` marks written lessons and the rest is the backlog | adding lessons or planning a track |
| `.claude/specs/` | the visual and motion spec (Portuguese) | changing the scene, motion or the visual system |

Docs are kept honest by tests: `src/verify/curriculum.test.ts` (every written lesson is `✓` in CURRICULUM.md and every `✓` exists), `src/verify/trackPresentation.test.ts` (accent rules), `src/architecture.test.ts` (layer rules described in ARCHITECTURE.md).

## Source map

The UI follows feature-sliced design. Import with the `@/` alias (`@/shared/ui/icons`, `@/features/lesson`). `src/architecture.test.ts` enforces the rules below, so run `npm run test` after moving code.

| Layer | Path | Holds | May import |
| --- | --- | --- | --- |
| app | `src/app/` | `App.tsx` (composition root), `routing/router-adapter.ts` (route → layers, motion, scene), `layout/ActivityShell.tsx`, `styles.css` (Tailwind entry) | everything |
| pages | `src/pages/{home,track,lesson}/` | one screen per route: `HomePage`, `TrackPage`, `LessonPage` | features, entities, shared, domain |
| features | `src/features/{lesson,curriculum,path-carousel,ambient-scene}/` | user-facing capabilities | entities, shared, domain |
| entities | `src/entities/{progress,track}/` | domain state and domain widgets: progress store, `summarizeTrack`, `TrackLogo` | shared, `@/content` |
| shared | `src/shared/{ui,motion,scene,capabilities,design,routing,lib}/` | framework-agnostic building blocks, no course knowledge | shared only |
| domain | `src/content/`, `src/engines/`, `src/sandbox/`, `src/verify/` | lessons, grading engines, sandbox iframe, lesson verification | never the layers above |

- Pages, features and entities never import a sibling slice of the same layer.
- Another feature or entity is reached only through its `index.ts` (public API, explicit named exports). Shared is imported by deep path.
- Relative imports stay inside their own slice.
- `shared` never imports `content`, `engines` or `sandbox`; types that cross layers (e.g. `SceneTarget`) live in the lower layer.

## Domain: content, engines, sandbox

- **`src/content/`**: lessons as plain files. `content/index.ts` globs the files (eager, `?raw` for text) and `content/loader.ts` (`buildTracks`) builds `tracks → modules → lessons → challenge variants`. Numeric folder prefixes set order and are stripped from ids. A lesson folder only exists once it has `meta.json`. Single-file `starter.<ext>`/`solution.<ext>` are renamed to the engine default entry (`DEFAULT_ENTRY`); multi-file challenges use `starter/` + `solution/` folders and need `entry` in `meta.json`. Each `track.json` declares its `engine`, so several tracks share one engine (`react-state` runs on `react`), or `languages` for a multi-language track: each lesson then ships `variants/<language>/` challenges, the learner picks the language in the editor toolbar (`LanguageSwitch`), and every challenge carries its own `engine` (use `challenge.engine`, not `track.engine`). Languages are registered in `content/languages.ts`; details in ARCHITECTURE.md "Multi-language challenges". `content/featureFlags.ts` (`TRACK_FLAGS`, code only) hides disabled tracks (`vue`, `angular` today): the UI reads `availableTracks`/`availableTrackById`, verification keeps using `tracks`/`trackById`.
- **`src/engines/`**: two families. *Static* (`typescript/`): TypeScript compiler API in Web Workers; tests are a Markdown DSL (`tests.md`, parsed by `testsDsl.ts`). *Framework* (`react/`, `vue/`, `angular/`, `node/`): each exports a `FrameworkAdapter`; `node/` has no preview and runs Node built-ins implemented in the browser (`node/runtime/`: in-memory `fs`, `http`, `process`, timers, crypto, util) plus Hono; `shared/` holds `transpile()` with a loop guard, a tiny CommonJS loader, the test runner, Jest-like `expect`, the fake `/api/*` server and the fake model provider (`fakeModel.ts`, exposed by the Node.js engine as `@dojo/ai`; never call real models, see CONTENT_GUIDE.md "Fake model"). Learner code can only import what the engine's `registry.ts` registers.
- **`src/sandbox/` + `sandbox.html`**: framework code never runs in the app window. `features/lesson/runner.ts` creates a hidden iframe per test run (`mode=test`) or program run (`mode=run`, Node.js **Run** button, console streamed back) and `PreviewFrame` keeps a persistent one (`mode=preview`), talking through `sandbox/protocol.ts`. The TypeScript engine grades and runs in workers instead.
- `vite.config.ts` defines the `@/` alias, aliases `vue` to the full ESM build and `@vue/compiler-sfc` to its browser build; Vitest runs in jsdom and inlines `@angular`/`@ngrx` deps.

## State and storage

- **Route**: hash routing in `shared/routing/route.ts` (`#/`, `#/<track>`, `#/<track>/<lesson>`) read with `useSyncExternalStore`; no router library. Routes decide content only.
- **Motion state**: `motionCoordinator` (`shared/motion/coordinator.ts`, states in `states.ts`) is an external store read with `useMotionState`. `useMotionRouting` in `app/routing/router-adapter.ts` turns route changes into `go()` calls; the scene target follows the motion state (`sceneTargetFor`), not the route.
- **Progress**: `entities/progress/progressStore.ts` is an external store (`useProgress()` to read in React, `progress.getState()` outside, `progress.*` to write) persisted to `localStorage` (`dev-dojo:progress:v1`, debounced 300ms). It holds completed challenges/quizzes (a challenge passed in any language completes it; `challengeLanguages` records each passing language), quiz answers, visited lessons, the last lesson and the chosen language per track, and the learner code per lesson and language (`codeKeyFor`). Derived data (`summarizeTrack`, `isLessonComplete`) is computed, never stored.
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

Follow `.claude/docs/CONTENT_GUIDE.md` and `.claude/docs/CURRICULUM.md`. The verify suites enforce: the solution passes every test, the starter fails at least one, at least 2 hints separated by `---`, a non-trivial `approach.md`, theory over 200 characters, a challenge or a quiz in every lesson, and a `✓` in CURRICULUM.md for every written lesson. Write `meta.json` last. Check library APIs against the type definitions in `node_modules` instead of relying on memory.

## Adding a track

New tracks are coming; follow the checklist at the end of `.claude/docs/ARCHITECTURE.md`. In short, a track on an existing engine needs no UI code:

1. `src/content/<id>/track.json`: `engine`, `order`, `title`, `monogram` (1–3 characters), `shortTitle` when the title is long (home backdrop word), `description`, `version`; then modules and lessons.
2. `[data-trail='<id>']` accent rule in `src/shared/design/tokens.css`: AA on void, panel and elevated, AA under dark text, at least 30° of hue from every other accent (only the 303°–321° magenta band is free). `trackPresentation.test.ts` checks it.
3. `src/verify/<id>.test.ts` with `defineChallengeSuite`, the plan in CURRICULUM.md, new libraries registered in the engine `registry.ts` and listed in CONTENT_GUIDE.md.
4. Name the track in the `index.html` meta description if it should appear there.

A new engine also needs the registrations listed in ARCHITECTURE.md (`sandbox/protocol.ts`, `sandbox/sandbox.ts`, `content/types.ts` + `content/loader.ts`, `features/lesson/monacoSetup.ts`) and its id in the engine list of `src/verify/content.test.ts`.
