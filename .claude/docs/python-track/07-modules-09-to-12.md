# Modules 09–12 — Typing, Async, Metaprogramming, Tooling

Same per-lesson format and shared requirements as [05-modules-02-to-04.md](05-modules-02-to-04.md). These four modules carry the highest Pyodide risk: before writing a lesson, prove the exact stdlib calls in `pythonGrader()` (see [02-content-standards.md](02-content-standards.md) "Pyodide limits"). Version facts are dated and verified against docs.python.org and the PEPs at writing time.

---

# 09-typing — Type Hints and Static Typing

Question: what do annotations declare, who checks them, and what happens to them at runtime?

Constraint: no type checker runs in the browser. Every typing challenge asserts **runtime-visible artifacts** (`get_type_hints`, `__annotations__`, `__type_params__`, `__required_keys__`, `isinstance` with runtime-checkable protocols, `get_overloads`) or implements a small runtime consumer of annotations.

### 01-typing-map (Q, B)
Gradual typing, annotations are metadata, checkers vs runtime, nominal classes by default plus structural protocols.

### 02-modern-annotation-syntax (P, B)
- Concept: `list[str]`, `dict[str, int]`, `X | None`, `typing.Optional` history, `Callable`, `Self`, annotations on variables, `__annotations__`.
- Common mistake: a `None` default with a bare annotation (`count: int = None`), so the declared type never admits `None` and every reader of the annotations (a checker, `get_type_hints`, a schema) is told it is not allowed; write `int | None`. Nothing checks annotations when the code runs.
- Challenge: annotate five functions in `main.py` so that `typing.get_type_hints` returns the contracted types (for example `{"items": list[str], "limit": int | None, "return": dict[str, int]}`).
- Tests: `get_type_hints(function)` equals the expected dict for each function; no `typing.List/Dict/Optional` in the source (checked with `ast`: no `Attribute`/`Name`/`ImportFrom` node naming them, so a comment that mentions `List` does not fail).

### 03-generics-pep-695 (P, I)
- Concept: `def first[T](…)`, `class Stack[T]`, `type Alias[T] = …`, bounds and constraints, defaults (PEP 696), variance inferred.
- Common mistake: a bound `T: int | str` where the constraint list `T: (int, str)` was meant; both accept either type at runtime, but under the bound a checker reads `self.value * 2` as `int | str`, not `T`, and `__constraints__` stays empty. Declare type parameters in brackets, scoped to their function or class, not as a shared module-level `TypeVar`.
- Challenge: `first[T](items, default=None)`, `class Stack[T]` with `push/pop/peek`, `type Pair[T] = tuple[T, T]`, `class Box[T: (int, str)]`.
- Tests: behavior; `first.__type_params__` length 1; `Stack.__type_params__`; `Pair.__value__` is `tuple[T, T]`-shaped; `Box.__type_params__[0].__constraints__`.
- Notes: PEP 695 (3.12), PEP 696 (3.13).

### 04-protocols (P, I)
- Concept: `Protocol`, structural subtyping, `@runtime_checkable` (`isinstance` checks only member presence), protocol vs ABC, `SupportsInt`-style stdlib protocols.
- Common mistake: an ABC or a base class for "anything with `close()`", so an object that has the method but does not inherit is rejected without an error; use a `@runtime_checkable` `Protocol`, whose `isinstance` checks only that the members exist, not their signatures.
- Challenge: `Renderable(Protocol)` with `render() -> str`; `render_all(items)` renders items that satisfy it and skips others; `Closeable` protocol and `close_all`; a class satisfying the protocol without inheriting.
- Tests: structural match without inheritance; `isinstance` true/false; protocol cannot be instantiated (`TypeError`); non-conforming skipped.

### 05-typeddict-and-literals (P, I)
- Concept: `TypedDict`, `total`, `Required/NotRequired/ReadOnly`, `Literal`, `Final`, `__required_keys__`.
- Common mistake: checking an integer field with `isinstance(value, int)` alone, which accepts `True` because `bool` subclasses `int`; reject `bool` first. A `TypedDict` describes a shape for checkers and validates nothing at runtime.
- Challenge: define `UserPayload`; write `validate_payload(data, typed_dict_class)` that checks required keys and key types using `get_type_hints` and `__required_keys__` (supports `str`, `int`, `list[str]`, `Literal[...]`), returning a list of error strings.
- Tests: valid data → `[]`; missing key; wrong type; literal violation; extra key allowed or flagged per the contract; read-only marker visible in `__readonly_keys__`.
- Notes: `ReadOnly` PEP 705 (3.13).

