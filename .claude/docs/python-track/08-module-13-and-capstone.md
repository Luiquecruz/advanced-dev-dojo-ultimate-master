# Capstone and Module 13 (v2 backlog)

## Capstone — `12-tooling/05-capstone-async-rules-engine`

The track's closing lesson: **a code challenge plus a short ADR** (decision D4 in [09-governance.md](09-governance.md)). The learner builds an asynchronous rules engine that runs in Pyodide's asyncio, then records the deployment decision with numbers computed from the briefing. It combines modules 04 (dataclasses), 06 (exception groups, notes), 09 (protocols), 10 (task groups, semaphores, timeouts, queues, cancellation) and 03 (multi-file modules).

Gate G6 (the asyncio spike) must pass before this lesson is written. It is the only lesson allowed more than 45 minutes: budget 60–90 minutes, and say so in the summary.

- Kind C, level advanced, tags `["established", "core", "practice"]`.
- Files: `starter/` and `solution/` hold `main.py` (the engine, `meta.json` `entry: "main.py"` as the conventions test requires for non-ADR lessons), `adr.py` (the record and plan), and `demo.py` (`run`), which drives the engine with fake rules and prints the decisions. Tests read the plan through `modules["adr.py"]`.
- Resources: Nygard ADR post, MADR, asyncio Task Groups and Timeouts docs, `asyncio.Queue` docs, PEP 544, PEP 654, PEP 678.

### Briefing (`challenge.md`), fixed numbers

All numbers are checked for physical coherence at review (gate G7). Capacity is stated per worker process, so the asyncio answer is correct only together with horizontal scaling.

- A payments platform evaluates fraud and compliance rules on a fleet peak of **2 000 events/s**.
- **40 rules** written by 6 teams: **36 I/O-bound** (a feature-store call, mean **15 ms**, p95 **40 ms**) and **4 CPU-bound** (**2 ms** each).
- A load test measured that **one worker sustains 400 events/s** when CPU-bound rules run in a process pool, and 90 events/s when they run on the event loop.
- The feature store allows **300 concurrent connections per worker**.
- Each event has a **250 ms** decision deadline, of which at most **100 ms** may be spent waiting in the worker's queue.
- The fleet must survive the loss of **one worker** at peak.
- Rules are plugins added without editing the engine; outside authors must not inherit from an engine base class.
- **2%** of rule evaluations fail or time out; a rule failure must not drop the event, and operators need every failure of one evaluation reported together, each tagged with its rule name.
- Shutdown must drain in-flight events within **15 s**.

### Engine contract (`main.py`)

- `AsyncRule` and `CpuRule`: `@runtime_checkable` `Protocol`s. `AsyncRule` has `name: str` and `async def evaluate(self, event: dict) -> bool`. `CpuRule` has `name: str` and `def check(self, event: dict) -> bool`. `True` means the rule flags the event.
- `Decision`: frozen dataclass `event_id: str`, `flags: tuple[str, ...]` (names of rules that flagged, sorted), `errors: ExceptionGroup | None`, `timed_out: bool`.
- `async def evaluate_event(event, rules, *, per_event_limit, deadline_s, offload) -> Decision`. Runs every rule in a `TaskGroup` under an `asyncio.Semaphore(per_event_limit)`, awaits `offload(rule.check, event)` for CPU rules (never calls `check` directly), and isolates rule errors: an `Exception` from a rule gets a note `rule=<name>` (`add_note`) and is collected, while `CancelledError` is never swallowed. The whole evaluation runs inside `asyncio.timeout(deadline_s)`. On timeout, the decision keeps the flags of rules that already finished and sets `timed_out=True` (fail open with a flag). Collected errors become `ExceptionGroup("rule failures", errors)`, or `None` when there are none.
- `class Engine(rules, *, queue_maxsize, workers, per_event_limit, global_limit, deadline_s, offload, on_decision)`. It raises `TypeError` for any rule that satisfies neither protocol, and shares one `Semaphore(global_limit)` across all events. `async start()` launches `workers` consumer tasks over an `asyncio.Queue(maxsize=queue_maxsize)`. `async submit(event)` awaits the put, which is the backpressure. `async shutdown(drain_s)` stops intake, lets queued and in-flight events finish within `drain_s`, cancels what is left, and returns the number of events decided during the drain.

### Plan contract (`adr.py`)

