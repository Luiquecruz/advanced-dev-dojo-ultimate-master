# Internationalization plan (en, pt, es)

Plan for a locale switch in the top-right corner that changes the platform language between English (`en`), Portuguese (`pt`) and Spanish (`es`). This document is a survey and a proposal: nothing described here exists yet. The word **locale** is used for the interface language everywhere, because `language` already means the challenge programming language (`LanguageId`, `progress.language`, `LanguageSwitch`, `content/languages.ts`).

## 1. Findings

| Fact | Evidence |
| --- | --- |
| Single locale today: English, hardcoded in JSX | `index.html` (`<html lang="en">`, English meta description and title); every `.tsx` under `src/pages`, `src/features`, `src/entities`, `src/shared/ui` |
| No i18n code, no `Intl` usage outside content | `grep` over `src` finds none in the UI layers |
| About 28 UI components, about 2,800 lines of TSX | `src/pages/{home,track,lesson}`, `src/features/{lesson,curriculum,path-carousel,ambient-scene}`, `src/entities/track`, `src/shared/ui`, `src/app` |
| 789 lessons, about 1.36 M words of prose | theory 569 k words (`theory.md`), challenge/hints/approach 348 k, quizzes 274 k (`quiz.json`), concepts 109 k (`concepts.json`), `meta.json` 58 k |
| Lesson text is read by build-time code only | `plugins/contentPlugin.ts` reads `src/content` from disk, `buildTracks` (`src/content/loader.ts`) assembles `Track` objects, `splitCatalog` splits catalog (title, summary, tags per lesson) from lazy per-lesson bodies (`virtual:dojo-content/lesson/<track>/<lesson>`) |
| Catalog is one eager module carrying every title and summary of every track | `catalogModule()` in `plugins/contentPlugin.ts`; `track.json`, `module.json` titles and descriptions are in it too |
| Routes carry no locale; ids are language independent | `src/shared/routing/route.ts` (`/`, `/:trackId`, `/:trackId/:lessonId`), `BrowserRouter basename=BASE_URL` in `src/main.tsx` |
| Progress is keyed by lesson key and track id, not by text | `src/entities/progress/progressStore.ts`: `dev-dojo:progress:v1`; quiz answers are stored as indexes |
| SPA fallback already serves `index.html` for every path | `netlify.toml`: `/*` to `/index.html` with 200 |
| Layer rules block cross-slice imports, `shared` may not import `content` | `src/architecture.test.ts`; `.claude/docs/ARCHITECTURE.md` |
| Standards suites read English text and assert on it | `src/verify/trackStandards.ts`, `noDates.ts`, `csharp.test.ts`, `pythonConventions.test.ts`, `content.test.ts`, `curriculum.test.ts` |
| Top-right is free on the lesson and track screens; home has a vertical index rail on the right edge | `HomePage.tsx` (the rail at `right-5`, vertical writing mode), `ActivityShell.tsx` (`fixed inset-0 z-40`) |
| Learner-facing strings are also produced outside React | Error reports (`shared/monitoring`), `ReportProblemDialog`, engine messages (compile errors, test runner output in `engines/*`), Monaco labels (`features/lesson/monacoSetup.ts`) |

Consequence: the work is two independent problems with different sizes. Interface chrome is small (about 300 to 500 strings). Lesson content is huge (about 1.36 M words per language, about 4 M words for pt and es together) and cannot be a prerequisite for shipping the switch.

## 2. Scope

### 2.1 Translated

| Area | Examples | Phase |
| --- | --- | --- |
| UI chrome | buttons, tabs (Briefing, Challenge, Quiz), labels, empty states, error and loading messages, dialogs, `aria-label`, `title`, tooltips, the rotating headline words, progress text ("3 of 12"), the "Report a problem" dialog, document title and meta description | 1 |
| Catalog text | track title/description, module title/description, lesson title/summary/tags text (the `meta.json`, `module.json`, `track.json` text fields) | 2 |
| Lesson body | `theory.md`, `concepts.json`, `challenge.md`, `hints.md`, `approach.md`, `quiz.json` (questions, options, explanations), `resources[].label` | 3 onward |
| Docs | README note on locales, new `i18n` document | 1 |

### 2.2 Never translated

