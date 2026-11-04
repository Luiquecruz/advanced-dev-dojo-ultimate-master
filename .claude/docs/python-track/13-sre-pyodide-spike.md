# 13 — SRE: Pyodide Feature Spike and Verification Pipeline Health

**Status as of 2026-11-04.** Pyodide `314.0.7` (CPython `3.14.2`, `emscripten`/`wasm32`), Node `v26.10.0`, Vitest `5.0.5`. Every result below was measured, not recalled: snippets ran in a Pyodide instance created with the same `loadPyodide({ indexURL })` call as `pythonGrader()` in `src/verify/graders.ts`, and the harness checks ran through `pythonGrader().runTests` (the real `dojo_harness.run_tests`). Throwaway scripts lived in the session scratchpad and are not part of the repo.

Re-run this spike when the `pyodide` npm version changes.

## 1. Feature results and authoring rules

PASS = works as in CPython. LIMITED = runs, with a difference that lessons must respect. FAIL = unavailable.

| Feature | Result | Observed behavior | Authoring rule |
| --- | --- | --- | --- |
| `asyncio.TaskGroup` + `ExceptionGroup` / `except*` | PASS | both errors collected in one group | Use freely. |
| `asyncio.timeout()` / `wait_for` | PASS | `TimeoutError` raised | Use; keep deadlines ≥ 20 ms and test the "no timeout" path with a margin of at least 5×. |
| `asyncio.sleep` timing | LIMITED | `sleep(0.01)` measured 9.6–14.2 ms over 50 runs: it can fire **early** | Never assert `elapsed >= delay` or exact durations. Prove ordering with recorders and `await asyncio.sleep(0)` ticks. |
| Event loop type | LIMITED | `WebLoop` (Pyodide's loop on JS timers), not `asyncio.BaseEventLoop` | Do not assert on the loop class or loop internals. |
| `asyncio.Queue` + `Queue.shutdown` (3.13) | PASS | `QueueShutDown` after draining | Use. |
| `Semaphore` / `Lock` / `Event` | PASS | peak concurrency respected | Use. |
| `asyncio.run` inside the running loop | LIMITED | works **in Node** (returns the value) because Node 26 has JSPI stack switching (`can_run_sync() == True`); in a browser it depends on JSPI support of that browser | Never call `asyncio.run` on any code path that tests exercise. Async tests are `async def` and `await`. `asyncio.run` belongs only in `run` demo files (the harness patches it in `run_program`). |
| `loop.run_until_complete` | LIMITED | same as `asyncio.run` (JSPI-dependent) | Same rule. |
| `asyncio.to_thread` / `run_in_executor(None, …)` | LIMITED | returns the result, but runs the function **synchronously on the loop** (no thread, no concurrency) | Do not use in challenges; never use it to "prove" non-blocking behavior. Quiz/theory only. |
| `ThreadPoolExecutor`, `threading.Thread.start()` | FAIL | `RuntimeError: can't start new thread` | Theory and quizzes only. |
| `threading.Lock` / `RLock` / `local` (no threads started) | PASS | | Usable as plain objects. |
| `multiprocessing` / `subprocess` | FAIL | `ModuleNotFoundError: _multiprocessing`; `OSError: emscripten does not support processes` | Theory only. |
| `time.sleep` | LIMITED | really blocks (0.1 s took 0.101 s) and blocks the event loop; the 4 s test timeout **cannot interrupt it** (see §2) | Never in solutions or tests. Inject clocks. |
| Async generators, `aclosing`, async comprehensions | PASS | `finally` ran on early break | Use. |
| `inspect.signature` / `bind` / `currentframe` / `f_back` / `sys._getframe` | PASS | | Use. `frame.f_locals` is a write-through proxy since 3.13 (PEP 667): snapshot with `dict(frame.f_locals)`. |
| `traceback.TracebackException`, `format_exception`, `__notes__`, `__cause__` chains | PASS | | Use. |
| `dis` | PASS | 3.14 opnames (`LOAD_FAST_BORROW`, `LOAD_SMALL_INT`) | Never assert opcode names or counts; quiz facts must be dated to 3.14. |
| `importlib` `MetaPathFinder` + `Loader` serving a dict (`sys.meta_path`) | PASS | module imported, executed, cached | Use, but tests **must** uninstall the finder and pop `sys.modules` entries in `finally` (state leaks, see §2). |
| `type()`, `types.new_class`, `__init_subclass__`, metaclasses, `__set_name__` | PASS | | Use. |
| PEP 695 (`def f[T]`, `class C[T]`, `type` alias, `__type_params__`, bounds, `*Ts`, `**P`) | PASS | `Pair.__value__ == tuple[K, K]` | Use. |
| PEP 696 type parameter defaults (3.13) | PASS | `__default__` is `int` | Use. |
| `typing.get_overloads`, `TypeIs`, `ReadOnly`, `NotRequired`, `__readonly_keys__` | PASS | 2 overloads, `frozenset({'title'})` | Use. |
| `annotationlib.get_annotations` + deferred annotations (3.14, PEP 649/749) | PASS | `Format.FORWARDREF` gives `ForwardRef('Undefined')`, `Format.STRING` gives source text, plain `__annotations__` raises `NameError` for undefined names | Use. Forward references resolve only once the referenced name exists; call schema builders after the module is fully executed. |
| Template strings `t"…"` (3.14, PEP 750) | PASS | `Template` with `.strings`/`.values` | Available if a lesson wants it; date the fact. |
| `itertools.batched(strict=True)` | PASS | `ValueError: batched(): incomplete batch` | Use. |
| `decimal` / `fractions` | PASS | | Use. |
| `zoneinfo` | FAIL | `ZoneInfoNotFoundError` with `available_timezones() == set()`; Pyodide suggests `loadPackage('tzdata')`, which would fetch from a CDN (the app only serves the stdlib zip) | Keep the existing rule: `datetime.timezone` fixed offsets. |
| `datetime.UTC`, fixed offsets | PASS | | Use. |
| `logging` | PASS | | Use a `StringIO` handler, `propagate = False`, and **remove handlers in `finally`**: named loggers are interpreter-global and survive between tests and lessons. |
| `argparse` | PASS | bad args raise `SystemExit(2)`; the usage error goes to **stderr** | Pass `out`/`err` streams or use `contextlib.redirect_stderr`; `capture_output()` only captures stdout. `exit_on_error=False` also works. |
| `pathlib` on `/tmp`, `tempfile` | PASS (see §10: broken in verify between d15e4b6 and the §10 fix) | in-memory FS; `cwd` is `/home/pyodide`; `/tmp` persists for the whole suite | Use `tempfile.TemporaryDirectory()` or `/tmp/dojo-<unique>` plus cleanup. Never write relative paths (they land in `/home/pyodide`). |
| `json`, `re`, `unicodedata` | PASS | | Use. |
| `weakref` / `gc` | PASS | refcount frees immediately; cycle freed by `gc.collect()` (returned 1) | Use; call `gc.collect()` before asserting on cyclic garbage. |
| `tracemalloc` | PASS | | Assert relations (`peak >= current`, "grew"), never byte counts. |
| `sys.getsizeof` | LIMITED | **32-bit build**: `sys.maxsize == 2**31 - 1`, `getsizeof(0) == 16`, `getsizeof([]) == 28`, slotted instance 24 (CPython 64-bit: 28 / 56 / …) | Never assert sizes; do not quote 64-bit numbers as what the learner will see. Compare two objects only (`slots < dict`) and only if verified. |
| `functools.singledispatch` / `cached_property` / `lru_cache` | PASS | | Use. |
| `dataclasses(slots=True, frozen=True, KW_ONLY)` | PASS | | Use. |
| `enum` (`StrEnum`, `Flag`), `match`, `abc`, `Protocol` + `runtime_checkable` | PASS | | Use. |
| `contextlib` (`AsyncExitStack`, `asynccontextmanager`, `suppress`, `chdir`) | PASS | LIFO close order | Use. |
| `random.Random(seed)` | PASS | deterministic | Always seed or inject. |
| `hash(str)` / set iteration order | LIMITED | `hash("a")` differs on every process start (no `PYTHONHASHSEED`), so **the iteration order of a set of strings differs between runs** | Compare sets as sets; print/return `sorted(...)`; never assert `list(some_set)` or print a raw set in a Run demo. |
| `sqlite3` | PASS | in-memory DB, SQLite 3.39.0, ships in the stdlib zip (also in the browser) | Allowed for a future lesson; `:memory:` only. |
| `socket` / `urllib` / `http.client` | FAIL | `urlopen` times out; `create_connection` returns a socket but I/O times out | Keep the existing rule (no network). |
| `pickle`, `copy` | PASS | | Allowed for in-process round trips only; never load untrusted bytes in examples. |
| `csv`, `io`, `struct`, `hashlib`, `hmac`, `secrets`, `base64`, `uuid`, `gzip`, `compression.zstd` (3.14) | PASS | | Use. |
| Recursion | LIMITED | `getrecursionlimit() == 1000`; depth 5000 raises `RecursionError` cleanly | Keep recursive fixtures under ~200 levels. |
| `sys.settrace`, `sys.monitoring` | PASS | | Usable; a test must restore `settrace(None)` in `finally`. |
| `concurrent.interpreters` (3.14), GIL state | FAIL | `ModuleNotFoundError: _interpreters`; `sys._is_gil_enabled() == True` | Theory and quiz only. |
| `os.cpu_count()` | LIMITED | `1` | Never derive behavior from it. |

## 2. Harness limits found (`dojo_harness.run_tests`)

Checked through `pythonGrader().runTests` with one lesson file and these tests:

| Case | Result |
| --- | --- |
| `async def` test awaiting learner coroutines | passes |
| `TaskGroup` inside a test | passes |
| learner forgets `await` inside an awaited function | passes, warning is invisible (stderr is discarded during tests) |
| **sync** test doing `assert mod.fetch(2)` (coroutine never awaited) | **passes vacuously**: a coroutine object is truthy |
| `asyncio.run(...)` called from a sync test | passes in Node (JSPI); not guaranteed in browsers |
| `await asyncio.Event().wait()` (await that never finishes) | fails after 4 s with `TimeoutError: Test "…" timed out after 4000ms.`; the next test runs normally |
| `time.sleep(6)` inside an async test | **passes after 6 s**: `wait_for` cannot preempt a blocking call |
| `while True: pass` in an `async def` test | **hangs the whole Vitest run forever** (killed at 40 s and 150 s by an outer `timeout`; Vitest's own `testTimeout` never fires because the worker thread is blocked) |
| `while True: pass` in a sync test | same: hangs forever |

Consequences and other limits read from the harness code:

1. **The 4 s timeout only covers awaits that yield.** Busy loops and blocking calls hang `npm run verify` with no output. In the browser the worker is terminated after 45 s (`TEST_TIMEOUT_MS` in `browserClient.ts`), so learners are protected; CI is not. A starter that loops forever is a CI outage, not a failed test.
2. **One Pyodide instance per suite file.** `unload_project` only removes the learner's own modules. Everything else is interpreter-global and leaks across tests and across lessons: `sys.meta_path`, `sys.path_hooks`, extra `sys.modules` entries, `logging` loggers and handlers, `sys.settrace`/`setprofile`, `warnings` filters, `sys.setrecursionlimit`, `os.chdir`, files under `/tmp` and `/home/pyodide`, monkeypatched stdlib attributes. A test can pass or fail depending on which lesson ran before it.
3. **stderr is discarded during tests** and `capture_output()` only captures stdout. Warnings (`RuntimeWarning: coroutine … was never awaited`) are only observable with `warnings.catch_warnings(record=True)` + `warnings.simplefilter("always")` + `gc.collect()` (verified: the message is recorded).
4. **Test hash seed is random per process**, so verify and browser can see different set orders for the same code.

The table above describes the harness **before** the hardening in §5; limits 1–4 are fixed there. Original suggestions, kept for the record:

- Pass `env: { PYTHONHASHSEED: '0' }` to `loadPyodide` in both `pythonGrader()` and `python.worker.ts` (verified: `sys.flags.hash_randomization == 0` and identical set order across processes).
- Add a wall-clock guard for sync code in verify. Prototype: a `sys.settrace` tracer that raises after the deadline stopped `while True: pass` after exactly 0.50 s; overhead on a hot recursive function was ~35× (fib(22): 2 ms → 71 ms), and it conflicts with lessons that use `sys.settrace` themselves. A cleaner alternative is running the verify Pyodide in a Node `worker_thread` with `pyodide.setInterruptBuffer` and a `SharedArrayBuffer` written by the main thread after the deadline (raises `KeyboardInterrupt` in Python; not prototyped).
- Snapshot and restore interpreter-global state per test (`sys.meta_path`, `sys.path_hooks`, `sys.modules` keys, `sys.gettrace()`, `logging.Logger.manager.loggerDict` handlers, `warnings.filters`, `os.getcwd()`, recursion limit).
- Fail a test whose sync body evaluates a coroutine (for example, collect unraisable "never awaited" warnings through `sys.unraisablehook`/`warnings` during each test and attach them as notes).

## 3. Pipeline timing and capacity

Measured on a 16-core machine shared with other running agents (numbers are upper-bound-ish), 17 Python lessons (15 challenges), 58 Vitest tests.

| Run | Wall | Vitest "Duration" | Result |
| --- | --- | --- | --- |
| cold (`node_modules/.vite` cleared) | 12.95 s | 12.34 s (transform 53 %, import 28 %, tests 15 %) | 58/58 |
| warm 1 / 2 / 3 | 12.96 / 13.25 / 13.48 s | | 58/58, identical statuses in all three |
| warm, busier machine | 15.1 s | 14.33 s | 58/58 |
| `LESSON=python/text-and-bytes` | 16.3 s | 15.47 s | 4/4 |

- **Fixed cost dominates**: ~11–14 s is Vite transform + import of `content/allContent.ts` (eager glob of every track) plus `loadPyodide` (~1.6 s, ~210 MB RSS). A `LESSON=` filter does not reduce it.
- **Per-lesson cost is tiny**: the whole suite's test bodies took 350–400 ms; solution runs 143 ms, starter runs 164 ms, Run demos 37 ms in total. Slowest single test: 41 ms.
- **No memory growth**: grading all 15 challenges (solution + starter) 8 times in one Pyodide stayed at 464–471 MB RSS, 195–307 ms per round. Process-tree peak for the suite: ~1.1 GB.
- **Determinism**: 3 runs, identical pass/fail per test. The only nondeterminism source found is string hash randomization (§1).

Estimate for 115 lessons (~100 challenges): grading ~100 × 25 ms ≈ 2.5–3 s on top of the fixed ~13 s, so **~16–20 s and ~1.2 GB**, *provided* no test waits on real time. The budget killers are all async:
- every starter that fails by hitting the 4 s timeout adds 4 s per failing test (10 such tests = +40 s);
- real `asyncio.sleep` delays add up linearly across tests (keep them ≤ 50 ms per test);
- a single busy-loop starter or solution hangs CI indefinitely.

Proposed CI commands (always behind an outer kill timeout because of limit 1):

```bash
# per pull request touching src/content/python
timeout --signal=KILL 300 npx vitest run src/verify/python.test.ts src/verify/content.test.ts src/verify/curriculum.test.ts

# author loop for one lesson
LESSON=python/<lesson-id> timeout --signal=KILL 120 npx vitest run src/verify/python.test.ts

# main branch / nightly: everything, plus a determinism check
timeout --signal=KILL 900 npm run verify
for i in 1 2 3; do timeout --signal=KILL 300 npx vitest run src/verify/python.test.ts || exit 1; done
```

## 4. Spec items that must change (05–08 and the module 09–12 specs in 07)

| Spec | Lesson | Suggested change |
| --- | --- | --- |
| 02-content-standards "Pyodide limits" | all | Add rows: busy loops/blocking calls hang verify (starters must fail fast, never loop or wait forever); `asyncio.sleep` may fire early; `asyncio.to_thread` runs synchronously; `asyncio.run` only in Run demos; 32-bit `getsizeof`/`maxsize`; random string hash order; interpreter-global state leaks (cleanup in `finally`); recursion limit 1000. Replace the `time.sleep` row's "≤ 100 ms" with "≤ 50 ms per test". |
| 05 | `02-collections/04-set-algebra` | Tests compare sets as sets; any list output is `sorted`; Run demo never prints a raw set of strings. |
| 05 | `02-collections/08-text-and-bytes` | If sets/dicts of strings are printed or iterated, sort them. |
| 05 | `04-classes/06-slots` | Keep "do not assert byte sizes"; theory must say sizes differ by build (Pyodide is 32-bit) and must not quote 64-bit numbers as the learner's output. |
| 06 | `05-iteration/05-yield-from-and-send` | `flatten(nested)` fixtures stay well under the recursion limit (≤ 200 levels). |
| 06 | `06-context-and-errors/04-suppressing-and-handling-in-exit` | The `BaseException` propagation test must use a custom `BaseException` subclass, never real `KeyboardInterrupt`/`SystemExit` leaking out of a helper (the harness records them as failures but they look like infrastructure errors). |
| 06 | `07-stdlib/04-pathlib-and-io` | Use `tempfile.TemporaryDirectory()` per test (`/tmp` persists across the whole suite); forbid relative paths (cwd is `/home/pyodide`). |
| 06 | `07-stdlib/06-dates-and-times` | Confirmed: no tz data (`available_timezones()` is empty). Keep fixed offsets; do not suggest `loadPackage('tzdata')` (needs a CDN). |
| 06 | `07-stdlib/08-logging` | Each test uses a unique logger name (e.g. `f"dojo.{uuid4().hex}"`) or removes handlers in `finally`; otherwise "calling twice adds one handler" depends on test order. |
| 06 | `07-stdlib/09-argparse-and-cli` | `main(argv, out, err)` takes both streams: argparse writes usage errors to stderr, which the harness neither captures nor shows. |
| 07 | `10-async` constraint paragraph | Replace "delays ≤ 50 ms, injected clocks" with explicit rules: no `asyncio.run` in tested paths; no `time.sleep`; no elapsed-time assertions; starters return a wrong value fast instead of awaiting forever (each 4 s timeout costs CI time and shows a misleading "timed out" message); a starter with a busy loop is forbidden. Remove "Verify TaskGroup, timeout, Queue, Semaphore first": done here, all PASS. |
| 07 | `10-async/02-event-loop-mental-model` | "a never-awaited coroutine warns" can only be tested with `warnings.catch_warnings(record=True)` + `simplefilter("always")` + `gc.collect()`; every test that calls a learner coroutine must be `async def` and `await` it (a sync `assert mod.fetch()` passes vacuously). `asyncio.run` appears only in theory and the Run demo. |
| 07 | `10-async/03-tasks-and-gather` | Do not test garbage collection of unreferenced tasks (timing/GC dependent); keep it in theory. `first_done` must not depend on sleep durations being exact: use events or `sleep(0)` ticks. |
| 07 | `10-async/05-timeouts-and-cancellation` | `with_deadline` tests: timeout path uses `asyncio.Event().wait()` with a 20–50 ms deadline; success path uses `sleep(0)`; no assertion on elapsed time. The starter must not hang (e.g. it awaits without a deadline only on the success path). |
| 07 | `10-async/06-queues-locks-semaphores` | Unlocked `SafeCounter` starter must have an explicit `await asyncio.sleep(0)` between read and write so the lost update is deterministic. `Queue.shutdown` verified. |
| 07 | `10-async/08-blocking-and-threads` | Add the measured facts: `ThreadPoolExecutor` raises `RuntimeError: can't start new thread`; `asyncio.to_thread` "works" but runs synchronously; `time.sleep` blocks the loop and even the harness timeout. Any Run demo must not claim concurrency. |
| 07 | `10-async/09-threads-processes-and-the-gil` | Note that Pyodide reports `sys._is_gil_enabled() == True`, has no `concurrent.interpreters` (`_interpreters` missing) and `os.cpu_count() == 1`; no executable demo. |
| 07 | `09-typing/07-runtime-annotations` | Verified 3.14 deferred evaluation: plain `__annotations__` raises `NameError` for undefined names; `annotationlib.Format.FORWARDREF`/`STRING` work. `build_schema` must evaluate annotations after the module is fully executed. |
| 07 | `11-metaprogramming/07-frames-and-tracebacks` | `locals_of_caller()` returns `dict(frame.f_locals)` (PEP 667 proxy). Drop the "frame references not kept alive" weakref test: frames are not weak-referenceable and the result depends on GC timing. |
| 07 | `11-metaprogramming/08-bytecode-and-the-interpreter` | Quiz facts about opnames must be dated to 3.14 (`LOAD_FAST_BORROW`, `LOAD_SMALL_INT` exist; older names changed). |
| 07 | `12-tooling/05-modules-and-the-import-system` | Verified working. Every test installs the finder and uninstalls it plus pops its `sys.modules` entries in `finally`; a leaked finder affects every later lesson in the suite. Use module names prefixed `dojo_virtual_` to avoid shadowing stdlib or learner modules. |
| 07 | `12-tooling/03-environments-and-venv` | Do not read the real `sys.prefix`/`sys.base_prefix` in tests (Pyodide values are meaningless); pure functions only, as specified. |
| 08 | `13` capstone `concurrency`/`cpu_rules` | `to_thread`/`process_pool` stay PLAN strings only; nothing in the capstone executes threads or processes. |
| 08 | Pydantic spike questions | `node_modules/pyodide` contains no wheels (only the stdlib zip and the lock file), so `loadPackage('pydantic')` downloads from the jsDelivr CDN: verify would need network and the app would need to serve the wheels. Answer this before any lesson depends on it. |

## 5. Hardening applied (2026-11-04)

Superseded in part by §6: the `worker_threads` Worker below was replaced by permission-model child processes, and `pythonSandbox.worker.ts` by `pythonSandbox.child.ts`.

Implements B1, B2 and B4 of [12-security-review.md](12-security-review.md) and limits 1–4 of §2. Public APIs are unchanged (`pythonGrader()`, `createPythonEngine(pyodide)`, the browser client); new options are optional.

| Change | Where | Effect |
| --- | --- | --- |
| Verify runs Python in a `worker_threads` Worker with `env: {}` | `src/verify/pythonSandbox.ts`, `src/verify/pythonSandbox.worker.ts`, `src/verify/graders.ts` | `import js` exposes only ECMAScript globals and timers (`jsglobals`); after load the worker blocks every module import (`module.registerHooks`), strips `process.getBuiltinModule`/`binding`/`_linkedBinding`/`dlopen`/`kill`/`chdir`/uid setters and deletes `fetch`/`WebSocket`/`EventSource`/`XMLHttpRequest`. Verified from Python: `js.process` missing, `os.environ` without host variables, `Function("return process.env")` empty, `import('node:child_process')` rejected. |
| Hard per-test wall-clock limit (default 6 s, `pythonGrader({ testTimeoutMs })`) | `pythonSandbox.ts` + `run_tests(..., start_index, on_event)` in `dojo_harness.py` | The harness reports `start`/`result` per test; when a test exceeds the limit the host terminates the worker, fails that test (`did not finish within 6000ms and was stopped`) and resumes the remaining tests in a fresh worker (restart ≈ 1.2 s). Sync loops, async busy loops, `time.sleep`, import-time loops and Run demos (15 s) no longer hang the suite. |
| `PYTHONHASHSEED=0` | `PYTHON_ENV` in `engines/python/engine.ts`, used by `python.worker.ts` and the verify worker | Same set order in the browser and in verify. |
| Interpreter state restored after every test and Run | `InterpreterState` in `dojo_harness.py` | `sys.modules`, builtins, import hooks and paths, `sys` hooks, tracing/monitoring, recursion and int-digit limits, `os.environ`, cwd, `random` state, `decimal` context, logging, namespaces of the harness/`dojo_ai`/`asyncio`/`os`/`time`/`json` and 25 preloaded stdlib modules, new files in `/tmp` and `~`, leftover tasks (cancelled). |
| Never-awaited coroutines fail the test | `_run_test` / `unawaited_coroutines` in `dojo_harness.py` | Each test runs under `warnings.catch_warnings(record=True)` with an `always` filter for `coroutine … was never awaited` plus `gc.collect()`; a passing test that leaked one becomes a failure naming the coroutine. `coroutine.close()` on purpose is accepted. |
| Worker errors answer at once | `python.worker.ts` | `try/catch` around both requests posts `failed`; the client already terminates and restarts on it, so the UI no longer waits 45–75 s. |
| Faster per-test cleanup | `unload_project` | `importlib.invalidate_caches()` (≈ 22 ms per call: it rescans the stdlib zip) replaced by dropping only the `/app` finders from `sys.path_importer_cache`. |

Not done: network blocking in the **browser** worker (B3). Deleting `fetch`/`XMLHttpRequest`/`WebSocket` must happen on `WorkerGlobalScope.prototype` (they are inherited, not own properties), and Pyodide may still need `fetch` for a later `loadPackage` (module 13 Pydantic); it needs a browser test before shipping. A `connect-src 'self'` CSP header on the static host remains the recommended control. B5–B8 are unchanged.

Regression tests: `src/verify/pythonSandbox.test.ts` (11 tests, ≈ 20 s): sync loop, async busy loop and `time.sleep` each fail only their own test within 1.5 s + restart while the neighbours pass; import-time loop; endless Run demo; host isolation probes; hash seed; state restore across two tests; never-awaited coroutine in a sync test and in learner code; awaited and closed coroutines pass.

Timing, same machine and load, three runs each (baseline = `HEAD` in a scratch worktree with the same Python lessons):

| Suite | Before | After |
| --- | --- | --- |
| `npx vitest run src/verify/python.test.ts` (58 tests) | 9.3 / 9.4 / 9.4 s | 9.8 / 9.7 / 9.7 s |
| `npx vitest run src/verify/ai-engineering.test.ts` (455 tests) | 19.8 s | 20.8 s |
| Python test bodies only (python suite) | ≈ 350 ms | ≈ 630 ms (restore + `gc.collect` per test) |

The fixed cost (Vite bundle of the worker ≈ 0.3 s, Pyodide start in the worker ≈ 1.6 s) is paid once per suite file. Updated estimate for 115 lessons: ~20 s, unchanged in practice; each stopped test adds its limit plus ≈ 1.2 s. The CI commands in §3 keep their outer `timeout` as a last resort only.

## 6. Second hardening pass after the security re-review (2026-11-04)

Fixes R1–R3, R5 (cross-lesson), R6 and part of R7 from [12-security-review.md](12-security-review.md) "Re-review after hardening".

| Finding | Fix | Verified by |
| --- | --- | --- |
| R1 NODEFS host read/write | Interpreters are child processes under `--permission` with `--allow-fs-read` for `node_modules/pyodide/` and the child script only (no fs write, child process, worker or net grants). NODEFS/NODERAWFS and `mountNodeFS` are also deleted after load. Probe: a write through NODEFS crashes Pyodide on `ERR_ACCESS_DENIED` and writes nothing; the cached child script cannot be modified from lesson code | `pythonSandbox.test.ts` "NODEFS cannot be mounted", "the permission model denies writes, child processes and network" |
| R2 `process.report` env leak / `writeReport` | Child env is `{}` at the OS level (the report shows `{}`), `writeReport` is denied by the permission model, and `process.report` is removed | "process.report and process.loadEnvFile are unavailable" |
| R3 `process.loadEnvFile` | Denied by the permission model and removed | same test |
| R5 in-place mutation | A fresh interpreter per lesson (switch on a new `tests.py`); within a lesson the restore also covers class attributes (`json.JSONEncoder`/`JSONDecoder`, logging classes, `dataclasses.Field`, `decimal.Context`), the `copy`/`copyreg` dispatch tables, `logging`/`copyreg` namespaces and `gc.enable()` | "does not leak in-place stdlib mutations from one lesson to the next" (`JSONEncoder.default`, `Mapping.register(list)`), extended "restores builtins…" test (`JSONEncoder.default`, `copy._deepcopy_dispatch`, `gc.disable()`) |
| R6 native extensions purged | `sys.modules` purge skips modules whose `__spec__.origin` ends in `.so` or is `built-in` | code review; no `.so` lesson yet |
| R7 browser `notify` round trip | `engine.ts` passes the callback only when `onEvent` is given | — |
| Harness robustness | `describe_error` failures no longer escape `_run_test` (a test that set `sys.modules["json"] = None` used to crash the whole run) | "restores builtins…" |

Pyodide's NODEFS reads `process.binding("constants")`, which the permission model denies, so the child shims that one binding with `fs.constants`/`os.constants` before loading Pyodide and removes it afterwards.

Startup cost: a cold `loadPyodide` is ~1.5–1.7 s. Interpreters therefore boot from a **Pyodide memory snapshot** (`_makeSnapshot` + `makeMemorySnapshot()`, 31 MB, sent over IPC with `serialization: 'advanced'` in ~50 ms) made once per suite file by a child that runs no lesson code, with the harness's stdlib already imported: boot ≈ 0.1 s inside the child, ≈ 0.3 s including `fork`. 1–3 interpreters are kept warm (`DOJO_PYTHON_PREWARM`). The snapshot APIs are underscore-prefixed (experimental) in Pyodide 314.0.7: if a Pyodide upgrade breaks them, children fall back to a cold boot (correct but ~1.5 s per lesson).

Timing (same machine, load average 5–6, three runs for python):

| Suite | Baseline (`HEAD`) | Pass 1 (worker thread, shared interpreter) | Pass 2 (permission-model child, fresh per lesson, snapshot) |
| --- | --- | --- | --- |
| `src/verify/python.test.ts` (17 lessons, 58 tests) | 9.3 s | 9.7 s | 11.8 / 12.6 / 13.3 s |
| `src/verify/ai-engineering.test.ts` (44 Python lessons, 455 tests) | 19.8 s | 20.8 s | 27.4 s |
| Fresh per lesson without the snapshot (measured, not shipped) | — | — | python 20–22 s |

The remaining cost per lesson is the cold V8 wasm tier-up in each new process (Python solution runs take ~150 ms instead of ~50 ms). Estimate for 115 Python lessons: ~25–30 s for the Python track suite. Fresh per **test** was not adopted: it would add ~0.3 s per test (~400 tests ⇒ +2 min).

Still open: B3 browser network, a per-lesson fresh worker and per-test kill in the browser (R7), R8 forged events (accepted), `resourceLimits`/memory caps on the children (wasm32 caps each at 4 GB).

## 7. Third pass after security re-review 2 (2026-11-04)

| Finding | Fix | Verified by (`src/verify/pythonSandbox.test.ts`) |
| --- | --- | --- |
| R9 High: `process._debugProcess(process.ppid)` opened the inspector of the unrestricted parent | After Pyodide loads, the child replaces `globalThis.process` with a frozen allow-list object (`argv: []`, `env: {}`, `version`, `versions`, `platform`, `arch`, `release.name`: the fields Pyodide reads). The child's own IPC uses a reference captured before the swap. Children also start with `--disable-sigusr1` | "exposes none of the process members that act on the host" (one Python `@test` per member: `_debugProcess`, `_debugEnd`, `_kill`, `kill`, `abort`, `reallyExit`, `exit`, `dlopen`, `binding`, `_linkedBinding`, `getBuiltinModule`, `report`, `loadEnvFile`, `send`, `on`, `emit`, `chdir`, `umask`, `setuid`, `setgid`, `execve`, `_rawDebug`, `openStdin`, `mainModule`, `permission`, `pid`, `ppid`, `stdin`, `stdout`, `stderr`, `hrtime`, `memoryUsage`, `resourceUsage`, `channel`, `disconnect`); "cannot open the inspector on the parent process with _debugProcess" (call blocked, nothing listening on 127.0.0.1:9229 afterwards) |
| R10 High: `process._kill(-1, 9)` | Same allow-list | same test (`_kill`, `kill`) |
| Flags | `childExecArgv()`: `--permission`, `--allow-fs-read` for `node_modules/pyodide/` and the child script, `--disable-sigusr1`, and no other `--allow-*` | "starts children under the permission model without signal-activated inspector" |
| R5 Low: solution and starter shared an interpreter | A fresh interpreter for every `runTests` and every `runProgram` | "does not share an interpreter between the solution and the starter of one lesson" |

The parent Vitest process cannot be told to refuse inspector activation from inside a test file, and it is no longer reachable from lesson code (no `process` methods, no signals), so nothing changed there.

Timing. The machine had load average 7–13 from other agents during these runs, so compare columns only within one row:

| Suite | Fresh per lesson (§6) | Fresh per request (now) |
| --- | --- | --- |
| `ai-engineering.test.ts` (A/B, back to back, load ≈ 8) | 37.1 / 37.2 s | 46.5 / 43.4 s |
| `python.test.ts` (load 9–13) | — | 14.8 / 18.5 / 16.4 s |

The per-request isolation costs about 0.1–0.2 s per extra boot (two extra boots per lesson), so roughly +0.3 s per lesson: about +35 s for 115 Python lessons on a loaded machine, less on an idle CI runner.

## 8. Browser worker hardening (2026-11-04, branch `sre/browser-hardening`)

Closes B3, R7 and the verify memory caps.

| Item | Change | Verified |
| --- | --- | --- |
| B3 network from learner code | New `src/engines/python/lockdown.ts`, used by `python.worker.ts` and the verify child. Before load: `setTimeout`/`setInterval` refuse strings; `jsglobals` is an allow-list. After load: `fetch`, `XMLHttpRequest`, `WebSocket`, `WebSocketStream`, `WebTransport`, `EventSource`, `importScripts`, `Worker`, `SharedWorker`, `FontFace`, `fonts`, `caches`, `BroadcastChannel` and `eval` are removed from the scope and its prototype chain; `Function.prototype.constructor` and the async/generator constructors throw (no generated `import()`); `loadPackage`/`loadPackagesFromImports` reject | Chromium (Playwright, dev server): `getattr(js, "fetch")` is `None`, `pyfetch("https://example.com")` fails, `js.Object.constructor(...)` and `js.setTimeout("1", 0)` raise, `pyodide_js.loadPackage(url)` rejects with "disabled". Verify: `pythonSandbox.test.ts` "code generation is disabled", "network functions are gone", "package installation refuses URLs" |
| Worker CSP | Not added: it needs a response header from the dev middleware or the static host, and Pyodide's boot `eval`s its EM_ASM constants, so it would need `'unsafe-eval'`. The run-time lockdown above is stricter. Recommended for production: `connect-src 'self'` on the host | — |
| R7 per-test kill in the browser | `browserClient.ts` mirrors `pythonSandbox.ts`: the worker reports `start`/`result` per test, a 6 s timer per test terminates the worker, only that test fails and the rest resume in a fresh worker. Run keeps 15 s | Chromium: `while True: pass` failed only its test ("did not finish within 6000ms"), the tests before and after passed |
| R7 fresh interpreter per run | Every `gradePython` and `runPython` takes a fresh worker and terminates it afterwards; a memory snapshot is made once per page by a worker that runs no lesson code and transferred to each new worker; one worker is kept warm | Chromium: cold boot 1233 / 1138 ms, snapshot boot 188 / 177 ms (31.5 MB snapshot made in 1.3 s); warm grading runs 225–228 ms end to end |
| Verify memory caps | Children get `--max-old-space-size=256` and `--wasm-max-mem-pages=16384` (1 GB wasm memory) | `pythonSandbox.test.ts` "caps the JavaScript heap and the wasm memory", "fails a test that allocates past the memory cap and keeps grading" (1.5 GB `bytearray`) |
| Process allow-list test | Python can no longer generate JavaScript, so the per-member checks moved to a unit test of `processAllowList()` (`src/verify/pythonSandboxProcess.ts`), one case per member | `pythonSandbox.test.ts` "the process seen after lock-down has no …" |

Browser check (real Chromium through Playwright on `npm run dev`): the AI Engineering lesson "Calling a Model", Python variant: the starter graded 0/6, the solution pasted into Monaco graded 6/6 in 147 ms, and the Run demo printed its output and `Process exited with code 0`.

Not covered: a memory cap for the browser worker (browsers expose no wasm memory limit; a runaway allocation is bounded by the 4 GB wasm32 limit and the 6 s test kill), Firefox/Safari (snapshot boot falls back to a cold boot if the experimental snapshot API fails).

## 9. Closing the Function escape (security re-review 4, 2026-11-04)

| Finding | Fix | Verified |
| --- | --- | --- |
| R13 High: `pyodide_js._api.tests.Function` was the original `Function`; from it the reviewer ran a remote `import()` (esm.sh) and a `blob:` import in the browser worker | `lockDownPython` deletes `_api.tests`, replaces `globalThis.Function` and `eval` with throwing stand-ins (the `Function` stand-in keeps `Function.prototype`, so Pyodide's `instanceof Function` checks still work), and points every function constructor at it | `src/verify/pythonEscapeScan.py` walks every object reachable from `js` and `pyodide_js` (≈ 28 000 objects, data properties and prototypes, typed arrays skipped) and reports callables whose source is a native `Function`/`eval`/`AsyncFunction`/`GeneratorFunction`/`AsyncGeneratorFunction`. Mutation check: with `_api.tests` kept it reports exactly `pyodide_js._api.tests.Function`; with the fix it reports nothing (`pythonSandbox.test.ts`, and in Chromium) |
| Durable fix: worker CSP | `plugins/pythonWorkerCspPlugin.ts` sends `default-src 'none'; script-src 'self' 'wasm-unsafe-eval'; connect-src 'self'` with the worker script only, in Vite dev and preview. Pyodide boots under it: no `'unsafe-eval'` needed | Chromium, with `_api.tests` deliberately left in place for the probe: `Function("return 1")`, `Function("return import('https://esm.sh/…')")` and `Function("return import(URL.createObjectURL(new Blob(…)))")` all fail with `EvalError: Evaluating a string as JavaScript violates the following Content Security Policy directive…`. Header present on `python.worker.ts?worker_file…` and absent on other modules; the build emits `assets/python.worker-<hash>.js`, which the plugin matches |
| R12 Low: IndexedDB and native FS | `indexedDB` removed from the worker scope; `IDBFS`, `NATIVEFS_ASYNC`, `NODEFS`, `NODERAWFS` and `mountNativeFS`/`mountNodeFS` removed | Chromium probe and `pythonSandbox.test.ts` |
| Flaky timing test under CPU contention | Kill tests use a 4 s limit (was 1.5 s, so a trivial neighbour test could exceed it under load) and a 45 s upper bound on the whole report; they assert that the kill happened and that the following test passed | `pythonSandbox.test.ts` |

Production hosting requirement (also in CONTENT_GUIDE.md "Python engine"): send `Content-Security-Policy: default-src 'none'; script-src 'self' 'wasm-unsafe-eval'; connect-src 'self'` with `assets/python.worker-*.js`, and never add `'unsafe-eval'`.

Browser check after the fix (Chromium, `npm run dev` on the branch): the escape scan finds nothing, `_api.tests` is gone, code generation and storage file systems are refused, `while True: pass` fails only its test, and the AI Engineering "Calling a Model" Python variant grades the starter 0/6 and the pasted solution "All tests passed", with the Run demo ending in `Process exited with code 0`. No CSP violation was reported during these runs.

## 10. Entropy after lock-down (2026-11-04)

Reported by the module 07 author: in verify, `os.urandom` (and so `tempfile.mkdtemp`, `uuid.uuid4`, `secrets`, an unseeded `random.Random()`) killed the child with `Importing "node:crypto" is not allowed while lesson code runs`. Emscripten's `getentropy` imports `node:crypto` lazily on first use, which happened after `registerHooks` blocked imports. Fix: the child calls `os.urandom(1)` once after the harness is installed and before `lockDown`, so `node:crypto` is loaded while imports are still allowed. Regression test: `pythonSandbox.test.ts` "runs os.urandom, secrets, uuid4, tempfile and an unseeded Random after lock-down" (fails without the fix with exactly that error). The browser worker is not affected (its `getentropy` uses `crypto.getRandomValues`), but this was not re-checked in a browser.

While verifying this fix, three sandbox tests failed only when other worktrees ran verify at the same time: every worktree that symlinks the main `node_modules` wrote its own bundle to the same `node_modules/.cache/dojo-python-sandbox/python-sandbox-child.mjs`, so a run could fork another branch's child (here an older lock-down without the code-generation block). The child bundle is now named by content hash (`python-sandbox-child-<sha256 prefix>.mjs`) and the permission flag grants read access to that exact file; two full runs of the four suites then passed 1245/1245 while other agents were running verify.