- `ADR`: standard record (see [02-content-standards.md](02-content-standards.md) "ADR checkpoint format"). `context` mentions the fleet peak (2 000) and the deadline (250).
- `PLAN`:
  - `deployment`: `{ "workers": int, "events_per_worker": int }`
  - `concurrency`: `{ "model": "asyncio" | "threads" | "processes", "fanout": "task_group" | "gather" | "unbounded_tasks", "per_event_limit": int, "global_limit": int, "queue_maxsize": int }`
  - `cpu_rules`: `{ "where": "process_pool" | "event_loop" | "to_thread", "pool_size": int }`
  - `rule_interface`: `{ "kind": "protocol" | "abc" | "concrete_base", "discovery": "init_subclass" | "entry_points" | "manual_list" }`
  - `deadline`: `{ "per_event_ms": int, "on_timeout": "skip_rule" | "drop_event" | "fail_open_with_flag" }`
  - `shutdown_deadline_s`: int
  - `rejected`: at least two `{ "option", "reason" }` (reason ≥ 20 characters)
- Computed values. Tests accept the ranges, so the learner must do the arithmetic, and the solution uses the values in bold.

| Field | Derivation | Accepted |
| --- | --- | --- |
| `deployment.events_per_worker` | measured capacity with offloaded CPU rules | 1–**400** |
| `deployment.workers` | `(workers − 1) × events_per_worker ≥ 2 000` (one worker lost at peak) | **6** or more at 400/worker |
| `concurrency.global_limit` | Little's law: 400 × 36 × 0.015 s = **216** in flight; feature-store cap 300 | 216–300 |
| `concurrency.per_event_limit` | 150 ms left after queueing: waves `ceil(36 / k) × 40 ms + 8 ms CPU ≤ 150 ms` → `ceil(36 / k) ≤ 3` → k ≥ **12** | 12–`global_limit` |
| `concurrency.queue_maxsize` | 400 events/s × 0.1 s queue budget = **40** | 1–40 |
| `cpu_rules.pool_size` | 400 × 4 × 0.002 s = **3.2** CPU-seconds per second → at least 4 | ≥ 4 |
| `deadline.per_event_ms` | briefing | ≤ 250 |
| `shutdown_deadline_s` | briefing | ≤ 15 |

- Categorical coherence: `model` is `asyncio`; `fanout` is `task_group`; `cpu_rules.where` is not `event_loop`; `rule_interface.kind` is `protocol` and `discovery` is not `manual_list`; `on_timeout` is not `drop_event`.

### Tests (6)

Test names describe behavior, never a plan value.

1. Rules run concurrently, never more than `per_event_limit` at once (a recorder tracks peak concurrency); CPU rules go through `offload`; a non-rule object passed to `Engine` raises `TypeError`.
2. A failing rule does not drop the event: the decision keeps the other flags, and `errors` is an `ExceptionGroup` whose exceptions carry `rule=<name>` notes.
3. An event over its deadline is decided with `timed_out=True` and keeps the verdicts that finished. The slow rule awaits an `asyncio.Event` that is never set, so the test uses no real sleep; the deadline is 20 ms.
4. `submit` waits while the queue is full, and `shutdown` decides every queued event within the drain deadline (fake rules finish on `sleep(0)` ticks).
5. The ADR record is complete and its context names the fleet peak and the deadline.
6. The plan values fit the briefing: the table ranges and the categorical rules above.

- Starter: the engine has `# TODO` bodies (sequential `for` loop, no timeout, errors propagate), and `adr.py` holds every key with placeholder values that break the ranges. Hints: (1) start from the per-worker capacity, not the fleet number; (2) a failing rule is an expected event, not an exceptional one; (3) "protocol or abc" depends on who writes the rules; (4) the deadline wraps the whole group, not each rule.

---

# v2 backlog — 13-validation — Validation with Pydantic v2

Deferred out of v1 ([03-curriculum.md](03-curriculum.md) "v2 backlog"). It returns only after the spike below passes **gate G8** in [09-governance.md](09-governance.md). Until then no folder `src/content/python/13-validation/` exists, and the module has no heading in the curriculum plan.

Question: when does a data model need runtime parsing and validation instead of type hints and dataclasses?

## Spike (before any lesson)

Pyodide ships `pydantic` and `pydantic-core` (a Rust extension compiled for WebAssembly) as optional packages loaded with `loadPackage`; the npm `pyodide` dependency does not contain their wheels, and `plugins/pyodidePlugin.ts` serves only the runtime files from `node_modules/pyodide`. The spike must answer:

1. Do the wheels for `pydantic`, `pydantic_core`, `annotated_types`, `typing_extensions` exist for the pinned `pyodide@314.0.7` lock file, and what is their total size?
2. Can they be vendored under the app origin (copied by `pyodidePlugin` into the build, served in dev) so the app stays self-contained with no CDN requests?
3. Can the harness load them on demand only for this track (`loadPackage` in `python.worker.ts`) without affecting the startup of other Python lessons?
4. Can `npm run verify` load them in Node through `pythonGrader()`?
5. Pydantic version and API surface for the lessons (v2.x): record exactly the version available.