### 06-overloads-and-narrowing (P, Ad)
- Concept: `@overload` is for checkers (implementation is the single runtime function), `typing.get_overloads`, `TypeGuard` vs `TypeIs` (3.13), `assert_never`, `cast`.
- Common mistake: a type guard for "list of strings" that checks only the items, so the string `"abc"` (an iterable of one-character strings) passes; check the container type first. `@overload` does not dispatch at runtime: the single implementation does.
- Challenge: `parse(value, mode)` with `Literal["json"]`/`Literal["text"]` overloads and the implementation; `is_str_list(value)` as `TypeIs[list[str]]`; `describe(value)` exhaustively handling a union and raising via `assert_never`.
- Tests: `len(get_overloads(parse)) == 2`; behavior; `is_str_list` truth table; unknown variant raises `AssertionError`/`TypeError` per contract.

### 07-runtime-annotations (P, Ad)
- Concept: annotations evaluation: `from __future__ import annotations`, PEP 649/749 deferred evaluation by default in 3.14, `annotationlib.get_annotations(format=…)`, `typing.get_type_hints`, forward references.
- Common mistake: reading `dataclasses.fields(cls)[i].type` or `__annotations__` as if it were always a resolved class; it holds `"int"` for a quoted annotation and a `ForwardRef` under 3.14 deferred evaluation. Resolve with `typing.get_type_hints` (or `annotationlib.get_annotations(format=Format.VALUE)`).
- Challenge: `build_schema(cls)` converts a dataclass's annotations into a JSON-Schema-like dict (`str`, `int`, `float`, `bool`, `list[T]`, `T | None`, nested dataclass); an annotation naming a class defined later works without quotes.
- Tests: schema of a nested dataclass; optional fields not required; list items; forward reference resolves.
- Notes: verify 3.14 behavior in docs and in Pyodide before writing; date the facts.

### 08-typing-evolution-and-checkers (Q, I)
Quiz lesson merging the 115-plan lessons `08-typing-evolution` and `09-checkers-and-gradual-typing` (5–6 questions).
- Evolution: `List/Dict/Optional/Union` → builtins and `|` (PEP 585, 604), `TypeVar` → PEP 695, deprecated aliases (deprecated, not removed), `TypedDict` extensions, `TypeIs`.
- Checkers: mypy, pyright, ty, pyrefly; strict flags; `Any` vs `object`; stub files and `py.typed`; type checkers in CI; when types pay off. The lesson states plainly what the sandbox cannot do: no checker runs here, so every typing challenge in this module tested introspection, not type checking.
- One dated `**Status as of**` block (tools move fast; cite their docs).

### 09-typing-adr (A, Ad)
- Briefing: a public SDK consumed by 20 teams; JSON payloads from 3 services exposing **14, 9 and 7** payload shapes; **6** shapes are shared by two services and must be defined once; plugin authors outside the company; Python 3.12+ baseline; runtime validation is needed at the edge only; must not force inheritance on plugins.
- `PLAN`: `plugin_interface` (`protocol`|`abc`|`concrete_base`), `payloads` (`typeddict`|`dataclass`|`dict`), `payload_definitions` int, `edge_validation` (`runtime_validator`|`none`), `generics_syntax` (`pep695`|`typevar`), `runtime_checkable` bool, `checker` (`pyright`|`mypy`|`none`), `rejected`.
- Computed field: `payload_definitions` = 14 + 9 + 7 − 6 = **24**.
- Coherence: outside plugin authors rule out `concrete_base`; baseline 3.12 allows `pep695`; JSON payloads are `typeddict` at the edge with a validator; `none` checker rejected. Test names are neutral.

---

# 10-async — Async and Concurrency

Question: what runs concurrently, what blocks everyone, and who owns cancellation?

