# Roadmap and Backlog — Python Track

Product view of the track: why it exists, how we know it works, in what order the remaining modules ship, who can write what in parallel, and where the MVP cut line sits. Lesson contracts live in [03-curriculum.md](03-curriculum.md) and the per-module specs (04–08); this file never restates them.

Status as of November 2026: module 1 (`01-object-model`, 8 lessons) is written and verified; module 2 (`02-collections`) has lessons 01–08 on disk and `09-collections-adr` pending. Superseded scope: the approved plan is 94 lessons in 12 modules (see [03-curriculum.md](03-curriculum.md) and [09-governance.md](09-governance.md)); module 2 is complete and the Pydantic module moved to the v2 backlog.

## Learner value

> A TypeScript/JavaScript developer who finishes the track can predict what Python code does before running it (names, mutability, protocols, scopes, async scheduling), knows which JS habit each feature breaks, and can defend a design choice in an ADR. All of it in the browser, with no install.

What makes it different from a generic Python course: every lesson contrasts with JS/TS, every challenge builds a language mechanism (not a puzzle), and every module ends with a decision, not a recap.

## Success metrics

The app has no backend and no telemetry, so learner behavior is visible only inside each learner's `localStorage` (`dev-dojo:progress:v1`). Metrics are split by where they can actually be read.

### Build-time metrics (repo, measured on every change)

| Metric | Source | Target |
| --- | --- | --- |
| Lessons written / planned | folders with `meta.json` under `src/content/python/` vs [03-curriculum.md](03-curriculum.md) | 94/94 at M5 (v2 backlog excluded) |
| Verify green | `npx vitest run src/verify/python.test.ts` and `content.test.ts`, `curriculum.test.ts` | 100% green on `main`, always |
| Starter fails, solution passes | enforced by `challengeSuite.ts` | every practice, ADR and capstone lesson |
| Convention compliance | conventions test (backlog `PY-T02`) | 0 violations |
| Verify wall time for the track | vitest duration of `python.test.ts` | under 3 min for the full track on a dev laptop; if exceeded, split the suite per module |
| Authoring time per lesson | author log in the PR description (start/end hours), cross-checked with `git log --follow` on the lesson folder | Q ≤ 2 h, P ≤ 5 h, A ≤ 4 h median after module 3; a lesson over 2× its size class triggers a retro |
| Defects found after merge | lessons reopened (fix commits touching a lesson folder after its first merge) | ≤ 1 per module |

### Run-time metrics (browser, one learner at a time)

Computable from `ProgressState` without any new storage; readable today in DevTools, later in a local debug panel (`PY-T05`).

| Metric | Derivation |
| --- | --- |
| Funnel per module | `visited` → `quizzes` (maps) → `challenges` → ADR challenge passed |
| Lesson completion rate | `isLessonComplete` over lessons of the track (`summarizeTrack`) |
| Drop-off lesson | first visited lesson with no completed challenge, per module |
| Quiz first-try accuracy | `quizAnswers` vs the answer index |
| Return rate | `lastLesson.python` set and later than the first visit (needs a timestamp: open question 3) |
| Pyodide cold start | `performance.mark` around `warmUpPython()`; target under 6 s on a broadband connection, cached runs under 1.5 s |

Aggregated learner metrics (across people) need either a backend or an opt-in "export my progress" JSON that the product owner collects by hand. Both are open questions, not commitments.

## Milestones

Each milestone ends with `npm run typecheck`, `npm run test`, `npm run verify` green, `✓` in CURRICULUM.md for every new lesson, and one browser pass per module (starter fails, solution passes, Run demo prints).

