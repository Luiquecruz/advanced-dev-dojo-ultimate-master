# Python Track — Specification Index

Spec-driven plan for a **Python language track** in Dev Dojo. Everything here is repo-native: it uses the real lesson format, loader, engine and verification suites described in [CONTENT_GUIDE.md](../CONTENT_GUIDE.md) and [ARCHITECTURE.md](../ARCHITECTURE.md). Written in English like the rest of the project.

The track began as a NotebookLM draft; the departures from that draft are listed at the end of this file.

## Goal

Teach the **mental model of Python 3.14** to learners with no prior programming language: how the object model, protocols and runtime behave, which mistakes each feature invites, and when to choose each feature. It is not interview preparation and not "Python for data science". No algorithm puzzles: every challenge implements real language behavior (a descriptor, a context manager, a protocol, a decorator, a task group).

## Decisions

| Decision | Choice | Reason |
| --- | --- | --- |
| Shape | Own track, `id: python`, `"engine": "python"`, single language | The language selector serves the same content in two languages; here the content is the language |
| Audience | Learners with no prior programming language | No lesson compares with another language; practice lessons name the typical mistake in `## Common mistakes` and catch it with the `# beginner mistake:` test |
| Accent | `#62e868`-class green at 123° hue | Only band that satisfies the existing 30° rule without changing tests ([01-platform-and-engine.md](01-platform-and-engine.md)) |
| Test runner | Existing Pyodide harness (`@test`, plain `assert`, introspected `left/right` failure output) | No second runner and no `assert_equal` helper: the harness already prints both sides of a failed comparison |
| Runtime | Python **3.14** (Pyodide `314.0.7`, CPython 3.14.2, pinned exactly), although 3.15 is current since October 2026; 3.15 differences only in dated `**Status as of**` blocks | The runtime decides what learners can run |
| Scope | **v1: 12 modules, 94 lessons**; lessons cut from the 115-lesson plan are deferred to the [v2 backlog](03-curriculum.md#v2-backlog), not dropped. Today 14 modules and 119 lessons: v2 restored 9 lessons, added module 13 (Pydantic) and the optional module 00 | Approved in [09-governance.md](09-governance.md) (D2); module 00 by the product owner (November 2026) |
| Module 00 | `00-foundations`, "Foundations: Python from Zero", `"optional": true`: a map and 8 practice lessons for learners who have never programmed; the challenge of its last lesson is the skip test | Counts toward progress only once started, so experienced learners still reach 100% ([14-module-00-foundations.md](14-module-00-foundations.md)) |
| Releases | **MVP = modules 01–04** (36 lessons, first release); Core = 01–08 (65); Advanced = 09–12 (29) | Ship a coherent slice early, re-plan from measured velocity |
| Visibility | `TRACK_FLAGS.python = false` until the MVP gate (G4) | No half-built track in the carousel |
| Module shape | Map (quiz) → practice lessons → closing lesson. ADR checkpoints **only in modules 01, 02, 04, 06, 09, 10**; modules 03 and 05 close with a code integration challenge | ADRs only where a real architectural decision exists (D3) |
| ADR format | Every `PLAN` has a numeric field computed from the briefing; briefing numbers coherent; test names neutral | Enum-only plans can be brute-forced and test names leaked answers ([02-content-standards.md](02-content-standards.md)) |
| Source checks | `ast`, never regex over raw text | Regex matches comments and docstrings (D7) |
| Annotations | Allowed in solutions from module 03; `01-functions-map` states they are not enforced at runtime | Matches modern Python and teaches early that hints are not checked at runtime (D5) |
| Quizzes | `quiz.json` inside practice lessons; quiz-only lessons only for theory topics (maps, tooling, landscape, runtime facts) | CONTENT_GUIDE convention |
| Capstone | Async rules engine **code challenge** (`main.py`) plus a short `adr.py`, per-worker numbers that are physically coherent (`12-tooling/04`) | A capstone proves the learner can build it; the 115-plan numbers certified an impossible design (D4) |
| Bonus | Module 13 (Pydantic v2) is written: its 7 lessons landed with the v2 backlog after the packaging spike (G8), taking the track to 110 lessons, and module 00 then to 119 | Needs `pydantic-core` wheels served by the app ([08-module-13-and-capstone.md](08-module-13-and-capstone.md)) |
| Engine changes | Any change to `dojo_harness.py` or the Python worker runs both the `python` and `ai-engineering` suites | One engine serves two tracks (D9) |
| Language | English everywhere | Project rule |

## Documents

| File | Covers |
| --- | --- |
| [01-platform-and-engine.md](01-platform-and-engine.md) | Platform work (phase 1): track registration, accent, verify suite, docs, risks |
| [02-content-standards.md](02-content-standards.md) | Lesson file contract, test conventions, challenge rules, theory template, Pyodide limits |
| [03-curriculum.md](03-curriculum.md) | Curriculum map: 14 modules, 119 lessons with id, level, kind; releases; v2 backlog |
| [04-module-01-object-model.md](04-module-01-object-model.md) | Module 1 pilot: file-by-file spec, challenge contracts, tests, ADR |
| [05-modules-02-to-04.md](05-modules-02-to-04.md) | Collections, functions, classes and descriptors |
| [06-modules-05-to-08.md](06-modules-05-to-08.md) | Iteration, context and errors, standard library, pattern matching |
| [07-modules-09-to-12.md](07-modules-09-to-12.md) | Typing, async, metaprogramming, tooling |
| [08-module-13-and-capstone.md](08-module-13-and-capstone.md) | The async rules engine capstone (code + ADR) and the Pydantic module (module 13, written) |
| [09-governance.md](09-governance.md) | CTO review: approved decisions, quality bar, gates G0–G8, risk register, spec changes |
| [10-roadmap-and-backlog.md](10-roadmap-and-backlog.md) | PM roadmap: milestones, parallel authoring lanes, backlog with acceptance criteria, MVP cut line, open questions |
| [11-working-agreement.md](11-working-agreement.md) | SM working agreement: Definition of Ready/Done, authoring workflow with `npm run python:new` and `npm run python:curriculum`, review checklist, roles |
| [12-security-review.md](12-security-review.md) | Security review: platform findings (verify sandbox, harness state, worker network), per-lesson security notes, supply chain for Pydantic wheels |
| [13-sre-pyodide-spike.md](13-sre-pyodide-spike.md) | SRE spike: which Python features work in Pyodide, harness limits, verify pipeline timing |
| [14-module-00-foundations.md](14-module-00-foundations.md) | Module 00 (optional): skip rule, progress rule, module-zero exceptions to the standards, per-lesson challenge contracts and beginner mistakes |

## Phases and gates

Each phase ends at a gate defined in [09-governance.md](09-governance.md) "Approval gates".

1. **Platform** (G0): register the track, accent, verify suite, docs (see 01), and platform hardening (SRE). Exit: `npm run typecheck`, `npm run test`, `npm run build` green.
2. **Pilot** (G1): module 01 complete and verified (see 04).
3. **Standards lock** (G2): module 02 complete and all lessons audited against the quality bar (beginner-mistake tests, `ast` checks, ADR computed fields).
4. **MVP** (G3 re-plan after module 03, G4 release): modules 03–04, then `TRACK_FLAGS.python` is enabled.
5. **Core** (G5): modules 05–08.
6. **Advanced** (G6 asyncio spike before module 10, G7 release): modules 09–12 including the capstone.
7. **v2 backlog** (done): the 9 restored lessons, and module 13 after the Pydantic spike (G8).

Write `meta.json` last in every lesson. Update `CURRICULUM.md` in the same change as each lesson.

### Status (November 2026)

| Phase | State |
| --- | --- |
| Platform, Pilot, Standards lock | Done: track registered, verify sandbox and browser worker hardened (Security: open Critical/High none), conventions and bytecode-cache guards |
| MVP (modules 01–04, 36 lessons) | Written, cross-reviewed, verified, browser-checked |
| Core (modules 05–08, 29 lessons) | Written, cross-reviewed, verified, browser-checked |
| Advanced (modules 09–12, 29 lessons, capstone) | Written, cross-reviewed, verified, browser-checked |
| Release | Released in November 2026: `TRACK_FLAGS.python` is `true`. The product owner released without the G4 learner session outside the team; run that session and feed its findings into the v2 backlog |
| v2 backlog | Done: the 9 restored lessons and module 13 (Pydantic) |
| Module 00 (optional foundations, 9 lessons) | Written and verified (November 2026); browser check pending |

All 94 planned lessons are on `main`; `npm run verify` passes with every Python lesson's solution green and every starter failing at least one test.

## Departures from the NotebookLM draft

| Draft | This spec | Why |
| --- | --- | --- |
| `tracks/python/.../lesson.json` + JSON Schema | `src/content/python/NN-module/NN-lesson/meta.json` | The loader only reads the repo format |
| `tests/tests.py`, `solution/solution.py` | `tests.py` next to `starter/` and `solution/`, both with `main.py` | Loader contract |
| `assert_equal` helper injected | Not needed | `dojo_harness.py` introspects comparisons |
| 20 stand-alone quiz lessons | Quiz inside practice lessons; quiz-only lessons for theory topics | CONTENT_GUIDE |
| One capstone ADR | Six module ADRs with computed fields, plus a code capstone with a short ADR | AI Engineering pattern, limited to modules with a real decision |
| mypy challenges (`type_check()`) | Runtime-checkable typing challenges (`get_type_hints`, `Protocol`, `TypedDict`) | mypy does not run in Pyodide |
| `asyncio.to_thread`, `venv` and `sys.prefix` challenges | Theory/quiz or injected-dependency challenges | Pyodide has no threads and no real venv |
| `dis` opcode-count and `256 is 256` asserts | Behavioral asserts only | Implementation details vary by version and compile-time folding |
| "Out 2024" volatile facts, wrong PEP attributions | Facts dated at writing time and verified against docs | Today is November 2026; `TaskGroup` and `asyncio.timeout` are not PEP 654 |
| Duplicated gotchas module | Gotchas live where the topic lives (mutable defaults in functions, identity in module 1) | Less repetition |