Constraints:

- No threads or processes in Pyodide. `asyncio` runs on Pyodide's browser-backed event loop (WebLoop), whose `asyncio.run`/`run_until_complete` and timer resolution differ from CPython. **Gate G6** ([09-governance.md](09-governance.md)) must pass before any lesson of this module or the capstone is written: `TaskGroup`, `asyncio.timeout`, `Queue` (including `shutdown`), `Semaphore`, cancellation, `ExceptionGroup`/`except*` and `loop.time()` resolution proven in the test harness and in **Run** ([13-sre-pyodide-spike.md](13-sre-pyodide-spike.md)).
- Learner code never calls `asyncio.run()` or `loop.run_until_complete()`. It exposes coroutine functions; tests are `async def` and await them, and demos follow whatever entry point the spike proves for **Run**. `asyncio.run` is taught in theory as the CPython entry point, with the sandbox difference stated.
- Tests are deterministic: event recorders, `await asyncio.sleep(0)` ticks, `asyncio.Event` gates instead of sleeps, real delays ≤ 50 ms, injected clocks.

### 01-async-map (Q, B)
Cooperative concurrency, event loop, coroutines vs tasks, and why calling a coroutine function runs nothing until it is awaited or scheduled.

### 02-event-loop-mental-model (P, I)
- Concept: calling `async def` returns a coroutine that has not started; `await` yields control; `asyncio.run`; tasks start when scheduled; no silent failure: a never-awaited coroutine warns.
- Common mistake: building a list of coroutines and awaiting them one by one, which runs them sequentially; a coroutine object is a paused call that starts only when awaited, so wrap them in tasks (or `gather`) to run them concurrently. Calling an `async def` function without `await` runs nothing and warns `coroutine ... was never awaited`.
- Challenge: `async def fetch(name, recorder)` appending `start:name`/`end:name` with `await asyncio.sleep(0)` between; `run_sequential(names, recorder)`; `run_concurrent(names, recorder)` via tasks; `lazy_coroutine(recorder)` returning an unstarted coroutine.
- Tests: event order lists for sequential and concurrent runs; `inspect.iscoroutine`; recorder empty before awaiting the coroutine.

### 03-async-iterators-and-context (P, I)
- Concept: `async for`, async generators, `aclosing`, `async with`, `__aenter__/__aexit__`, async comprehensions.
- Common mistake: a `break` out of an `async for` without `aclosing`, so the async generator stays suspended and its `finally` has not run when the caller returns; wrap the generator in `contextlib.aclosing`.
- Challenge: `paginate(fetch_page)` async generator over pages until `None`; `class AsyncConnection` async context manager recording `open/close`; `collect(async_iterable)`.
- Tests: all pages; closed on error; `async for` consumption order; `aclosing` closes the generator early.
- Notes: comes right after the event loop, because lessons 05 to 07 use `async with` (task groups, `asyncio.timeout()`, locks and semaphores).

### 04-tasks-and-gather (P, I)
- Concept: `create_task`, `gather(return_exceptions=)`, result order, `wait`, `as_completed`, task references (garbage collection of un-referenced tasks).
- Common mistake: returning the winner of `wait(..., return_when=FIRST_COMPLETED)` without cancelling and awaiting the pending tasks, so the losers keep running and holding resources; cancel them, then await them (`gather(*pending, return_exceptions=True)`).
- Challenge: `fetch_all(sources)` concurrently preserving input order; `fetch_settled(sources)` returning `(results, errors)` using `return_exceptions=True`; `first_done(coros)`.
- Tests: ordering; errors captured without losing successes; concurrency proven by recorder (starts before first end).

### 05-task-groups (P, I)
- Concept: structured concurrency, `TaskGroup` (3.11), automatic cancellation of siblings on error, errors surface as `ExceptionGroup`, comparison with `gather`.
- Common mistake: a plain `except ValueError:` around a `TaskGroup`, which never matches because the group always raises an `ExceptionGroup`, even for one failure; use `except*`. Unlike `asyncio.gather`, a `TaskGroup` cancels the siblings when one task fails.
- Challenge: `process_batch(items, handler)` runs handlers in a group and returns results; on failure siblings are cancelled and `ExceptionGroup` propagates; `handle_failures(...)` with `except*`.
- Tests: all results; sibling cancellation flags set; `ExceptionGroup` contains the original error type; `except*` handler count.
- Notes: `TaskGroup` is 3.11 (not PEP 654, which defines `ExceptionGroup`).