| Milestone | Scope | Lessons | Exit criteria | Why in this position |
| --- | --- | --- | --- | --- |
| **M0** Foundation | finish module 2 (`09-collections-adr`); scaffolder, conventions test, curriculum count test; Pyodide feature spike for modules 9–12 | 1 (+16 done) | modules 1–2 verified; `PY-T01..T03` merged; `PY-S01` report recorded in this file | Tooling first makes every later lesson cheaper; the spike de-risks the advanced half before authors are assigned |
| **M1** Callables and classes (MVP) | 03-functions, 04-classes | 20 | 37 lessons verified; MVP checklist below passed | Functions and classes are where JS habits break the hardest (mutable defaults, late binding, descriptors, MRO); with modules 1–2 they form a coherent "Python data model for TS devs" product |
| **M2** Protocols in motion | 05-iteration, 06-context-and-errors | 17 | 54 lessons verified | Generators and context managers are prerequisites of async (`async with`, `ExceptionGroup`) |
| **M3** Everyday Python | 07-stdlib, 08-pattern-matching | 16 | 70 lessons verified | Low risk, high reuse value; independent of the advanced half |
| **M4** Typing and async | 09-typing, 10-async | 20 | 90 lessons verified; async tests deterministic (10 consecutive verify runs without a flaky failure) | Highest Pyodide risk, gated by `PY-S01`; typing precedes async because the capstone uses protocols |
| **M5** Internals, tooling, capstone | 11-metaprogramming, 12-tooling incl. capstone | 18 | 108 lessons verified; capstone passes; track marked complete in CURRICULUM.md | Metaprogramming hooks into everything before it; the capstone combines 04, 06, 09, 10, 12 |
| **M6** Pydantic bonus | 13-validation | 7 | spike `PY-S02` decision recorded in ARCHITECTURE.md; module shipped as practice (spike passes) or quiz-only (spike fails) | Optional, depends on vendoring wheels; must not delay the core path |

Module order inside the track never changes (the curriculum is linear for learners); only *authoring* order may overlap, as below.

## Parallel authoring

Every module lives in its own folder, so two authors never touch the same lesson file. The shared files are:

| Shared file | Conflict risk | Rule |
| --- | --- | --- |
| `.claude/docs/CURRICULUM.md` | high, every lesson adds a `✓` | each author edits only their module's sub-section; rebase before merge; one module per PR |
| `.claude/docs/python-track/*.md` | low | spec changes go through the spec owner, not lesson PRs |
| `.claude/docs/CONTENT_GUIDE.md` / `ARCHITECTURE.md` | low | only spikes and tooling touch them |
| `src/verify/python.test.ts` | none | one suite for the track, no per-module edits |

Content dependencies are conceptual (theory may reference earlier lessons by name), and the specs already fix every contract, so a later module can be written before an earlier one is merged as long as it does not link to a lesson that does not exist yet (`curriculum.test.ts` would not catch a dangling prose reference, reviewers must).

Recommended lanes after M0:

| Lane | Modules, in order | Notes |
| --- | --- | --- |
| A | 03-functions → 05-iteration → 07-stdlib | functions before generators keeps closures and decorators fresh |
| B | 04-classes → 06-context-and-errors → 08-pattern-matching | class patterns (08) assume dataclasses (04) |
| C (after `PY-S01`) | 09-typing → 11-metaprogramming | both lean on `inspect`, annotations, `__init_subclass__` |
| D (after `PY-S01`) | 10-async → 12-tooling (lessons 01–08) | async needs the most Pyodide verification |
| Final, single author | 12-tooling/09-capstone, then 13-validation | the capstone must be written after 04, 06, 09, 10 are merged |

With two authors, run lanes A and B for M1–M3, then C and D for M4–M5. With one author, follow the module order.

## Backlog

Sizes in author-hours: **S** ≤ 2 h, **M** 2–6 h, **L** 6–12 h. Module rows sum their lessons (Q = S, P = M, Ad/E practice = L, A = M). `Dep` lists ids that must be merged first.

### Spikes and tooling