- Code in `starter`, `solution`, `variants/*`, test files (`tests.ts`, `tests.py`, `tests.cs`, `tests.md` DSL keywords), identifiers, file names, folder names, ids, lesson keys, `track.json` `engine`, `monogram`, `level` values, `tags` machine values, URLs.
- Test names (`test("...")`, `## type: ...`, `[Test("...")]`, `@test`): they are matched against `challenge.md` and shown in the report; keep them English in phase 3 (see 5.4).
- Technical terms in the glossary (section 7.1), fenced code blocks, inline code spans, error codes (`CS1002`), library names.
- Compiler and runtime output (TypeScript diagnostics, Python tracebacks, Roslyn messages): they come from the engines in English. Translating them is out of scope; the UI says so once.

### 2.3 Edge items to decide per area

- Monaco UI strings (find widget, context menu): Monaco ships `monaco-editor/esm/nls.messages.<locale>.js`; load per locale in phase 1 if the bundle cost is small, otherwise leave English and document it.
- The fake model provider and fake REST API data (`engines/shared/fakeModel.ts`): data stays English; lesson text may translate the story around it.
- Sentry: reports stay English, the locale is added as a tag.

## 3. Library choice

Constraints: Vite 8, React 19, no backend, feature-sliced layers, strings consumed in React and in non-React code (monitoring, engines' UI-facing messages), plural rules needed ("1 lesson" / "2 lessons", pt and es plurals differ from en only slightly, but `Intl.PluralRules` must be the source), bundle weight matters (the home page loads Three.js lazily and is performance budgeted).

| Option | Size (min+gzip, approximate) | Lazy catalogs | ICU plurals | Type-safe keys | Extraction | Fit |
| --- | --- | --- | --- | --- | --- | --- |
| react-i18next + i18next | about 15 to 20 kB | yes (dynamic `import()` per locale, `addResourceBundle`) | with `i18next-icu` plugin, or the built-in suffix plurals (`_one`, `_other`) using `Intl.PluralRules` | good, with typed resources (`declare module 'i18next'`) | `i18next-parser` | Mature, hook-based, works outside React (`i18next.t`). Most moving parts and a plugin ecosystem the project does not need |
| FormatJS (react-intl) | about 20 kB plus polyfill concerns | manual (`IntlProvider` messages prop; load catalog yourself) | native ICU MessageFormat | weak by default (ids are strings) | `@formatjs/cli extract` with a good compile step | Strong ICU, heavier, provider-centric; usage outside React needs `createIntl` |
| Lingui | about 3 kB core plus the macro/compiler runtime | yes, catalogs compiled per locale and imported dynamically | native ICU | good with the macro | `lingui extract` built in, PO or JSON catalogs, translators' tooling | Best extraction story and smallest runtime. Needs a Babel or SWC macro plugin in Vite 8 (verify support for the Rolldown based toolchain before adopting); macro adds build coupling |
| Tiny custom store (`createI18n` in `shared/i18n`) | under 2 kB | yes, one `import()` per locale | `Intl.PluralRules` and a small `{count, plural}` helper, or no ICU at all | full control: keys derived from the English dictionary type | a 50 line script plus a test that diffs key sets | Matches the project style (the progress store and motion coordinator are external stores read with `useSyncExternalStore`), no dependency, usable from non-React code |

Recommendation: a **custom typed store**, `src/shared/i18n/`, in phase 1.

- Reason 1: the interface chrome is small and structurally simple, so the main benefit of a library (extraction and workflows for tens of thousands of strings) does not apply to it; the large content volume does not go through a runtime message library at all (it is Markdown and JSON files handled by the loader, section 6).
- Reason 2: zero runtime dependency, about 2 kB, no macro toolchain risk on Vite 8, and the architecture tests keep working (`shared/i18n` imports nothing above shared; `content` is not imported).
- Reason 3: type-safe keys come for free: `en.ts` is the source dictionary (`as const`), `pt.ts` and `es.ts` are `Dictionary` typed, so a missing or extra key is a `tsc` error.
- Fallback decision: if the owner expects frequent copy changes by non-developers or more than three locales soon, switch the chrome to Lingui (catalog extraction and PO tooling). The store API (`useTranslation()` returning `t`, `plural`, `format`) is the seam, so the swap touches `shared/i18n` only.

API sketch (shape, not final):

- `type Locale = 'en' | 'pt' | 'es'`; `LOCALES` registry with `{ id, nativeName, htmlLang, intlTag }` (`English`, `Português`, `Español`; `en`, `pt-BR`, `es`).
- `i18n.getState()`, `i18n.setLocale()`, `useLocale()`, `useTranslation()` returning `t(key, params?)`, `plural(key, count)`, and `formatNumber`, `formatDate` bound to `Intl`.
- Dictionary files: `src/shared/i18n/messages/en.ts` (eager, source of truth and fallback), `pt.ts`, `es.ts` (lazy `import()`).
- Non-React code receives the translator by injection (monitoring takes a `t` argument; engines do not translate).
- Dictionaries are grouped by slice prefix (`home.*`, `lesson.*`, `curriculum.*`, `common.*`) so each slice owns its keys and the review stays local.

Use `pt-BR` as the Portuguese variant; the audience is Brazilian (owner and contributors). Spanish uses neutral Latin American Spanish (`es`), not `es-ES`, unless the owner says otherwise (open decision D3).

## 4. Switch placement, accessibility, persistence

### 4.1 Placement

- One component `LocaleSwitch` in `src/shared/ui/LocaleSwitch.tsx` (presentational, props: `locale`, `onChange`, labels). A thin wired instance lives in `src/app/layout/` and is rendered by `App.tsx` once, outside the routed page, so there is exactly one switch on every screen, like the ambient scene.
- Position: a fixed top-right control (`fixed top-3 right-3 z-50`) above the activity shell (`z-40`) and below dialogs (`bg-scrim` overlays). On home, the right-edge vertical index rail sits at `top-1/2`, so the corner is free. On the lesson screen it must not cover the header actions: reserve space in `LessonPanel`/`LessonPage` header (right padding) or place the switch inside the lesson header slot via a small portal target `data-locale-slot`. Decision at implementation: prefer reserved padding, no portal.
- Visual: a button showing the current locale code (`EN`, `PT`, `ES`) with a globe icon (add to `shared/ui/icons.tsx`), opening a small menu (`role="menu"` is not needed; use a native `<select>`-like listbox via `button` + `ul role="listbox"`) of three options. Flags are avoided as the primary control: flags represent countries, not languages (pt is spoken in Brazil and Portugal, es in many countries), and flags alone fail screen readers. If the owner wants flags, render them as decoration next to the name (`aria-hidden`), never alone (open decision D4).
- Option labels are the native names (`English`, `Português`, `Español`) with `lang` attributes on each option, so a screen reader pronounces them correctly regardless of the active locale.
- The drawer (`CurriculumDrawer`) is a `dialog`; while it is open the page behind is `inert`, which includes the switch. The switch stays reachable in the drawer through the header: add the same control to the drawer header only if usability testing shows the need; default is closing the drawer first.

### 4.2 Accessibility

- `document.documentElement.lang` follows the locale (`en`, `pt-BR`, `es`), set synchronously on change and at boot.
- `<title>` and `meta[name=description]` are updated from the dictionary on change (`useDocumentMetadata` in `app`).
- Lesson text rendered by `Markdown.tsx` carries the lesson's locale on its container `lang` when it falls back to English (a Portuguese UI showing an English lesson must announce `lang="en"` for that region).
- Keyboard: the trigger is a native `button`; Arrow keys move within the listbox, Enter or Space selects, Escape closes and returns focus to the trigger (same pattern as the drawer: focus returns to the opener). Touch target at least 24 px (project rule).
- Changing locale does not move focus away from the trigger and does not reload; announce the change with a polite live region ("Language changed to Português") in the new locale.
- Reduced motion: no animation on the menu beyond an opacity fade of at most 150 ms, disabled under `prefers-reduced-motion`.
- Contrast: use existing tokens (`ink`, `ink-muted`, `line`); no new colors.
- `hreflang`: only meaningful with locale URLs (section 4.4). With the recommended no-URL strategy there are no alternates to declare.

### 4.3 Persistence and detection

- Storage key `dev-dojo:locale:v1` (same family as `dev-dojo:progress:v1`), value is the locale id, wrapped in try/catch (private mode, blocked storage). Separate from the progress store: progress is exported or reset independently and has a debounce; locale must be synchronous.
- Resolution order: explicit stored choice, then the first match in `navigator.languages` (`pt*` to `pt`, `es*` to `es`, anything else to `en`), then `en`.
- No flash: an inline script in `index.html` `<head>` reads the key (or `navigator.languages`) and sets `<html lang>` before first paint; React then reads the same value synchronously during store creation. The first screen must not render English and swap, so the active dictionary must be loaded before the first render of the chrome: `main.tsx` awaits `loadLocale(initial)` (a few kB) before `createRoot().render`, but `en` is bundled so the English default never waits. The entry stays above-the-fold safe because the dictionaries are small.
- Cross-tab sync through the `storage` event, like the progress store if it does the same (verify before copying the pattern).

### 4.4 URL strategy

| Strategy | Pros | Cons |
| --- | --- | --- |
| None (locale in storage only) | Zero routing change: `route.ts`, `hrefTo`, the motion origins `data-motion-origin="lesson:<trackId>/<lessonId>"`, the sentry route patterns and every shared link stay valid. Progress and ids are untouched | No per-locale indexable URLs; a shared link opens in the recipient's own locale, which is usually desired for a learning app |
| Path prefix `/pt/...`, `/es/...` | SEO per language, shareable language-specific links, `hreflang` possible | Touches `parseRoute`, `hrefTo`, `legacyHashRedirect`, `useMotionRouting`, `BASE_URL` basename handling, every `Link`; the SPA fallback hides 404s; the Netlify rewrite stays but needs `/pt/*` and `/es/*` prerender or the crawlers see an empty shell anyway |
| Query `?lang=pt` | Cheap to read and share | Pollutes URLs, lost on navigation unless every `Link` carries it, bad for caching and SEO |

The app is a client-rendered SPA with no prerendering (`netlify.toml` serves one `index.html`), so crawlers see the same shell for every URL; path prefixes buy no SEO until there is prerendering. Recommendation: **no locale in the URL** for phases 1 to 3, with one concession: honor an optional `?lang=pt|es|en` on first load only (support and bug reports, shared "open in Portuguese" links), store it, then strip it with `replace`. Revisit path prefixes only together with a prerendering decision (open decision D5).

### 4.5 Formatting with `Intl`

- All numbers, percentages and dates formatted through `Intl.NumberFormat`/`Intl.DateTimeFormat`/`Intl.RelativeTimeFormat` bound to the active `intlTag`, built once per locale (cache the formatter instances in `shared/i18n`).
- Where dates currently appear in the UI (if any: verify during phase 1) use the helper; lesson content must not carry dates (existing rule, `src/verify/noDates.ts`).
- Progress strings ("12 of 40") use `plural` and `formatNumber`, never string concatenation.

## 5. Content strategy

### 5.1 File layout

Recommendation: **sibling files with a locale suffix**, keeping the English file as the canonical, always-present source.

```
src/content/<track>/<NN-module>/<NN-lesson-id>/
  theory.md            theory.pt.md           theory.es.md
  challenge.md         challenge.pt.md        challenge.es.md
  hints.md             hints.pt.md
  approach.md          approach.pt.md
  concepts.json        concepts.pt.json
  quiz.json            quiz.pt.json
  meta.json            meta.pt.json           (title, summary, resources labels only)
  variants/<language>/challenge.md  challenge.pt.md   (same suffix rule)
```

Track and module texts: `track.pt.json` and `module.pt.json` with only the translatable fields (`title`, `shortTitle`, `description`).

Rejected alternative, `i18n/<locale>/` mirrors: a parallel tree doubles every path, makes it easy to forget a file when a lesson is renamed or moved (lesson folders are moved and renumbered during authoring), and breaks the "one folder is one lesson" model the loader, `curriculum.test.ts` and authors rely on. Suffix files stay next to the English source and move with it.

Rules:

- `*.pt.json` carries only translatable fields. Non-text fields (`answer` indexes, `level`, `tags` machine values, `entry`, `run`, `engine`, `version`, `order`, `optional`) are read from the English file only, so a translator cannot desynchronize them. For `quiz.json` the translated file has the same shape, and verification asserts equal length, equal `options.length` per question, equal `answer`. Option order is never changed by a translator (answer index stays valid); to avoid a reorder when a translation needs a different order, the English order is the reference.
- `concepts.json`: same array length and order, `term` may be translated or kept (glossary rule 7.1).
- Missing file: fallback to English per file (a `theory.pt.md` may not exist while `quiz.pt.json` does). The UI marks a fallback region.
- `hints.md`: same number of `---` separated sections; `approach.md`: not asserted beyond non-empty.
- Code fences inside translated Markdown must be byte-identical to the English fences (verify test): a translator never edits code, and a fence that diverges is a failure.
- Challenge contract names (functions, exported names, exact texts the tests check, such as an error message string) stay as in English, because the tests assert them. Strings that a test asserts and a challenge asks the learner to produce stay English even in a Portuguese lesson; the prose around them is translated.

### 5.2 Loader, virtual modules and chunks

Current: one catalog module (all titles) plus one lazy chunk per lesson (`virtual:dojo-content/lesson/<track>/<lesson>`).

Proposed:

- `readSources()` in `plugins/contentPlugin.ts` already reads every file under `src/content`; the suffix files arrive for free in `textFiles` and `jsonFiles` keyed `./<track>/.../theory.pt.md`. `buildTracks` (`content/loader.ts`) learns to produce, for each lesson, a **base** `LessonContent` (English) and a per-locale **overlay** (only the translated fields that exist). Overlay merge is a pure function `applyLocale(base, overlay)` in `content/` so it is unit tested.
- Catalog: do not put every locale into the eager catalog module. Split titles per locale into `virtual:dojo-content/catalog/<locale>` (one small overlay: lesson title/summary, module and track text keyed by id). `tracks` stays English (fallback and ids). The catalog overlay for the active locale is loaded with the locale; for 264+ tracks' lessons this is about 100 to 150 kB raw per locale, compressed far less; check the budget before choosing eager versus lazy.
- Lesson body: one lazy chunk per lesson per locale: `virtual:dojo-content/lesson/<locale>/<track>/<lesson>` containing only the overlay. `loadLesson(entry)` loads the base chunk and, when the locale is not `en`, the overlay chunk, then merges. Overlay chunks exist only for lessons that have at least one translated file, so `lessonLoaders` carries a `locales` table `{ [lessonKey]: Locale[] }` in the catalog. This keeps English bundle size unchanged and adds output files only where translations exist; the number of emitted chunks grows with translated lessons (watch the deploy file count, 789 lessons times 2 locales is about 1,600 more chunks; confirm Netlify limits and build time; a per-module chunk is the fallback granularity).
- `shared` stays free of `content`: the locale type lives in `shared/i18n`; `content` imports it only as a type through a lower layer, which the layer rules allow because `content` is a domain, not above shared. Verify with `architecture.test.ts`; if `content` importing `shared` is not allowed by the rules as written (the test only restricts layers above), define `Locale` in `content/types.ts` and re-export it from `shared/i18n` through a type-only import in the `app` layer, or duplicate the three-literal union with a test asserting equality.
- Dev server: the watcher in `configureServer` already invalidates on any track file; suffix files need no change.
- `src/verify/*` reads `content/allContent.ts` (eager glob): extend the glob to the suffix files and expose a per-locale view `tracksForLocale(locale)` so every standards suite can run per locale (5.3).
- Hot path: `LessonRoute` lazy loads; the `?` after locale change reloads the current lesson body (one request) without remounting the editor, preserving the learner's code, which is stored by `codeKeyFor` and independent of locale.

### 5.3 Verification and standards per locale

| Suite | English today | Per locale rule |
| --- | --- | --- |
| Solution passes, starter fails (engine suites) | `src/verify/<track>.test.ts` | Locale independent: runs once on code, never per locale |
| Structure (`hints` at least 2 sections, theory over 200 characters, `approach.md` non-trivial) | `content.test.ts` | Same rule on each overlay that exists (a translated hints file must keep the section count; length thresholds scaled by locale: use a ratio against English (at least 60 percent) rather than an absolute number) |
| No dates, no changelog wording | `noDates.ts` | Add pt and es patterns (month names, "em 2024", "en 2024") or restrict to digits; keep the English rule |
| No bridges to PHP or other languages in C# and Python | `csharp.test.ts`, `pythonConventions.test.ts` | Term lists are English words; translate them into pt and es forms (`PHP` is language independent; `em PHP`, `en PHP` caught by the same regex) |
| Required section titles (`## Common mistakes`, `You need:` exact titles) | `trackStandards.ts` and the C#/Python suites | Heading text is the contract: define a locale map in `trackStandards.ts` (`Common mistakes`, `Erros comuns`, `Errores comunes`; `You need:` equivalents) and check the translated overlay against its own locale's strings. Choose the three strings once in the glossary (7.1), never per translator |
| Beginner-mistake test marker (`// beginner mistake:`, `# beginner mistake:`) | challenge tests | Tests are not translated; unchanged |
| Same test names | challenge text lists the test names the contract expects | Fenced test names and names in lists stay English; verify compares names found in `challenge.pt.md` to the English set |
| CURRICULUM.md `✓` per lesson | `curriculum.test.ts` | Unchanged: curriculum is English and locale independent; add a **Translation status** table instead (5.5) |
| Quiz alignment | none | New: equal length, equal `options.length`, equal `answer` per question; `explanation` non-empty |
| Concepts alignment | none | New: equal length and order |
| Code fence parity | none | New: the sequence of fenced blocks in `theory.<locale>.md` equals the English sequence byte for byte (language tag and body) |
| Link and resource parity | none | New: same URLs in the same order (labels may change) |

All new checks run in a `src/verify/i18n.test.ts` plus a shared helper in `src/verify/`, and a `translation-status` script (section 7.3).

### 5.4 Code comments and test names in challenges

- Comments in `starter` files are learner-facing instructions in some lessons. Option: keep comments English in phase 3, translate starter comments in phase 4 only through a `starter.pt.<ext>`... this duplicates code files and risks drift, so reject it. Decision: starter and solution code and comments stay English for every locale; the translated `challenge.md` carries the instructions. Recommendation recorded as D6.
- Test names appear in the test report shown to the learner. Showing English names under a Portuguese `challenge.md` is acceptable in phase 3 because they match the contract's quoted names; a later phase may add an optional display-name mapping in tests (not a priority; the DSL `tests.md` and the `@test`/`[Test]` forms would each need a change).

### 5.5 Progress and ids

- Nothing in progress changes: it is keyed by `lessonKey` (`track/lesson`), `trackId`, lesson id and quiz answer index. Because the quiz answer index is stored, translated quizzes must keep identical option order (enforced by 5.3).
- Locale is not stored in `dev-dojo:progress:v1`; adding it there would couple a synchronous setting to a debounced store and force a schema version bump.
- `lastLesson` and the code-per-language store are independent of locale; switching locale mid-lesson keeps the editor content.

### 5.6 Docs

- New document `.claude/docs/i18n.md` (replaces this plan once phase 1 lands): locale registry, dictionary rules, file layout, glossary, workflow.
- `CONTENT_GUIDE.md` gets a "Translations" section: suffix files, which fields translate, fallback rule, checks.
- `CONTRIBUTING.md`: PR sizing for translations, the `translation-status` check, commit scope `i18n`.
- `ARCHITECTURE.md`: `shared/i18n` slice, content overlay loading.
- `CLAUDE.md` and `README.md`: one line each (locales, commands). The docs-sync hook map in `CONTRIBUTING.md` "Documentation upkeep" gains the new areas (`src/shared/i18n/`, `src/content/**/*.{pt,es}.*`).

## 6. Phases

Sizes: S under 1 day, M 1 to 3 days, L 3 to 8 days, XL more than 8 days (one engineer). Content phases are measured in lessons, not days, because the throughput depends on review capacity.

### Phase 1: interface chrome (M to L)

Tasks:

1. `shared/i18n` store, `Locale` registry, `en` dictionary, `useTranslation`, `Intl` helpers, unit tests (S to M).
2. `LocaleSwitch` component, icon, placement, live region, a11y tests (S).
3. Extract strings from the 28 components into `en.ts` with slice-prefixed keys; replace literals with `t()` (M). Includes `aria-label`, `title`, `RotatingWords` words, document title and meta description.
4. `pt.ts` and `es.ts` drafts, native review (S, mostly review time).
5. Persistence, detection, `index.html` inline script, `<html lang>` updates, no-flash boot (S).
6. Sentry `locale` tag; `ReportProblemDialog` strings (S).
7. Tests: key parity (`en` keys equal `pt` and `es` keys, enforced also by `tsc`), a plural test, a detection test, architecture test (a hardcoded-string lint is out of scope; add an ESLint rule `no-restricted-syntax` on JSX text in `pages`, `features`, `entities` only if the noise is acceptable) (S).
8. Docs (S).

Acceptance criteria:

- Switching the locale changes every visible chrome string without reload, on home, track, lesson and the drawer; no English remains in the chrome except engine output and content.
- `<html lang>` equals the active locale; reload keeps it; first paint is in the right locale (verified with a throttled network trace and no layout flash).
- Keyboard-only and screen reader pass on the switch (focus returns, native names announced in their language).
- `npm run typecheck`, `lint`, `test` pass; the English main chunk grows by under 5 kB gzip; pt and es dictionaries load as separate chunks.
- Progress, routes and shared links unchanged.

### Phase 2: catalog text (M)

Tasks: `track.pt.json`/`module.pt.json`/`meta.pt.json` support in `loader.ts`; `catalog/<locale>` virtual module; `applyLocale`; carousel, star map, module list read the localized catalog; tests for the loader overlay and fallback; the hidden-track flags unchanged.

Acceptance criteria: with the `pt` locale and translated titles for one pilot track, carousel, track page, drawer and lesson header show Portuguese titles and summaries, other tracks fall back to English without errors; English bundle size unchanged; `curriculum.test.ts` still passes.

### Phase 3: pilot lesson body (L)

Tasks: lazy overlay chunks per lesson; `loadLesson` merge; fallback region marking with `lang`; verification suites extended (5.3); the `translation-status` script and the status table; translate one complete short module (recommended pilot: the TypeScript module 01, about 8 to 10 lessons) in pt and es end to end including quizzes; measure chunk count and build time.

Acceptance criteria: the pilot module is fully translated and passes every per-locale check; a missing overlay file falls back to English with a visible marker and correct `lang`; `npm run verify` time grows under 10 percent; no new failure in `docs:check`.

### Phase 4 and onward: tracks by priority (XL, in waves)

Priority proposal (largest audience and lowest terminology risk first, theory-heavy tracks before track with exact tool output):

1. The beginner modules and tracks: C# module 00 and 01, Python module 00 (they target learners who have never programmed, where a native-language effect is largest).
2. TypeScript, React, React State Management.
3. Node.js, Frontend Architecture.
4. System Design, AI Engineering.
5. Python, C# remainder; Java, Spring Boot and Angular once released; Vue and Angular when enabled by `featureFlags.ts`.

Rule: a locale is **released for a track** when every lesson of that track has all its overlay files (a track-level flag in `content/featureFlags.ts` style, `TRACK_LOCALES`: `{ typescript: ['pt', 'es'] }`). Until then the locale falls back per file, but the UI shows a "partially translated" badge on the track card.

Acceptance per wave: a track-level report shows 100 percent of its lessons translated for the released locale; all per-locale checks pass; the PRs of the wave stay below 300 files each.

## 7. Workflow and quality

### 7.1 Glossary

A single `.claude/docs/i18n-glossary.md` (created in phase 1) fixes the rules for every translator, human or machine:

- Kept in English in all locales: API, framework and library names, language keywords, type names, CLI commands, file names, error codes, "hook", "props", "state" (React term when it names the API), "middleware", "token", "endpoint", "commit", "branch", "pull request", "runtime", "build", "deploy", "bundle", "lint", "linter", "mock", "stub", "payload", "callback", "worker", "sandbox" and similar terms that Brazilian and Latin American developers use in English.
- Translated consistently (a table of English, pt, es): lesson, waypoint, mission, stage, star map, briefing, challenge, hint, quiz, solution, starter, theory, track, module, test, passed, failed, run, reset, progress, optional, level (beginner, intermediate, advanced, expert), "Common mistakes", "You need:" (exact headings required by the standards suites).
- Tone: second person informal (pt: `você`, es: `tú`), consistent per locale; no regional slang; no gender-marked address where a neutral form exists.
- Product vocabulary maps the Constela names: Mission, Briefing, Star map; decide whether the product names are translated or kept (open decision D7).

### 7.2 Translation process

- Draft: machine translation (a Claude model run per file with the glossary and the lesson's English context in the prompt, instructed to leave code fences and inline code untouched); the draft is committed as a normal PR, not generated in CI.
- Review: a native-speaker reviewer (technical) per locale checks terminology and meaning; the owner names the reviewers (open decision D8). A review checklist lives in `i18n.md`: glossary terms, code fences untouched, quiz explanations still justify the right answer, tone, numbers and units, no dates.
- Source changes: when an English file changes, its `pt` and `es` siblings become stale. Track staleness by a content hash: each translated file carries a first-line marker (`<!-- source: <hash> -->` for Markdown, a `"_source"` field for JSON) holding the hash of the English file it was translated from; `translation-status` reports `stale` when the hash differs. A stale translation still renders (better than English fallback), the status report lists it as work.
- Cost control: PRs over 300 files overload CodeRabbit (an existing constraint); translation PRs are cut by module (about 8 to 14 lessons, 40 to 90 files with all overlays), one locale per PR, so reviewers see one language at a time. Configure `.coderabbit.yaml` (if it exists; verify) to skip `*.pt.md`/`*.es.md` content line review and keep the verification suites and a human review as the control, or limit the path filters so the bot reviews code only.

### 7.3 `translation-status` check

- Script `scripts/translation-status.ts` (`npm run i18n:status`), reading the same sources as `contentPlugin.ts`, printing a per-track, per-locale table: translated, stale, missing files, and quiz or concept misalignments.
- CI: `npm run i18n:status -- --check` fails when (a) any **released** locale has missing or invalid files for a released track, (b) `shared/i18n` dictionaries do not share keys with `en`, (c) a translated file violates the parity checks of 5.3. Non-released work in progress never fails CI, so partial PRs merge. Add the check to branch protection with the other verify jobs, as `.claude/docs/CONTRIBUTING.md` requires for new checks.
- The status table is a generated section in `CURRICULUM.md`, produced by the script with `--check` (the Python curriculum generator `npm run python:curriculum -- --check` is the precedent), so the document stays honest through a test, not discipline.

## 8. Risks

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Content volume: about 4 M words for two locales | Months of translation and review; machine quality varies on idioms and jokes | Phase by track, fallback per file, release per track, `translation-status`, reviewers per locale |
| Stale translations after English edits | Learners see outdated or contradictory text; quiz explanation disagrees with the answer | Source hash markers, status report, rule that English quiz and test-contract edits must update siblings or mark them stale in the same PR |
| Chunk count and build time growth (virtual module per lesson per locale) | Slower CI and deploys, file count limits | Measure in phase 3; fall back to one overlay chunk per module |
| Verification suites assume English strings | False failures or silent gaps per locale | Locale map in `trackStandards.ts`, per-locale suites, parity checks |
| Quiz answer index drift in a translation | Wrong answers marked right; stored `quizAnswers` mismatch | Index and option-count parity enforced in tests; translators cannot change order |
| Tests assert English text that learners must produce | Translating a quoted string breaks the challenge | Rule 5.1: quoted contract strings stay English; fence parity check |
| Engine and compiler messages stay English | Mixed language learning experience | State it in the UI once; accept for now |
| First paint in the wrong locale | Visible flash on every load for pt and es users | Inline boot script plus awaited locale chunk before render |
| Switch overlaps existing controls on the lesson screen | Usability regression | Reserve header space, test at 900 px and below |
| Hardcoded strings creep back after phase 1 | Locale regression | Key parity test, optional ESLint JSX text rule in pages/features/entities |
| `hreflang` and SEO expectations | Owner expects ranking per language | Explain that the app is client rendered; path prefixes need prerendering (D5) |
| Machine translation of safety or security guidance | Subtle errors in security and legal-sounding text | Mandatory human review of security and system-design modules before release |
| Layer rules (`content` must not import from layers above; `shared` must not import `content`) | Type sharing for `Locale` | Define `Locale` in `shared/i18n`, import as a type in `content` only after confirming the rule in `architecture.test.ts`, or duplicate with an equality test |

## 9. Open decisions for the owner

Ordered by blocking effect, with a recommendation each.

| Id | Decision | Recommendation |
| --- | --- | --- |
| D1 | Scope of the first release: chrome only (phase 1) or chrome plus catalog (phases 1 and 2) | Ship phase 1 and 2 together: the product then looks translated at every list, and the lesson body shows a clear "available in English" marker |
| D2 | Library: custom store or Lingui | Custom store (section 3); revisit only if more than three locales or non-developer editors are expected |
| D3 | Portuguese and Spanish variants | `pt-BR` and neutral Latin American `es`; add `pt-PT` and `es-ES` only on demand |
| D4 | Flags | Native language names plus a globe icon; flags only as decoration beside the name, never alone |
| D5 | Locale in the URL | No (storage plus optional one-shot `?lang=`); revisit with prerendering |
| D6 | Starter and solution code comments | Stay English in every locale; translate only the `challenge.md` prose |
| D7 | Product vocabulary (Mission, Briefing, Star map) | Translate the descriptive words, keep "Constela" as the brand; fix the table in the glossary before phase 1 |
| D8 | Reviewers | Name one technical native reviewer per locale before phase 3; no content release without them |
| D9 | Content priority order | Beginner modules (C# 00/01, Python 00), then TypeScript and React, then the rest (section 6) |
| D10 | Whether machine drafts are committed under a `draft` marker or only reviewed text lands | Commit reviewed text only; keep drafts in the PR branch; the `translation-status` hash marker is added at review time |
| D11 | Monaco localization | Translate if the bundle cost is under 15 kB gzip per locale; otherwise keep English |
| D12 | Mixed-language display for fallback | Show the English body with a banner "Not translated yet" in the active locale and `lang="en"` on the region |

## 10. Summary of recommendations

1. Build a small typed i18n store in `src/shared/i18n/`, English eager, pt and es lazy, `Intl` helpers, locale key `dev-dojo:locale:v1`.
2. Put one `LocaleSwitch` top-right, rendered once from `App`, with native names, `lang` on options, keyboard and live-region support.
3. No locale in URLs; `<html lang>` and meta updated; inline boot script prevents flash.
4. Translate content through suffix siblings (`theory.pt.md`, `quiz.pt.json`, `meta.pt.json`), English always present, per-file fallback, overlay chunks merged in `loadLesson`.
5. Enforce parity (quiz indexes, concept order, code fences, hint sections, required headings) in new per-locale verify checks and an `i18n:status` CI gate that only fails on released locales.
6. Release a locale per track once complete; start with the beginner modules; machine draft, human review, PRs per module and per locale.