### 06-timeouts-and-cancellation (P, Ad)
- Concept: `asyncio.timeout()` (3.11), `wait_for`, `CancelledError` is a `BaseException`, re-raise it, cleanup with `finally`, `asyncio.shield`.
- Common mistake: a bare `except:` (or `except BaseException`) around each job in a long-running loop, which also catches `CancelledError`, so the worker can never be stopped; catch `Exception`, or re-raise `CancelledError`.
- Challenge: `with_deadline(coroutine_factory, seconds)` returns the result or raises `TimeoutError`; `worker(recorder)` records `cleanup` in `finally` when cancelled; `shielded_commit(commit, recorder)`.
- Tests: timeout path; no timeout path; cleanup recorded on cancel; `CancelledError` not swallowed (source check for bare `except Exception` swallowing is not used: behavior test instead).

### 07-queues-locks-semaphores (P, Ad)
- Concept: `asyncio.Queue(maxsize)`, backpressure, `join/task_done`, `Queue.shutdown` (3.13), `Lock` for read-modify-write across `await`, `Semaphore` for concurrency limits.
- Common mistake: a read-modify-write with an `await` between the read and the write and no lock, so concurrent increments lose updates; one thread does not mean no races, because every `await` lets another task run. Hold an `asyncio.Lock` around the whole update.
- Challenge: `run_pipeline(items, handler, workers, queue_size)`; `limited_gather(coroutine_factories, limit)` recording maximum concurrent runs; `SafeCounter` using a `Lock` across an `await`.
- Tests: all items processed once; observed maximum concurrency ≤ limit; counter exact under concurrent increments (and the unlocked starter loses updates).

### 08-blocking-threads-and-the-gil (Q, Ad)
Quiz lesson merging the 115-plan lessons `08-blocking-and-threads` and `09-threads-processes-and-the-gil` (5–6 questions).
- Blocking: blocking calls freeze the loop; `asyncio.to_thread`, `run_in_executor`, `ProcessPoolExecutor`; I/O-bound vs CPU-bound; why this cannot run in the browser sandbox.
- Runtime: GIL, free-threaded builds (PEP 703; officially supported in 3.14 via PEP 779), JIT (PEP 744, experimental), multiple interpreters (PEP 734, `concurrent.interpreters` in 3.14), `multiprocessing`.
- One dated `**Status as of**` block; facts verified in the 3.14 "What's New" and the PEPs, with any 3.15 change flagged. No Pyodide verification (no challenge).

### 09-async-adr (A, Ad)
All numbers describe **one service instance** and are physically coherent (checked at review).
- Briefing: an ingestion service instance reads up to **1 200 events/s** from a broker; each event needs **2** enrichment calls (mean **20 ms**, p95 80 ms); a CPU-bound signature check costs **1 ms** per event; the enrichment API grants this instance **3 000 requests/s**; events older than **500 ms** in the local queue are stale and must not pile up; 5% of enrichments fail; shutdown must drain within **10 s**; the CPU pool may run at **70%** utilization.
- `PLAN`: `io_model` (`asyncio`|`threads`|`processes`), `fanout` (`task_group`|`gather`|`unbounded_tasks`), `concurrency_limit` int, `backpressure` (`bounded_queue`|`none`), `queue_maxsize` int, `cpu_work` (`process_pool`|`event_loop`|`to_thread`), `cpu_pool_size` int, `timeouts` (`per_call`|`none`), `failure_handling` (`exception_group`|`swallow`), `shutdown` (`drain_with_deadline`|`kill`), `shutdown_deadline_s` int, `rejected`.
- Computed fields, each tested as a range so the learner must do the arithmetic:
  - `concurrency_limit`: in-flight calls by Little's law = 1 200 × 2 × 0.020 = **48** (lower bound); the quota allows 3 000 req/s ÷ (1 / 0.020 s) = **60** concurrent calls (upper bound). Accept 48–60.
  - `queue_maxsize`: 1 200 events/s × 0.5 s = **600** at most; ≥ 1.
  - `cpu_pool_size`: 1 200 × 0.001 s = 1.2 CPU-seconds per second ÷ 0.7 = 1.71 → **at least 2**.
  - `shutdown_deadline_s` ≤ 10.