| Id | Title | Module/lesson | Type | Size | Dep | Acceptance criteria (testable) |
| --- | --- | --- | --- | --- | --- | --- |
| PY-S01 | Pyodide feature checks for modules 9–12 | 09, 10, 11, 12 | spike | M | — | a throwaway `pythonGrader()` test per feature, green in `npm run verify` and in the browser: `typing.get_type_hints`, PEP 695 generics, `annotationlib`/deferred annotations (3.14), `TypedDict`, `@overload` registry; `asyncio.TaskGroup`, `asyncio.timeout`, `Queue`, `Semaphore`, cancellation inside the 4 s harness timeout; `inspect.signature`, `sys._getframe`, `traceback`, `weakref` stability, `dis` import; custom `importlib` finder; results table appended to this file; failing features moved to theory/quiz in the module spec |
| PY-S02 | Pydantic wheels in Pyodide | 13-validation | spike | L | — | answers the 5 questions of [08](08-module-13-and-capstone.md): wheel names, versions and total size for `pyodide@314.0.7`; served from the app origin with zero CDN requests (Network panel); loaded only for the Python track (startup time of a module 1 lesson unchanged within 10%); loads under `npm run verify`; decision recorded in ARCHITECTURE.md |
| PY-S03 | Async determinism budget | 10-async | spike | S | PY-S01 | 20 consecutive runs of a sample `TaskGroup` + `asyncio.timeout` test with delays ≤ 50 ms show 0 failures in Node and browser |
| PY-T01 | Lesson scaffolder | all | tooling | M | — | `node scripts/new-python-lesson.mjs <module> <NN-lesson> --kind P|Q|A` creates the folder with `theory.md` (template headings, `## When to choose it` last), `challenge.md`, `starter/main.py` with `# TODO`, `solution/main.py`, `tests.py` with one `@test`, `hints.md` with `---`, `approach.md`, `quiz.json` skeleton, and **no** `meta.json`; refuses to overwrite an existing folder; generated folder is ignored by the loader until `meta.json` exists |
| PY-T02 | Python conventions test | all | tooling | M | — | `src/verify/pythonConventions.test.ts` fails when: a challenge lesson lacks `entry`; a lesson with `demo.py` lacks `run`; theory does not end with `## When to choose it`; theory lacks a `ts` fence; a `Status as of` blockquote has no month and year; tags do not start with a maturity tag; `tests.py` has fewer than 3 or more than 6 `@test`, or duplicate names; `quiz.json` has fewer than 4 or more than 6 questions or every answer at the same index; an ADR lesson does not export `ADR` and `PLAN`; each rule covered by a fixture that must fail |
| PY-T03 | Curriculum count test | all | tooling | S | — | a test recomputes module sizes and kind totals from the folders and from CURRICULUM.md and fails when they diverge from [03-curriculum.md](03-curriculum.md) for written modules |
| PY-T04 | Per-module verify filter | all | tooling | S | — | `LESSON=python/<module-id>` (or a documented equivalent) runs one module only; documented in CONTENT_GUIDE.md |
| PY-T05 | Local progress debug panel | app | tooling | M | — | `?debug=progress` shows, for the current track, the funnel (visited/quiz/challenge per module) and drop-off lesson from `ProgressState`; no new storage keys; hidden without the query param |
| PY-T06 | Pyodide cold-start measurement | engine | tooling | S | — | `performance.mark`/`measure` around `warmUpPython()`; value visible in `?debug=perf`; baseline recorded in this file |
| PY-D01 | Authoring playbook | docs | docs | S | PY-T01, PY-T02 | one page in this folder: scaffold → write → verify → browser pass → `✓` → `meta.json`; PR checklist with the author-hours log |

### Content