If any answer is "no", the module ships as quiz-only lessons (theory plus `quiz.json`) and the practice lessons stay in the backlog. Record the decision in `ARCHITECTURE.md`.

## G8 spike result

**GO** (2026-11-04, branch `sre/pydantic-spike`, Pyodide 314.0.7 / CPython 3.14.2). Every answer below is measured.

1. **Wheels in `pyodide-lock.json`** (the closure of `pydantic`, 5 wheels, 1802 KiB in total):

   | Package | Version | File | sha256 | Size |
   | --- | --- | --- | --- | --- |
   | pydantic | 2.12.5 | `pydantic-2.12.5-py3-none-any.whl` | `04854875001e07a8a74d87b7c80296cba168773d8c9804e232d695f82484d7d7` | 453 KiB |
   | pydantic-core | 2.41.5 | `pydantic_core-2.41.5-cp314-cp314-pyemscripten_2026_0_wasm32.whl` | `54703fa42a0d4d574283cfb8f08050ba7820c9a42b0a21bc1286407d9a9e54da` | 1279 KiB |
   | annotated-types | 0.7.0 | `annotated_types-0.7.0-py3-none-any.whl` | `6541523b4b16c1953d2fc9b82fb86c540eea9f78fca329ab371ed13a8b0faa51` | 12 KiB |
   | typing-extensions | 4.15.0 | `typing_extensions-4.15.0-py3-none-any.whl` | `4fec68770a05408e668a4fa53d6bf4f0f684b9dacf820c7c5d6e97d3ad225e29` | 44 KiB |
   | typing-inspection | 0.4.2 | `typing_inspection-0.4.2-py3-none-any.whl` | `deb989630985f7a7296b90357a947a804a7612cecbb6439d6e71128e01f61051` | 14 KiB |