- Coherence: `io_model` is `asyncio`; CPU work not on the event loop; bounded queue; no `swallow`; shutdown drains. Test names are neutral ("the concurrency settings fit the briefing").

---

# 11-metaprogramming — Metaprogramming and Internals

Question: when is it worth intercepting class creation or attribute access, and what is the lightest hook that works?

Rule (taught in the map): prefer decorators, then `__init_subclass__`, then descriptors, then metaclasses.

### 01-metaprogramming-map (Q, I)
Hook ladder, class creation steps, when frameworks use each.

### 02-init-subclass-registries (P, I)
- Concept: `__init_subclass__(cls, **kwargs)`, class keyword arguments, registries, validation at class creation, `__class_getitem__` mention.
- Common mistake: registering plugins in `__init__`, so the registry stays empty until an instance exists; register in `__init_subclass__`, which runs when the class is created.
- Challenge: `class Plugin` with `__init_subclass__(cls, name=None, abstract=False, **kwargs)` registering concrete subclasses in `Plugin.registry`; duplicate names raise `ValueError`; `abstract=True` skipped; kwargs forwarded to `super()`.
- Tests: registration by name and by class name default; duplicate error; abstract skipped; subclass of a subclass registers.

### 03-dynamic-classes (P, Ad)
- Concept: `type(name, bases, namespace)`, `types.new_class`, `dataclasses.make_dataclass`, `namedtuple`, trade-offs for type checkers.
- Common mistake: a class statement inside the factory, so every generated class is named after its identifier (`Record`); build it with `type(name, bases, namespace)` (or `types.new_class`).
- Challenge: `make_record_class(name, fields)` returning a class whose `__init__` takes exactly those fields (error on unknown/missing), `__repr__`, `__eq__`, `__slots__`; compare with `namedtuple` behavior in a test.
- Tests: construction and errors; repr; equality; `type(record).__name__`; slots.

### 04-attribute-hooks (P, Ad)
- Concept: `__getattr__` (fallback) vs `__getattribute__` (always), `__setattr__`, `__delattr__`, `__dir__`, avoiding recursion with `object.__getattribute__`.
- Common mistake: a `__getattribute__` proxy that reads `self.log` inside the hook, which calls the hook again until `RecursionError`; use `__getattr__` (called only for missing attributes), or read through `object.__getattribute__(self, "log")`.
- Challenge: `class Proxy(target)` forwarding unknown attributes and recording access in `log`; `class Frozen` rejecting new attributes after `freeze()`; `class Defaults` returning defaults from `__getattr__` without shadowing real attributes.
- Tests: forwarding; log; freeze error; real attributes untouched; `dir()` includes target names.

### 05-metaclasses (P, E)
- Concept: class creation protocol (`__prepare__`, `__new__`, `__init__`, `__call__`), metaclass conflicts, `type` as the default metaclass, when alternatives suffice.
- Common mistake: a singleton cached in `__new__`, so `type.__call__` still runs `__init__` on the returned instance and resets its state on every call; cache the instance in a metaclass `__call__`.
- Challenge: `class RequiresNameMeta(type)` rejecting classes without a `name` attribute; `class SingletonMeta(type)` controlling instance creation via `__call__`; `class FinalMeta` forbidding subclassing.
- Tests: errors at class-definition time (defined inside tests with `capture_error`); singleton identity; final subclass `TypeError`; two metaclasses conflict raises `TypeError`.

### 06-inspect-and-signatures (P, Ad)
- Concept: `inspect.signature`, `Parameter`, `bind`, `getmembers`, `isfunction/iscoroutinefunction`, dependency injection by signature.
- Common mistake: reading parameter names from `__code__`, which shows a decorator's wrapper, leaves keyword-only parameters out of `co_argcount` and does not exist on partials and callable objects; use `inspect.signature`.
- Challenge: `call_with(function, available)` passes only parameters the function declares, raising `TypeError` for missing required ones; `public_api(cls)` lists public callables sorted; `is_async(function)`.
- Tests: partial injection; missing required error mentions the parameter; keyword-only handled; classmethod vs staticmethod listing.