| Id | Title | Module/lesson | Type | Size | Dep | Acceptance criteria (testable) |
| --- | --- | --- | --- | --- | --- | --- |
| PY-C02 | Collections ADR | 02-collections/09-collections-adr | lesson | M | — | `LESSON=python/collections-adr` verify green; starter fails; `✓` in CURRICULUM.md; module 2 browser pass |
| PY-C03 | Functions and callables | 03-functions (10) | lesson | L ×10 (≈ 42 h) | PY-T01, PY-T02 | 10 lessons, each verify green and convention test green; browser pass; `✓` × 10 |
| PY-C04 | Classes and descriptors | 04-classes (10) | lesson | ≈ 48 h | PY-T01, PY-T02 | as PY-C03; descriptors and `__set_name__` tests cover get/set/delete |
| PY-C05 | Iterators and generators | 05-iteration (8) | lesson | ≈ 36 h | PY-T02 | as PY-C03; no test relies on exhausting an infinite iterator without `islice` |
| PY-C06 | Context managers and exceptions | 06-context-and-errors (9) | lesson | ≈ 42 h | PY-T02 | as PY-C03; JS `using` status dated in theory |
| PY-C07 | Standard library in practice | 07-stdlib (10) | lesson | ≈ 40 h | PY-T02 | as PY-C03; no `zoneinfo`, `pathlib` only on the in-memory FS |
| PY-C08 | Pattern matching | 08-pattern-matching (6) | lesson | ≈ 22 h | PY-T02 | as PY-C03 |
| PY-C09 | Type hints | 09-typing (10) | lesson | ≈ 40 h | PY-S01 | as PY-C03; no challenge depends on mypy or pyright |
| PY-C10 | Async and concurrency | 10-async (10) | lesson | ≈ 44 h | PY-S01, PY-S03 | as PY-C03; 10 consecutive verify runs with no flaky failure |
| PY-C11 | Metaprogramming | 11-metaprogramming (9) | lesson | ≈ 46 h | PY-S01 | as PY-C03; no assert on bytecode or `id()` |
| PY-C12 | Tooling | 12-tooling/01–08 | lesson | ≈ 26 h | PY-S01 | as PY-C03; mostly quiz lessons, practice ones pure functions over injected prefixes |
| PY-C12C | Capstone: async rules engine | 12-tooling/09-capstone-async-rules-engine | lesson | L | PY-C04, PY-C06, PY-C09, PY-C10 | 8 tests from [08](08-module-13-and-capstone.md) green on the solution; the starter fails all coherence tests |
| PY-C13 | Pydantic v2 bonus | 13-validation (7) | lesson | ≈ 30 h (≈ 14 h quiz-only) | PY-S02 | practice lessons if the spike passes, otherwise quiz-only; decision linked from CURRICULUM.md |

Total content estimate: ≈ 430 author-hours for modules 3–13 at the target rates; M1 alone is ≈ 90 h.

## Cut line

**MVP = modules 1–4 (37 lessons, M0 + M1).** It already answers one coherent question: *how does Python's object and data model differ from JavaScript's?* Names and mutability, collections and protocols, callables, classes and descriptors, each closing with an ADR. A learner can finish it in a few evenings and it does not touch any high-risk Pyodide area.

MVP ships when:

- [ ] 37 lessons verified, `✓` in CURRICULUM.md, convention test green.
- [ ] Every module had a browser pass on desktop and on a narrow screen.
- [ ] Pyodide cold start measured and recorded (`PY-T06`).
- [ ] The track page states honestly that modules 5–13 are coming (CURRICULUM backlog rows are visible; no empty modules in the UI).

**After MVP, in value order:** M2 (iteration, errors), M3 (stdlib, matching), M4 (typing, async), M5 (metaprogramming, tooling, capstone). **Can wait indefinitely:** M6 (Pydantic) and the expert-level quiz lessons (`08-bytecode-and-the-interpreter`, `09-threads-processes-and-the-gil`) if authoring time is short; they are the least decision-oriented content.

## Open questions for the product owner

1. **Release unit**: ship the track publicly at MVP (37 lessons) behind no flag, or keep it in `TRACK_FLAGS` until M3?
2. **Learner analytics**: stay strictly local (debug panel only), add an opt-in "export my progress" JSON, or accept a minimal backend later? Aggregated funnel metrics are impossible without one of the last two.
3. **Timestamps in progress**: may we add `firstVisitedAt`/`completedAt` to `ProgressState` (a `v1` → `v2` migration) to measure time per lesson and return rate?
4. **Authors**: how many people write in parallel? The lane plan assumes two; with one, the estimate is about 10 weeks of 40 h for modules 3–12 (≈ 400 h).
5. **Pydantic**: is a quiz-only module 13 acceptable if the wheels cannot be served from the app origin, or should the module be dropped?
6. **Expert content**: keep metaprogramming internals (frames, bytecode) in the core path or move them to a bonus module like Pydantic?
7. **Accent rule**: this track takes the last 30° hue band; is revisiting the rule now in scope, or deferred to the tenth track?
8. **Definition of done for "reviewed in the browser"**: is one pass per module enough, or do you want a pass per lesson for practice lessons?