2. **Vendoring with integrity**: `scripts/python-track/vendor-packages.mjs` (`npm run python:vendor`) computes the dependency closure from the lock file, downloads each wheel once from `https://cdn.jsdelivr.net/pyodide/v314.0.7/full/`, refuses any file whose sha256 differs from the lock, and writes `vendor/pyodide-packages/` (wheels, `manifest.json`, the license file of each wheel and Pyodide's own MPL-2.0 license from the `314.0.7` tag, because the npm package ships none). Licenses: pydantic, pydantic-core, annotated-types and typing-inspection are MIT, typing-extensions is PSF-2.0, Pyodide is MPL-2.0; all are copied into the build at `pyodide/licenses/`. `src/verify/pythonPackages.test.ts` re-hashes every vendored wheel against the lock, checks that the set equals the closure and that each license is present. No npm package ships these wheels. The wheels and licenses are not committed: `npm install` runs the script as `postinstall` (no network when the files are present and match), CI caches the directory, and only `manifest.json` is tracked.
3. **Browser, on demand, by name, under the CSP**: verified in Chromium on `npm run dev`. A run whose files or tests import `pydantic` boots its own worker and calls `loadPackage(["pydantic"], { checkIntegrity: true })` before the lock-down; the 5 wheels were requested from `/pyodide/<wheel>` only (no off-origin request at all), `pydantic_core` loaded without `'unsafe-eval'`, and the probe passed. That first Pydantic run took 992 ms including the downloads; a plain lesson graded right after took 17 ms and plain runs never load the wheels (`"pydantic" not in sys.modules`).
4. **Verify**: the sandbox child loads the same wheels with `packageBaseUrl` = `vendor/pyodide-packages/` and an extra `--allow-fs-read` grant for that directory only (still no write, network or child-process grants). It boots from the stdlib snapshot (≈ 60 ms) and then loads the packages (≈ 140 ms); the snapshot stays Pydantic-free so other lessons are unaffected. Regression tests in `pythonSandbox.test.ts`: a Pydantic probe passes, and a lesson without the import has no Pydantic loaded.
5. **API surface** (through the real harness, verify and browser): `pydantic.VERSION == "2.12.5"`; `BaseModel` with lax coercion (`"42"` → `42`), `model_validate`, `ConfigDict(strict=True)` (`int_type` error for `"3"`), `field_validator` and `model_validator(mode="after")`, `ValidationError.errors()`/`error_count()`, `model_dump(mode="json")`, `model_json_schema()` and `TypeAdapter(list[int])` all work. Lessons must import Pydantic at module level of `main.py` or `tests.py` (so `requiredPackages` sees it), not through `importlib` or `exec`.

Decision: the module 13 practice lessons can be written. The spike leaves `ARCHITECTURE.md` untouched; the decision is recorded here and in CONTENT_GUIDE.md "Vendored packages".

## Lessons (if the spike passes)

### 01-validation-map (Q, B)
Parsing vs validation, where to validate (edges), dataclass vs `BaseModel` vs `TypedDict`, comparison with Zod/TypeScript runtime validation.

### 02-basemodel-vs-dataclass (P, I)
- Concept: `BaseModel` parses and coerces on construction; dataclasses store without checks; `model_validate`, `model_dump`, `ValidationError.errors()`.
- Contrast: Zod `schema.parse` (parse, don't validate) is the closest JS equivalent.
- Challenge: `class User(BaseModel)` with `id: int`, `email: str`, `tags: list[str] = []` default handling; `parse_user(data)` returns `User` or raises; `to_public(user)` excluding `email`.
- Tests: `"42"` becomes `42`; invalid raises `ValidationError` with the field in `errors()`; defaults not shared between instances; dump excludes a field.

### 03-lax-and-strict-modes (P, I)
- Concept: lax mode coercion table, `strict=True`, `ConfigDict`, per-field `Strict`, `StrictInt`.
- Challenge: `class Order(BaseModel)` strict configuration; `parse_lax(data)` and `parse_strict(data)`; `coercions(data)` returning which fields changed type.
- Tests: `"true"` accepted in lax, rejected in strict; int-for-float; error type and location.

### 04-field-and-model-validators (P, Ad)
- Concept: `Field(ge=, le=, pattern=)`, `@field_validator`, `@model_validator(mode="after"/"before")`, `ValidationInfo`, custom errors.
- Challenge: `Signup(BaseModel)` with password confirmation (`model_validator(mode="after")`), normalized email (`field_validator`), constrained age.
- Tests: normalization; mismatched passwords error mentions both fields; constraint errors; before-validator transforms a legacy field name.

### 05-serialization-and-json-schema (P, I)
- Concept: `model_dump(mode="json")`, aliases, `model_json_schema()`, `computed_field`, serialization of datetimes and decimals.
- Challenge: `Invoice` model with aliases and a computed total; `export(invoice)` returns JSON-compatible dict; `schema_properties(model)` returns the sorted property names.
- Tests: alias round trip; computed total included; datetime ISO output; schema property list.

### 06-pydantic-core-and-performance (Q, I)
Quiz lesson. The Rust `pydantic-core`, validation vs serialization cost, `TypeAdapter`, when plain dataclasses or `attrs` suffice, comparison with msgspec/Zod. Dated status block; cite Pydantic docs.

### 07-validation-adr (A, I)
- Briefing: three services exchange order events (`gateway` public, `orders` and `billing` internal, gateway → orders → billing); **8 000 000** events/day, planned at the daily average; about **30%** of partners send numbers as strings and cannot change this year; the `refund_approved` payout flag has arrived as `"yes"` and `1` but must be a JSON boolean; an unknown `discount_override` field was applied downstream last quarter; 422 bodies are parsed by partner software and payloads carry emails and card tokens; inside a service the event is an immutable typed object, and orders (contract v3) and billing (v2) drift, so mismatches between services must fail loudly; **4** event types, a new schema version every **6 months**, each accepted for **18 months**, one published schema document per type and accepted version; the largest legitimate body is **200** lines of at most **300 bytes** plus a **4 000-byte** envelope, rejected before parsing above a limit that fits it and stays under twice its size.
- `PLAN`: `edge_model` (`basemodel`|`dataclass`|`typeddict`), `internal_model` (`frozen_dataclass`|`basemodel`|`dict`), `mode` (`lax_at_edge_strict_inside`|`lax_everywhere`|`strict_everywhere`), `payout_flag` (`strict_bool`|`lax_bool`), `unknown_fields` (`forbid`|`ignore`|`allow`), `validation_errors` (`structured`|`strings`), `error_input` (`omitted`|`echoed`), `schema_docs` (`json_schema`|`wiki`|`none`), `events_per_second` int, `schema_documents` int, `max_body_bytes` int, `rejected`.
- Computed fields:

  | Field | Derivation | Accepted |
  | --- | --- | --- |
  | `events_per_second` | 8 000 000 / 86 400 ≈ 92.6 | **93** (92–93) |
  | `schema_documents` | 4 types × (18 / 6) live versions | **12** |
  | `max_body_bytes` | 200 × 300 + 4 000 = 64 000, under twice that | 64 000 ≤ limit < 128 000 (solution **96 000**) |

- Coherence: partner string numbers require lax at the edge with a `basemodel`; drift between services requires strict inside, and the domain object is a `frozen_dataclass`; the payout flag is `strict_bool`; `unknown_fields` is `forbid`; errors are `structured` with `error_input` `omitted`; documentation is `json_schema`; the decision names `lax`, `strict` and the `schema`. Test names are neutral.