### 07-import-system-internals (P, Ad)
Moved from `12-tooling/05-modules-and-the-import-system` (115 plan). The beginner side (caching, `from` copies, `__main__`, circular imports) is `03-functions/02-modules-and-imports`; this lesson is the protocol underneath.
- Concept: `sys.modules` cache, finders/loaders (`importlib.abc.MetaPathFinder`, `Loader`, `importlib.util.spec_from_loader`), packages and `__path__`, relative imports, `__spec__`, `importlib.reload`.
- Common mistake: an uninstall that removes the finder from `sys.meta_path` but leaves its modules in `sys.modules`, so they stay importable; a module runs once per process, so drop the cached modules too (or call `importlib.reload` to run one again).
- Challenge: `class DictFinder(sources)` serving modules (and packages) from a dict of name → source, installable in `sys.meta_path`; `install(sources)`/`uninstall()` helpers; imports are cached; `reload` re-executes.
- Tests: import a module and a package submodule with correct `__name__` and `__spec__.name`; module cached in `sys.modules`; relative import inside the package; uninstall removes the finder and a missing module raises `ModuleNotFoundError`.
- Notes: verify custom finders work in Pyodide and that tests clean `sys.meta_path` and `sys.modules` (the harness reuses one interpreter).

### v2 backlog — 08-frames-and-tracebacks (P, E)
Deferred: frame lifetime and `f_locals` behavior are CPython details that are unstable to assert in Pyodide. Spec kept for v2.
- Concept: frames (`inspect.currentframe`, `f_back`, `f_code`, `f_locals`), `traceback.TracebackException`, `sys.exc_info`, why frames are CPython details.
- Common mistake: walking only `__cause__`, which loses every exception linked implicitly through `__context__`; follow `__cause__`, then `__context__` unless `__suppress_context__` is set.
- Challenge: `caller_name()` returns the name of the calling function; `format_chain(error)` returns the list of exception type names following `__cause__`/`__context__`; `locals_of_caller()` snapshot.
- Tests: nested calls; chain of three errors; frame references not kept alive (documented with a weakref test only if verified stable in Pyodide).

### v2 backlog — 09-bytecode-and-the-interpreter (Q, E)
Deferred: conflicts with the no-`dis` rule and its facts move every release. Spec kept for v2. Quiz lesson. `dis`, compile pipeline, adaptive specialization (PEP 659), JIT (PEP 744), why bytecode is not a stable API. No challenge asserting opcode counts.

### v2 backlog — 10-metaprogramming-adr (A, Ad)
Deferred ([03-curriculum.md](03-curriculum.md) "v2 backlog"): module 11 ends with `07-import-system-internals`, and the hook ladder is taught in the map. Spec kept for v2; a v2 version must add a computed field.
- Briefing: an internal plugin framework with 60 plugins, discovery at import, config validation at class creation, 12 plugin authors across teams, requirement for good error messages, Python 3.12+.
- `PLAN`: `registration` (`init_subclass`|`metaclass`|`decorator`|`entry_points`), `validation_time` (`class_creation`|`first_use`), `attribute_hooks` (`none`|`getattr`|`getattribute`), `metaclass_needed` bool, `rejected`.
- Coherence: class-creation validation needs `init_subclass` or `metaclass`; `metaclass_needed` is false when `init_subclass` suffices; `getattribute` only with justification (a `reason` field ≥ 30 characters).

---

# 12-tooling — Packaging, Testing and Capstone

Question: how do I make a Python project reproducible, installable and verifiable?

Constraint: pip, uv, venv and build backends cannot run in the sandbox, so packaging is taught as quizzes with dated facts. The 115-plan lessons `02-pyproject-toml`, `04-uv-and-lockfiles`, `07-linting-formatting-and-checkers` and `08-wheels-and-distribution` are merged into the two quizzes below. `05-modules-and-the-import-system` moved to `11-metaprogramming/07-import-system-internals`. Testing becomes practice because `unittest` runs in Pyodide.

