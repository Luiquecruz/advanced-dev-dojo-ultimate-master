# Governance — Python Track

CTO review of the Python track specs ([README](README.md), [01](01-platform-and-engine.md) to [08](08-module-13-and-capstone.md)) and of the written lessons in `src/content/python/` (module 1 and module 2 lessons 01–08), as of November 2026. This file holds decisions, the quality bar, approval gates, the risk register and the spec changes.

> **Status as of November 2026:** every decision below is **approved** by the product owner, and the spec changes are applied to [README](README.md), [02](02-content-standards.md), [03](03-curriculum.md) and [05](05-modules-02-to-04.md)–[08](08-module-13-and-capstone.md). Product-owner additions: the MVP (first release) is modules 01–04; lessons cut from the 115-lesson plan go to a documented v2 backlog ([03-curriculum.md](03-curriculum.md#v2-backlog)) instead of being dropped; `TRACK_FLAGS.python = false` is set; platform hardening is assigned to SRE.

## Verdict

The foundation is sound. The repo-native format, the decision to reuse the Pyodide harness, the anti-LeetCode rule and the "Coming from TypeScript/JavaScript" section are the right calls, and the written lessons meet them: `04-scope-and-nonlocal` and `07-custom-mapping` are mechanism challenges with behavioral tests and a clear JS contrast.

The review found four problems in the 115-lesson plan, and all four are addressed by the decisions below:

1. **Scope.** 115 lessons is more than every track except AI Engineering (122), and 24 of them are quiz-only. The weakest modules are the ones a browser sandbox cannot exercise (tooling: 6 of 9 lessons are quizzes; metaprogramming internals; Pydantic).
2. **The capstone tested a design that does not work.** 50 000 events/s × 120 rules is 6 000 000 rule evaluations per second, and 8 CPU-bound rules × 3 ms × 50 000 events is 1 200 CPU-seconds per second (about 1 200 cores). One asyncio process per engine cannot do that, yet coherence rule 1 made `asyncio` the only accepted model and nothing in `PLAN` asked for sharding or capacity. The same flaw appeared in the async ADR: 50 000 events × 2 calls is 100 000 req/s against a downstream limit of 5 000 req/s.
3. **The ADR checkpoints were enum quizzes in disguise.** They tested no code. `PLAN` fields were closed enums, test names stated the expected answer ("the read volume and the latency budget rule out copying on read"), and a learner could find the passing combination by trial and error in a few runs. Thirteen checkpoints with the same shape would also tire learners out.
4. **Typing and imports came too late for this audience.** TypeScript developers write annotations and imports from day one. The standards said "type hints only when the lesson is about typing", so the code looked foreign to them until module 9, and the import system first appeared in module 12 at advanced level.

## Decisions (approved)

| # | Decision | Rationale | Applied in |
| --- | --- | --- | --- |
| D1 | The target stays **Python 3.14** (Pyodide `314.0.7`, CPython 3.14.2, pinned exactly in `package.json`). 3.15 differences go in `**Status as of**` blocks only. | 3.15 has been out since October 2026, but the runtime decides what learners can run. Content must not claim behavior the engine does not have. | README |
| D2 | **v1 has 94 lessons in 12 modules** (table below). MVP = modules 01–04, Core = 01–08, Advanced = 09–12. Cut lessons, module 13 included, go to the **v2 backlog**. | Cuts quiz-only and unverifiable lessons, merges near-duplicates, keeps every mechanism a TS developer actually trips on. Nothing is lost. | 03, README |
| D3 | **ADR checkpoints only in modules 01, 02, 04, 06, 09 and 10.** Each `PLAN` has at least one numeric field computed from the briefing, the briefing arithmetic is coherent, and test names are neutral. Modules 03 and 05 close with a code integration challenge (`10-client-middleware-stack`, `07-lazy-pipelines`). | Decision training keeps its value without the fatigue of a form per module, and computed fields make guessing more expensive than reasoning. | 02, 05–07 |
| D4 | **The capstone is a code challenge plus a short ADR**: the engine in `main.py` (Protocol rules, `TaskGroup` under a `Semaphore`, `asyncio.timeout`, `ExceptionGroup` with notes, bounded `Queue`, drain on shutdown) plus `adr.py` with per-worker numbers that are physically coherent and computed fields (workers, limits, queue size, pool size). The async ADR is rescaled the same way. | A capstone should prove the learner can build the thing, and every part runs in Pyodide's asyncio. | 08, 07 |
| D5 | **Annotations are allowed in solutions from module 03 on**, and `01-functions-map` has an "Annotations are not enforced" section. Typing challenges stay runtime-checkable and say they test introspection, not type checking. | Matches modern Python and corrects the TS prior ("types are checked") early. | 02, 05, 07 |
| D6 | **`03-functions/02-modules-and-imports`** (P, B) is added. Finders and loaders move to `11-metaprogramming/07-import-system-internals`. | Imports are a day-one concern, and the harness already supports multi-file projects. | 03, 05, 07 |
| D7 | **Source checks use `ast`, never regex over raw text.** | `re.search(r"\bglobal\b", source)` fails a correct solution whose comment or docstring says "global". | 02, 07 |
| D8 | **`TRACK_FLAGS.python = false`** until gate G4 (MVP, modules 01–04). | A half-built track in the carousel is a worse first impression than no track. | `src/content/featureFlags.ts` (done by the PO), README |
| D9 | **Any change to `dojo_harness.py` or the Python worker runs both suites** (`python` and `ai-engineering`). | One engine serves two tracks and more than 130 lessons. | README |
| D10 | **No bridges (November 2026, supersedes the "Coming from TypeScript/JavaScript" section and the JS-habit trap test).** The track assumes no prior programming language: no lesson file compares Python with another language, practice lessons and the capstone have `## Common mistakes`, and the trap test becomes the `# beginner mistake:` test, one per practice lesson. No exceptions for factual mentions. | Learners arrive without JavaScript; the tests already asserted Python behavior, so they stay and only lose their JS framing | [02](02-content-standards.md) "No bridges" and "Challenge rules", [11](11-working-agreement.md), `pythonConventions.test.ts` |

### v1 scope (94 lessons)

The authoritative tables are in [03-curriculum.md](03-curriculum.md). Summary:

| Module | 115 plan | v1 | Changes |
| --- | --- | --- | --- |
| 01-object-model | 8 | 8 | Done |
| 02-collections | 9 | 9 | Unchanged; ADR 09 gains computed fields |
| 03-functions | 10 | 10 | Add `02-modules-and-imports`; merge decorators + `wraps` into `07-decorators-and-wraps`; `cache` joins `09-callables-partial-and-cache`; the ADR goes to v2 and its briefing becomes the code challenge `10-client-middleware-stack` |
| 04-classes | 10 | 9 | `04-descriptors-and-set-name` (merged); ADR kept with a computed memory estimate |
| 05-iteration | 8 | 7 | ADR to v2; `07-lazy-pipelines` closes the module |
| 06-context-and-errors | 9 | 9 | ADR kept with computed resource and error counts |
| 07-stdlib | 10 | 8 | `09-argparse-and-cli` and the ADR to v2 |
| 08-pattern-matching | 6 | 5 | ADR to v2 |
| 09-typing | 10 | 9 | `08-typing-evolution-and-checkers` (merged quiz); ADR with a computed payload count |
| 10-async | 10 | 9 | `08-blocking-threads-and-the-gil` (merged quiz); ADR rescaled with computed limits |
| 11-metaprogramming | 9 | 7 | Frames, bytecode and the ADR to v2; `07-import-system-internals` moved in |
| 12-tooling | 9 | 4 | Map (absorbs linters), `02-packaging-and-environments` (merged quiz), `04-testing-with-unittest` (practice), `05-capstone-async-rules-engine` |
| 13-validation | 7 | 0 | v2 backlog, after the Pydantic spike (G8) |
| **Total** | **115** | **94** | Practice 72, quiz 15, ADR 6, capstone 1 |

## Quality bar: what good looks like

A lesson is done when a reviewer who did not write it can answer "yes" to every line.

**Challenge**

- It builds or repairs a language mechanism, never an algorithm. A newcomer who skipped the theory would get it wrong the way `## Common mistakes` predicts.
- **Beginner-mistake test:** at least one test fails the most common wrong implementation a newcomer writes for this mechanism (aliasing instead of copying, `==` for identity, `dict` subclass for a mapping, mutable default). That mistake is named in bold in `## Common mistakes` and marked `# beginner mistake: <text>` on the line above its `@test`; the test name states the correct behavior. The reviewer writes the wrong version once and confirms that this test fails on it and that the solution passes.
- The starter imports cleanly. It fails by assertion, not by `NameError`/`ImportError`, and every `# TODO` maps to at least one failing test.
- 3–6 tests. Each name is a sentence of the contract and **does not reveal the answer** ("the sharing choice fits the read volume", not "copy-on-read is ruled out").
- Assertions follow the harness's introspectable shape (compute into a local, then compare), so a failure prints `left:`/`right:`.
- Construct checks use `ast` (D7). There are no assertions on printed text, `id()`, bytecode, timing or folded `is`.
- Async tests are deterministic: event recorders, `await asyncio.sleep(0)` ticks, `asyncio.Event` gates, no sleep above 50 ms, total time well under the 4 s budget, and learner code never calls `asyncio.run`.
- The reviewer solves it from `challenge.md` alone in 15–30 minutes (intermediate) or 30–45 minutes (advanced; the capstone is budgeted at 60–90 minutes). Longer means split it.

**Theory and quiz**

- 300–1000 words for practice lessons (250–1000 for quiz lessons and ADRs, 200–500 for maps), template order, ending with `## When to choose it` that names a concrete alternative.
- `## Common mistakes` shows the wrong code a newcomer really writes next to the fix, not a strawman, and no lesson file compares Python with another language.
- Every volatile fact sits in a dated `**Status as of**` block, checked against docs.python.org or the PEP, and differences from 3.15 are flagged.
- Quiz questions ask for predictions or decisions. Explanations name the mechanism. Answer indexes vary.

**ADR (modules 01, 02, 04, 06, 09, 10)**

- The briefing numbers are coherent (the reviewer redoes the arithmetic) and at least one `PLAN` field is *derived* from them (a limit, a size, a count), not picked from an enum.
- Brute-force enumeration of the enum fields is never the cheapest path to green, and test names are neutral.

**Process**

- `npm run verify` is green for the lesson, plus `pythonConventions.test.ts`. It passes once in the browser with Pyodide (starter fails, solution passes, Run demo prints). `meta.json` is written last, and `npm run python:curriculum` marks the `✓`.

## Approval gates

| Gate | When | Exit criteria | Approver |
| --- | --- | --- | --- |
| G0 Platform | Before content, plus hardening now | `typecheck`, `test`, `build` green; accent passes `trackPresentation.test.ts`; Python pinned exactly; SRE hardening items (R6, R7, R8) planned or done | SRE |
| G1 Pilot | Module 01 | Done. Verified, and reviewed in the browser | Python + PM |
| G2 Standards lock | End of module 02 | Quality bar audit on all 17 lessons (trap tests added, regex checks moved to `ast`, module 01/02 ADRs with computed fields and neutral names); **velocity measured** (hours per practice lesson, per ADR) | CTO |
| G3 Re-plan | End of module 03 | Delivery forecast for the 94 lessons from measured velocity; Core/Advanced cut line confirmed; Python `verify` duration recorded against the budget (R6) | PM + SM |
| G4 MVP release | Modules 01–04 complete (36 lessons) | `TRACK_FLAGS.python` enabled; one learner session outside the team (a TS developer) records the confusing points; carousel and `?debug=perf` checked with 9 tracks | PM + Python |
| G5 Core release | Modules 05–08 complete (65 lessons) | Full `verify` green; feedback from G4 folded in | PM + CTO |
| G6 Async spike | Before writing module 10 or the capstone (can run in parallel any time earlier) | `TaskGroup`, `asyncio.timeout`, `Queue` (with `shutdown`), `Semaphore`, cancellation, `ExceptionGroup`/`except*` and `loop.time()` resolution proven under Pyodide's WebLoop in the harness and in **Run**; the demo entry point for async lessons decided | Python + SRE |
| G7 Advanced release | Modules 09–12 + capstone (94 lessons) | CTO redoes the capstone and async ADR arithmetic; full `verify` green; `Status as of` blocks re-dated | CTO |
| G8 v2 / bonus | After v1 ships | v2 backlog re-prioritized; for module 13: wheel hosting, offline behavior, bundle size and cold-load time measured | PM + SRE + Security |

## Risk register

Likelihood and impact: H high, M medium, L low.

| # | Risk | L | I | Owner | Mitigation | Status |
| --- | --- | --- | --- | --- | --- | --- |
| R1 | Pyodide runs asyncio on a browser-backed WebLoop: `asyncio.run`/`run_until_complete` do not behave as in CPython, and timer resolution follows `setTimeout`. Lessons teaching the event loop can fail or teach a model the sandbox contradicts | H | H | Python | Gate G6. Learner code exposes coroutines and the harness awaits them. The theory states where the sandbox differs from CPython | Rule in 02 and 07 |
| R2 | Capstone and async ADR briefings were physically incoherent, so the tests would certify a wrong design | H | H | Python | Per-worker numbers with computed capacity fields (08, 07); the CTO rechecks them at G7 | Spec fixed |
| R3 | ADR checkpoints are guessable: closed enums plus answer-revealing test names allow trial-and-error completion | H | M | Python | D3: 6 ADRs, computed fields, neutral names | Rule in 02; module 01/02 ADRs being refactored |
| R4 | Scope and velocity outgrow the team, and quality drops in later modules | H | H | PM | D2 (94 lessons, MVP 01–04), G3 re-plan from measured velocity | Approved |
| R5 | Version drift: 3.15 is current; a Pyodide upgrade can change behavior across all Python lessons in both tracks | M | M | SRE | Exact pin (`314.0.7`). An upgrade is its own change that runs `python` + `ai-engineering` verify. Content says "3.14" explicitly | Open |
| R6 | The Python `verify` suite grows slow or flaky (Pyodide boot, fresh import per test, async timing) and blocks CI | M | M | SRE | Record duration at G3 and set a budget per lesson. No timing asserts. Async ticks over sleeps. `LESSON=` filters during authoring | Hardening |
| R7 | A tight infinite loop (`while True:` without `await`) cannot be stopped by the per-test 4 s timeout. The learner waits for the 45 s client timeout (`browserClient.ts` `TEST_TIMEOUT_MS`), then a cold Pyodide restart | M | M | SRE | Pyodide's interrupt buffer (needs `SharedArrayBuffer`, so COOP/COEP headers) or a shorter client timeout with a clear "your code did not finish" message | Hardening |
| R8 | Learner Python can `import js` / `pyodide.http` from the worker and reach the network or same-origin storage, so the "never call real models" rule is bypassable and tests can be gamed via JS | L | L | Security | No secrets or backend exist, so the impact is low. Documented in [12-security-review.md](12-security-review.md). Optionally block `js`, `pyodide_js` and `micropip` imports in test mode | Hardening |
| R9 | Harness changes for the Python track break the 122 AI Engineering lessons that share the engine | M | H | SRE | D9: both suites run on any engine change | Approved |
| R10 | Volatile facts go stale (free-threading status, JIT, 3.15 changes such as the UTF-8 mode default; verify before citing) | M | M | Python | Dated blocks only. Re-verify all of them at G7 and on every Pyodide upgrade | Open |
| R11 | Runtime-introspection typing challenges teach that hints are validated at runtime, which reinforces the wrong TS prior | M | M | Python | D5. Theory states the checker gap explicitly. The typing ADR names a checker in CI | Rule in 05, 07 |
| R12 | Regex source checks fail correct solutions (comments, docstrings, strings) | H | L | Python | D7 (`ast`). Fix `04-scope-and-nonlocal` and the `ast` rule at G2 | Rule in 02; lesson fix pending |
| R13 | Accent uses the last 30° hue band. The next track forces a rule change in `trackPresentation.test.ts` | H | L | PM | Raise it before the next track proposal, not during it | Open |
| R14 | The track was publicly visible while incomplete | H | M | PM | D8 | Closed: flag set |
| R15 | Written content still describes the 115-lesson plan (`01-python-map` theory and quiz mention an ADR per module and a 13-module path; [04-module-01-object-model.md](04-module-01-object-model.md) and [10-roadmap-and-backlog.md](10-roadmap-and-backlog.md) cite 115/13) | H | L | PM | Update those files at G2, by their owners | Open |

## Spec changes

All eight recommendations are approved and applied.

1. **`08-module-13-and-capstone.md` → "Capstone":** per-worker coherent numbers, an engine code challenge plus `adr.py`, and computed capacity fields (D4, R2). Applied.
2. **`03-curriculum.md`:** the 94-lesson tables, releases, totals and the v2 backlog (D2). Applied. The format stays parseable by `scripts/python-track/sync-curriculum.mjs` and `new-lesson.mjs`, and backlog rows use `module/lesson` paths so the scripts ignore them.
3. **`02-content-standards.md` → "ADR checkpoint format" and "Module shape":** the ADR modules, the computed-field rule, briefing coherence and neutral test names (D3, R3). Applied.
4. **`02-content-standards.md` → "Test conventions" and "Challenge rules":** `ast` source checks, trap test, "starter fails by assertion" (D7). Applied.
5. **`02-content-standards.md` → "Challenge rules" and `05-modules-02-to-04.md` → "03-functions":** annotations from module 03, the "Annotations are not enforced" map section, and `02-modules-and-imports` (D5, D6). Applied.
6. **`07-modules-09-to-12.md` → "10-async" constraints and `02-content-standards.md`:** gate G6, no `asyncio.run` in learner code, 50 ms sleep ceiling everywhere (R1). Applied. The matching line in [01-platform-and-engine.md](01-platform-and-engine.md) "Risks" (100 ms) is left for its owner.
7. **`README.md` → "Decisions" and "Phases":** decisions table, gates G0–G8, flag rule, cross-suite rule, 3.14 vs 3.15 (D1, D8, D9). Applied.
8. **`01-platform-and-engine.md` → "Things to verify":** R7 (infinite loop recovery) and R8 (`js`/`micropip` access). Assigned to SRE as part of the platform hardening; not edited here.
