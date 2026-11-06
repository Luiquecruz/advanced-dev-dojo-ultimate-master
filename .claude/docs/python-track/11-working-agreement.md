# Working Agreement — Python Track

How the team writes, checks and lands Python lessons. The lesson contract itself is [02-content-standards.md](02-content-standards.md); the plan is [03-curriculum.md](03-curriculum.md); per-lesson specs are files 04–08. This document adds the process around them.

## Tooling

| Command | Does |
| --- | --- |
| `npm run python:new -- <NN-module> <NN-lesson-id> [--kind practice\|quiz\|adr] [--level ...]` | Scaffolds every file of the contract with `TODO` placeholders. Kind and level come from 03-curriculum.md when omitted (`-map` → quiz, `-adr` → adr). Creates `module.json` when the module is new (with `"optional": true` for a `00-` module). Refuses to touch an existing folder. Writes `meta.json.draft`, never `meta.json`. |
| `LESSON=python/<id> npx vitest run src/verify/python.test.ts` | Grades the lesson in Pyodide: solution passes every test, starter fails at least one, demo runs. |
| `LESSON=python/<id> npx vitest run src/verify/pythonConventions.test.ts` | Definition of Done checks (below). Runs in seconds, no Pyodide. |
| `npm run python:curriculum` | Regenerates the `## Python` module lists in [CURRICULUM.md](../CURRICULUM.md) from 03-curriculum.md plus the lesson folders: a lesson gets `✓` when it has `meta.json`. `-- --check` exits 1 when the file is stale. |
| `npx vitest run src/verify/curriculum.test.ts` | Every written lesson is `✓` and every `✓` exists. |

The loader only sees a lesson folder once it holds `meta.json`. Keeping `meta.json.draft` until the end means a half-written lesson never reaches the app, the verify suites or the curriculum test.

## Definition of Ready

A lesson can be started when:

- [ ] It is listed in 03-curriculum.md with kind and level, and its module spec (04–08) states the challenge contract: function and class names, exceptions, the 3–6 behaviors the tests check.
- [ ] Earlier lessons it builds on are written or in progress in the same module, and the module map (`01-<module>-map`) is assigned.
- [ ] Every Pyodide-sensitive API it touches (`asyncio`, `inspect`, `dis`, `sys._getframe`, `tracemalloc`, `gc`, `weakref`, `pathlib` I/O) has been tried through `pythonGrader()` or is avoided (02 "Pyodide limits").
- [ ] Volatile facts it needs (versions, PEP status) have a primary source to check against.
- [ ] An author and a reviewer are named; the author is under the WIP limit.

## Definition of Done

Enforced by `pythonConventions.test.ts` unless marked *(review)*:

- [ ] `meta.json` (renamed from the draft last) has only `title`, `summary`, `level`, `tags`, `entry`, `run`, `resources`. Tags: maturity first (`established`, `emerging`, `hype-watch`), `core`, and exactly one of `practice` (has a challenge) or `theory` (quiz lesson).
- [ ] Challenges set `entry`: `main.py` for practice, `adr.py` for ADR checkpoints. `run`, when set, names a demo present in `starter/` and `solution/`.
- [ ] Resources: at least one, labelled, well-formed `https` URLs, no duplicates; ADRs cite Nygard and MADR. That they return 200 is checked by hand *(review)*: the test never calls the network.
- [ ] Theory: practice lessons and the capstone 300–1000 words, maps 200–500, other lessons 250–1000; `py`/`text`/`bash`/`toml`/`json` fences; no `Status as of` block or other dated text (`noDates.test.ts`); no `## Coming from` section in any lesson. Practice lessons and the capstone have `## How it works`, then `## Common mistakes` (40–250 words, the mistake in bold, the wrong code and the fix in a `py` fence), and end with `## When to choose it`. Maps and ADRs are exempt from both headings.
- [ ] No bridges: no lesson file (theory, quiz, concepts, `meta.json`, challenge, hints, approach, tests, starter, solution), `track.json` or `module.json` names another language or its tooling (C, CPython's own language, excepted), and no resource points at another language's documentation (the `BLOCKED_HOSTS` and `BLOCKED_PATHS` constants: MDN, nodejs.org, zod.dev, typescriptlang.org, vitest.dev, axios-http.com, expressjs.com, and the `github.com/tc39` proposals) ([02-content-standards.md](02-content-standards.md) "No bridges").
- [ ] Practice lessons and the capstone: exactly one `# beginner mistake: <text>` line, right above the `@test` that catches the mistake named in `## Common mistakes`.
- [ ] Quiz: maps have exactly 4 questions, other quizzes 4–6; answer indexes are not all the same; no repeated option.
- [ ] Challenge: `challenge.md` present; starter entry marks the work with `# TODO`; solution files hold no `TODO` and no `global` statement; ADR starter and solution define module-level `ADR` and `PLAN`; 2–4 hints; `approach.md` is a numbered list; 3–6 `@test` names, string literals, unique.
- [ ] No `TODO` left anywhere in theory, quiz, challenge, hints, approach or tests.
- [ ] Each module has `module.json` and its first written lesson is `01-<module>-map`.
- [ ] `python.test.ts` passes for the lesson; `curriculum.test.ts` passes after `npm run python:curriculum`.
- [ ] A rewritten lesson leaves `src/verify/pythonPendingRewrite.ts` in the same change; an entry whose rules the lesson no longer breaks fails the suite.
- [ ] Version-specific facts name the Python version and are verified against docs.python.org or the PEP *(review)*.
- [ ] Anti-LeetCode, tests assert behavior and not printed text or `id()`/`is` on folded constants *(review)*.
- [ ] Opened once per module in the browser: starter fails, solution passes, Run prints *(review)*.

Existing content that breaks a rule is listed in `KNOWN_EXCEPTIONS` at the top of the test, with the reason, and reported to the author. Nobody edits another author's lesson to make the suite green. The test fails when an exception is no longer needed, so the list only shrinks.

## Authoring workflow

1. **Scaffold**: `npm run python:new -- 03-functions 02-args-and-kwargs`. Check the kind and level it printed against 03-curriculum.md.
2. **Contract first**: write `challenge.md` and `tests.py` from the module spec, then `solution/` until the tests pass. Grade with `LESSON=python/args-and-kwargs npx vitest run src/verify/python.test.ts` (rename the draft temporarily or keep a scratch copy: the suite only sees lessons with `meta.json`).
3. **Starter**: derive it from the solution, replace the bodies with `# TODO:` comments that still compile, confirm it fails at least one test.
4. **Words**: theory (template order from 02), `concepts.json`, hints, `approach.md`, `quiz.json`, the demo. Date and verify volatile facts.
5. **Promote**: `mv meta.json.draft meta.json`, then `LESSON=python/<id> npx vitest run src/verify/python.test.ts src/verify/pythonConventions.test.ts` until both are green.
6. **Land**: `npm run python:curriculum`, `npx vitest run src/verify/curriculum.test.ts`, then hand the lesson to review with the checklist below.

## WIP limits

| Who | Limit |
| --- | --- |
| Each author | 2 lessons in progress (one drafting, one in review) |
| Each module | 1 module open for new lessons per two authors; the next module opens when the current one has its map and half of its practice lessons done |
| Review | No more than 4 lessons waiting; authors review before starting new work when the queue is full |
| ADR checkpoint | Started only when every practice lesson of the module is done, because its briefing reuses their numbers |

## Parallel authors without conflicts

- **One lesson, one owner.** A lesson folder is touched only by its author until review; reviewers comment, they do not edit.
- **Never hand-edit the Python section of CURRICULUM.md.** It is generated. When two authors land at once, each runs `npm run python:curriculum`; the output depends only on the files on disk, so re-running after a rebase resolves any conflict on that file. Changes to the plan go to 03-curriculum.md (PM owns it) and then through the generator.
- **Shared files**: `module.json`, the map and the ADR of a module have one owner each (the module lead). `track.json`, `tokens.css`, `python.test.ts`, the engine and the harness belong to the CTO/SRE and change in their own change set.
- **Folder numbers are reserved** by 03-curriculum.md, so two authors never pick the same `NN`.
- **Drafts are safe to commit**: `meta.json.draft` keeps a folder invisible to the loader and to every suite.

## Review checklist

- [ ] `python.test.ts`, `pythonConventions.test.ts` and `curriculum.test.ts` green for the lesson.
- [ ] Challenge builds or repairs a language mechanism, not a puzzle; `challenge.md` names everything the tests use.
- [ ] Each test is one behavior with a readable sentence; assertions compute into locals first so the harness prints `left:`/`right:`.
- [ ] Theory follows the template order; `## Common mistakes` names a real newcomer mistake with the wrong code and the fix.
- [ ] Practice lessons and the capstone (ADRs and quiz-only lessons have no such test): the reviewer wrote the wrong version named in `## Common mistakes` once, the `# beginner mistake:` test fails on it and the solution passes.
- [ ] Hints climb from nudge to near-answer; `approach.md` reasons without pasting the solution.
- [ ] Quiz tests decisions and predictions; explanations name the mechanism; answer positions vary.
- [ ] Volatile facts dated and traced to a primary source; resources open (200) in a browser.
- [ ] No reliance on threads, sockets, real `venv`/`pip`, `zoneinfo` data or real sleeps.
- [ ] Learner code has no way to reach secrets, the network or the host (Security sign-off on any lesson touching `eval`, `exec`, pickle, `subprocess` or file I/O).
- [ ] Demo prints at least one line, exits 0 and stays outside the entry's import graph.

## Roles

| Role | Responsibility per lesson |
| --- | --- |
| **CTO** | Owns the engine, harness and platform constraints; decides when a lesson needs an engine change instead of a workaround; final say on anything in 01-platform-and-engine.md. |
| **PM** | Owns 03-curriculum.md and the per-module specs: kind, level, the challenge contract and the order; marks a lesson Ready; accepts it against the spec. |
| **SM** | Owns this agreement, the scaffolder, the conventions test and the curriculum generator; watches WIP limits and the review queue; removes blockers and reports failing rules to the author. |
| **Python specialist** | Author or reviewer of the Python content: idiomatic solution, correct mechanism in the theory, verified facts, tests that assert behavior. |
| **Security** | Reviews lessons whose code or theory touches evaluation, deserialization, files, subprocesses or secrets; checks that resources and examples teach the safe default. |
| **SRE** | Keeps the verify suites fast and green (Pyodide load time, timeouts, flaky tests); owns CI wiring of `python:curriculum -- --check` and the conventions test; checks the lesson in the browser once per module. |