### 01-tooling-map (Q, B)
Project lifecycle map: layout (`src/` vs flat), `pyproject.toml`, environments, lockfiles, tests, linters and formatters (Ruff, Black and isort history, pre-commit, checkers in CI), build, publish. Quiz: which tool owns which step, and what each step protects against. Dated `**Status as of**` block for the linter/formatter landscape.

### 02-packaging-and-environments (Q, I)
Quiz lesson, 5–6 questions. One dated `**Status as of**` block; cite packaging.python.org, the PEPs and the Astral docs.
- `pyproject.toml`: `[project]` metadata (PEP 621), `[build-system]` (PEP 517/518), `[dependency-groups]` (PEP 735), `[tool.*]`; versus `setup.py`/`requirements.txt`.
- Environments: a virtual environment is a directory plus `PATH` ordering, `sys.prefix` vs `sys.base_prefix`, `pyvenv.cfg`; common mistake: installing with a `pip` that belongs to another interpreter because the environment was not activated (`python -m pip` names the interpreter explicitly).
- Resolvers and lockfiles: `uv.lock`, `uv run`, `uv sync`, Python version management, vs pip/poetry/pip-tools; PEP 751 `pylock.toml` status.
- Distribution: sdist vs wheel, build backends (setuptools, hatchling, flit, uv_build), PyPI, trusted publishing, versioning.

### v2 backlog — 03-environments-and-venv (P, I)
Deferred: the challenge simulated venv with pure functions over fake prefixes, which teaches the mechanism poorly; the concepts live in `02-packaging-and-environments`. Spec kept for v2.
- Concept: a virtual environment is a directory plus `PATH` ordering and `sys.prefix` vs `sys.base_prefix`; `pyvenv.cfg`.
- Common mistake: expecting the project's `.venv` to be used because it sits in the folder; without activation the first `python` on `PATH` runs, and a bare `pip` installs into whichever interpreter owns the first `pip` on `PATH`. Run the environment's interpreter (`python -m pip`) and check `sys.prefix != sys.base_prefix`.
- Challenge (pure functions): `is_virtualenv(prefix, base_prefix)`; `resolve_command(name, path_dirs, files)` returns the first matching executable path honoring PATH order; `parse_pyvenv_cfg(text)` → dict.
- Tests: detection; PATH shadowing (venv `bin` before system); missing command returns `None`; cfg parsing with comments and spaces.

### 04-testing-with-unittest (P, I)
- Concept: `unittest.TestCase`, `setUp`/`tearDown`, `assertRaises` as a context manager, `subTest`, `unittest.mock` (`Mock`, `patch` as a context manager, `side_effect`, `assert_called_once_with`), running a suite programmatically with `unittest.TestLoader` and `TextTestRunner`; how pytest fixtures and `parametrize` map onto these (theory only, pytest is not installed); how Dev Dojo's own harness relates.
- Common mistake: patching a name where it is defined instead of where it is looked up (`patch("rates.fetch_rate")` when `pricing` did `from rates import fetch_rate`); patch `pricing.fetch_rate`.
- Challenge (multi-file, `main.py` + `pricing.py`): write `class PricingTests(unittest.TestCase)` in `main.py` covering `pricing.quote()` (a discount rule, an invalid-input error with `assertRaises`, a table with `subTest`) and patch `pricing.fetch_rate` where `quote` looks it up; `run_suite()` returns the `unittest.TestResult`.
- Tests: `run_suite()` reports at least 3 tests run and no failures against the real `pricing.py`; the learner's suite **fails** against a planted buggy `pricing` (the tests load a mutated copy through `modules`), proving the tests catch the bug; `fetch_rate` is never called for real (call counter); `assertRaises` is used (checked with `ast`).
- Notes: verify `unittest.mock.patch` and `TextTestRunner` with a `StringIO` stream in Pyodide. No timing.

### 05-capstone-async-rules-engine (C, Ad)
Specified in [08-module-13-and-capstone.md](08-module-13-and-capstone.md): a code challenge (`main.py`, the engine) plus a short `adr.py`.
