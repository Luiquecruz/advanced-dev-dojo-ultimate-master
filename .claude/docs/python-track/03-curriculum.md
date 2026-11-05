# Curriculum Map — Python Track

v1 had 12 modules and 94 lessons; v2 adds 9 restored lessons (103) and module 13 after G8 (approved in [09-governance.md](09-governance.md), November 2026). Module ids are folder names without the numeric prefix. Kinds: **P** practice (theory + challenge, quiz optional), **Q** quiz lesson (theory + 4–6 questions), **A** ADR checkpoint, **C** capstone. Levels: B beginner, I intermediate, Ad advanced, E expert.

This table is the source for the `## Python` section of [CURRICULUM.md](../CURRICULUM.md), where each written lesson gets `✓`. `npm run python:curriculum` regenerates that section from the module headings and lesson rows below, and `npm run python:new` reads kind and level from them. Keep both formats exactly: `## NN-module — Title (count)` and `| NN-lesson-id | Kind | Level |`. Detailed per-lesson specs: [04](04-module-01-object-model.md), [05](05-modules-02-to-04.md), [06](06-modules-05-to-08.md), [07](07-modules-09-to-12.md), [08](08-module-13-and-capstone.md). Lessons cut from the 115-lesson plan are kept in the [v2 backlog](#v2-backlog) at the end of this file.

## Releases

| Release | Modules | Lessons | Gate |
| --- | --- | --- | --- |
| MVP (first release, `TRACK_FLAGS.python` enabled) | 01–04 | 36 | G4 |
| Core | 01–08 | 65 | G5 |
| Advanced | 09–12 including the capstone | 29 | G7 |
| v2 restored lessons | 03, 05, 07, 08, 11, 12 | 9 | product owner decision (November 2026): the 9 deferred lessons come back, held to the same quality bar |
| v2 module 13 (Pydantic) | 13 | 7 | G8 passed (GO, November 2026: wheels vendored with lock-pinned sha256, see 08-module-13-and-capstone.md) |

## Progression

```
object-model → collections → functions → classes → iteration → context-and-errors → stdlib
        → pattern-matching → typing → async → metaprogramming → tooling (+capstone)
```

Every module depends only on earlier ones. Typing sits after classes and iteration because `Protocol`, descriptors and generics assume the data model. Annotations still appear in solutions from module 03 on, and `01-functions-map` states that they are not enforced at runtime. Async comes after typing and context managers (`async with`, `ExceptionGroup`). Metaprogramming comes after everything it hooks into. Inside a module the same rule holds: a lesson uses only what earlier lessons taught, so dataclasses come before `__slots__` (a `slots=True` dataclass), exception hierarchies and chaining before the `with` protocol, numbers and dates before `json` (encoders for `Decimal` and aware `datetime`), and async iterators and context managers before tasks and task groups (`async with`).

ADR checkpoints close every module except 12, which closes the track with the capstone. In v1 only modules 01, 02, 04, 06, 09 and 10 had one; v2 adds the ADRs of modules 03, 05, 07, 08, 11 and 13, each placed after the module's code integration challenge when there is one.

## 01-object-model — Names, Objects and Scope (8)

| Lesson | Kind | Level |
| --- | --- | --- |
| 01-python-map | Q | B |
| 02-names-and-references | P | B |
| 03-mutability-and-hashing | P | B |
| 04-scope-and-nonlocal | P | I |
| 05-shallow-vs-deep-copy | P | I |
| 06-identity-equality-and-interning | P | I |
| 07-truthiness-and-bool | P | B |
| 08-object-model-adr | A | I |

## 02-collections — Collections and Data Protocols (9)

| Lesson | Kind | Level |
| --- | --- | --- |
| 01-collections-map | Q | B |
| 02-unpacking-and-star-expressions | P | B |
| 03-comprehensions-and-dict-views | P | I |
| 04-set-algebra | P | B |
| 05-sequence-protocol | P | I |
| 06-collections-module | P | I |
| 07-custom-mapping | P | Ad |
| 08-text-and-bytes | P | I |
| 09-collections-adr | A | I |

## 03-functions — Functions, Modules and Callables (11)

| Lesson | Kind | Level |
| --- | --- | --- |
| 01-functions-map | Q | B |
| 02-modules-and-imports | P | B |
| 03-args-and-kwargs | P | B |
| 04-positional-and-keyword-only | P | I |
| 05-mutable-default-arguments | P | B |
| 06-closures-and-late-binding | P | I |
| 07-decorators-and-wraps | P | I |
| 08-parameterized-decorators | P | Ad |
| 09-callables-partial-and-cache | P | I |
| 10-client-middleware-stack | P | Ad |
| 11-functions-adr | A | I |

## 04-classes — Classes, Attributes and Descriptors (9)

| Lesson | Kind | Level |
| --- | --- | --- |
| 01-classes-map | Q | B |
| 02-new-and-init | P | I |
| 03-properties | P | I |
| 04-descriptors-and-set-name | P | Ad |
| 05-dataclasses | P | I |
| 06-slots | P | I |
| 07-data-model-methods | P | I |
| 08-inheritance-and-mro | P | Ad |
| 09-classes-adr | A | Ad |

## 05-iteration — Iterators and Generators (8)

| Lesson | Kind | Level |
| --- | --- | --- |
| 01-iteration-map | Q | B |
| 02-iterator-protocol | P | I |
| 03-generators | P | B |
| 04-generator-expressions-and-laziness | P | B |
| 05-yield-from-and-send | P | Ad |
| 06-itertools | P | I |
| 07-lazy-pipelines | P | Ad |
| 08-iteration-adr | A | I |

## 06-context-and-errors — Context Managers and Exceptions (9)

| Lesson | Kind | Level |
| --- | --- | --- |
| 01-context-errors-map | Q | B |
| 02-exception-hierarchies | P | B |
| 03-chaining-and-notes | P | I |
| 04-with-protocol | P | I |
| 05-contextmanager-decorator | P | I |
| 06-suppressing-and-handling-in-exit | P | Ad |
| 07-exitstack | P | Ad |
| 08-exception-groups | P | Ad |
| 09-context-errors-adr | A | I |

## 07-stdlib — Standard Library in Practice (10)

| Lesson | Kind | Level |
| --- | --- | --- |
| 01-stdlib-map | Q | B |
| 02-regular-expressions | P | I |
| 03-pathlib-and-io | P | I |
| 04-numbers-decimal-and-fractions | P | I |
| 05-dates-and-times | P | I |
| 06-json-and-serialization | P | I |
| 07-enums | P | I |
| 08-logging | P | I |
| 09-argparse-and-cli | P | I |
| 10-stdlib-adr | A | I |

## 08-pattern-matching — Pattern Matching and Control Flow (6)

| Lesson | Kind | Level |
| --- | --- | --- |
| 01-matching-map | Q | B |
| 02-sequence-and-mapping-patterns | P | I |
| 03-class-patterns | P | I |
| 04-guards-or-and-capture | P | I |
| 05-walrus-and-loop-else | P | I |
| 06-matching-adr | A | I |

## 09-typing — Type Hints and Static Typing (9)

| Lesson | Kind | Level |
| --- | --- | --- |
| 01-typing-map | Q | B |
| 02-modern-annotation-syntax | P | B |
| 03-generics-pep-695 | P | I |
| 04-protocols | P | I |
| 05-typeddict-and-literals | P | I |
| 06-overloads-and-narrowing | P | Ad |
| 07-runtime-annotations | P | Ad |
| 08-typing-evolution-and-checkers | Q | I |
| 09-typing-adr | A | Ad |

## 10-async — Async and Concurrency (9)

| Lesson | Kind | Level |
| --- | --- | --- |
| 01-async-map | Q | B |
| 02-event-loop-mental-model | P | I |
| 03-async-iterators-and-context | P | I |
| 04-tasks-and-gather | P | I |
| 05-task-groups | P | I |
| 06-timeouts-and-cancellation | P | Ad |
| 07-queues-locks-semaphores | P | Ad |
| 08-blocking-threads-and-the-gil | Q | Ad |
| 09-async-adr | A | Ad |

## 11-metaprogramming — Metaprogramming and Internals (10)

| Lesson | Kind | Level |
| --- | --- | --- |
| 01-metaprogramming-map | Q | I |
| 02-init-subclass-registries | P | I |
| 03-dynamic-classes | P | Ad |
| 04-attribute-hooks | P | Ad |
| 05-metaclasses | P | E |
| 06-inspect-and-signatures | P | Ad |
| 07-import-system-internals | P | Ad |
| 08-frames-and-tracebacks | P | E |
| 09-bytecode-and-the-interpreter | Q | E |
| 10-metaprogramming-adr | A | Ad |

## 12-tooling — Packaging, Testing and Capstone (5)

| Lesson | Kind | Level |
| --- | --- | --- |
| 01-tooling-map | Q | B |
| 02-packaging-and-environments | Q | I |
| 03-environments-and-venv | P | I |
| 04-testing-with-unittest | P | I |
| 05-capstone-async-rules-engine | C | Ad |

## 13-validation — Validation with Pydantic v2 (7)

| Lesson | Kind | Level |
| --- | --- | --- |
| 01-validation-map | Q | B |
| 02-basemodel-vs-dataclass | P | I |
| 03-lax-and-strict-modes | P | I |
| 04-field-and-model-validators | P | Ad |
| 05-serialization-and-json-schema | P | I |
| 06-pydantic-core-and-performance | Q | I |
| 07-validation-adr | A | I |

## Totals

| Kind | Count |
| --- | --- |
| Practice (P) | 79 |
| Quiz (Q), including 13 maps | 18 |
| ADR (A) | 12 |
| Capstone (C) | 1 |
| Total | 110 |

Module sizes: 8, 9, 11, 9, 8, 9, 10, 6, 9, 9, 10, 5, 7. Recompute these counts from the tables whenever a row changes.

## v2 backlog

Lessons from the 115-lesson plan that are not in v1. They are deferred, not dropped: each keeps its spec in the module files (marked **v2 backlog**) and returns through a normal plan change once v1 ships. Folder numbers are those of the 115-lesson plan. This section uses `Module / lesson` paths on purpose, so the curriculum scripts never read these rows as planned lessons.

### Restored in v2

The product owner brought back the 9 deferred lessons of modules 03, 05, 07, 08, 11 and 12 (November 2026). They are planned in the module tables above with new folder numbers (the ADRs close their modules; `12-tooling` was renumbered so the capstone stays last). The reasons they had been deferred are now quality requirements: every ADR has a computed field tied to a real decision, the frames lesson asserts names and relationships only, the bytecode lesson is theory and quiz with dated facts and no `dis` asserts, and the venv and argparse lessons test real mechanisms (`main(argv)`, PATH resolution, `pyvenv.cfg` parsing).

### Deferred

| Module / lesson (115 plan) | Kind | Level | Why deferred |
| --- | --- | --- | --- |

### Merged, moved or reshaped in v1 (content kept)

| Module / lesson (115 plan) | Kind | v1 lesson | Change |
| --- | --- | --- | --- |
| 03-functions/06-decorators | P | 03-functions/07-decorators-and-wraps | Merged: `wraps` is part of writing a correct decorator |
| 03-functions/07-functools-wraps-and-cache | P | 03-functions/07-decorators-and-wraps and 09-callables-partial-and-cache | Split: `wraps` into decorators, `lru_cache`/`cached_property` into the functools lesson |
| 03-functions/09-callable-objects-and-partial | P | 03-functions/09-callables-partial-and-cache | Gains `lru_cache` and `cached_property` |
| 04-classes/05-set-name | P | 04-classes/04-descriptors-and-set-name | Merged as the second step of the descriptor challenge |
| 09-typing/08-typing-evolution | Q | 09-typing/08-typing-evolution-and-checkers | Merged quiz |
| 09-typing/09-checkers-and-gradual-typing | Q | 09-typing/08-typing-evolution-and-checkers | Merged quiz |
| 10-async/08-blocking-and-threads | Q | 10-async/08-blocking-threads-and-the-gil | Merged quiz |
| 10-async/09-threads-processes-and-the-gil | Q | 10-async/08-blocking-threads-and-the-gil | Merged quiz |
| 12-tooling/02-pyproject-toml | Q | 12-tooling/02-packaging-and-environments | Merged quiz |
| 12-tooling/04-uv-and-lockfiles | Q | 12-tooling/02-packaging-and-environments | Merged quiz |
| 12-tooling/08-wheels-and-distribution | Q | 12-tooling/02-packaging-and-environments | Merged quiz |
| 12-tooling/07-linting-formatting-and-checkers | Q | 12-tooling/01-tooling-map | Absorbed by the map |
| 12-tooling/05-modules-and-the-import-system | P | 11-metaprogramming/07-import-system-internals | Moved; the beginner side becomes 03-functions/02-modules-and-imports |
| 12-tooling/06-testing-pytest-and-unittest | Q | 12-tooling/04-testing-with-unittest | Quiz becomes practice: `unittest` runs in Pyodide |
| 12-tooling/09-capstone-async-rules-engine | C | 12-tooling/05-capstone-async-rules-engine | Code challenge plus a short ADR, coherent numbers |

New in v1: `03-functions/02-modules-and-imports` (P, B) and `03-functions/10-client-middleware-stack` (P, Ad).
