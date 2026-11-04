# Modules 05–08 — Iteration, Context and Errors, Standard Library, Pattern Matching

Same per-lesson format and shared lesson requirements as [05-modules-02-to-04.md](05-modules-02-to-04.md). Time, randomness, filesystem and logging side effects are always injected or isolated under `/tmp`.

---

# 05-iteration — Iterators and Generators

Question: when does work happen, who owns the iteration state, and when should a pipeline be lazy?

### 01-iteration-map (Q, B)
Iterable vs iterator, generators, itertools, laziness. Quiz: exhaustion predictions.

### 02-iterator-protocol (P, I)
- Concept: `__iter__`/`__next__`, `StopIteration`, iterable vs iterator, `iter()`/`next()`, re-iterable containers return a fresh iterator.
- Contrast: JS `Symbol.iterator`, `{ value, done }` result objects vs `StopIteration`.
- Challenge: `class Paginator(pages)` re-iterable (each `for` restarts); `class LineReader(lines)` a one-shot iterator (iterator is its own iterable); `is_iterator(obj)` and `is_reiterable(obj)` helpers using `iter(obj) is obj`.
- Tests: two loops over `Paginator` both see all items; second loop over `LineReader` is empty; `next()` past the end raises `StopIteration`; helper truth table.

### 03-generators (P, B)
- Concept: `yield` suspends the frame; generator objects are iterators; laziness; `return` inside generators.
- Contrast: JS `function*` is the same idea; Python generators are the default tool for lazy pipelines.
- Challenge: `read_blocks(lines)` yields lists of lines separated by blank lines; `take(count, iterable)` yields at most `count` items without consuming more; `id_sequence(prefix)` infinite `prefix-1`, `prefix-2`…
- Tests: block splitting incl. trailing block; `take` stops consuming (a counting source proves it); infinite sequence first three; generator is not a list (`inspect.isgenerator`).

### 04-generator-expressions-and-laziness (P, B)
- Concept: `(x for x in …)`, one-shot, `any/all/sum/min/max` short-circuit, `next(gen, default)`.
- Challenge: `first_match(items, predicate, default=None)` via `next`; `total_valid(records, is_valid)` with a generator expression; `count_evaluations` helper demonstrating `any` short-circuit with a recording predicate.
- Tests: first match stops evaluation; default returned; `any` stops at first true; exhausted generator yields empty on second pass.

### 05-yield-from-and-send (P, Ad)
- Concept: `yield from` delegation (values, `send`, `throw`, return value), `gen.send/close/throw`, `finally` in generators, `StopIteration.value`.
- Challenge: `flatten(nested)` for arbitrary nesting excluding `str`/`bytes`; `running_average()` generator primed by `next()` and fed with `send`; `collect(generator)` → `(items, return_value)`; cleanup test: closing a generator runs its `finally`.
- Tests: deep flatten; averages after sends; return value captured; `close()` triggers cleanup flag.

### 06-itertools (P, I)
- Concept: `chain.from_iterable`, `islice`, `groupby` (needs sorted input), `accumulate`, `pairwise`, `batched` (3.12), `tee` caveats.
- Challenge (log tooling): `batches(records, size)` using `itertools.batched` (or a fallback documented as the old pattern); `runs(events)` → list of `(status, count)` for consecutive equal statuses via `groupby`; `running_totals(amounts)` via `accumulate`; `transitions(statuses)` via `pairwise`.
- Tests: last short batch; run-length output for a fixture; totals; transitions; `groupby` on unsorted input is explicitly shown (test documents run semantics).
- Notes: `itertools.batched` `strict=` added in 3.13: verify before mentioning.

### 07-lazy-pipelines (P, Ad)
Closes the module as its code integration challenge (no ADR in module 05; see [03-curriculum.md](03-curriculum.md)). The theory's `## When to choose it` carries the decision the deferred ADR trained: lists vs generators under a memory limit, and when to materialize.
- Concept: composing generator stages; backpressure by pulling; closing the pipeline releases resources.
- Challenge: stages `parse(lines)`, `only_errors(records)`, `chunked(records, size)`; `Source` class counting reads and recording `closed` in `close()`; `pipeline(source)` returns a lazy generator; consuming only the first chunk reads only what is needed and closing the pipeline closes the source via `try/finally`.
- Tests: read count after first chunk; source closed after `.close()`; no work happens until iteration; errors in parse propagate with the offending line in the message.

### v2 backlog — 08-iteration-adr (A, I)
Deferred ([03-curriculum.md](03-curriculum.md) "v2 backlog"). Spec kept for v2; a v2 version must add a computed field (for example the largest `batch_size` that fits the memory limit at a stated bytes per row).
- Briefing: nightly export of 30M rows, memory limit 512 MB, 10 consumers of partial results, retries after failures resume at row N, results sometimes needed twice.
- `PLAN`: `pipeline` (`generators`|`lists`|`mixed`), `batch_size` int, `reiterable_results` bool, `materialize_at` (`never`|`sink`|`each_stage`), `resource_cleanup` (`try_finally`|`context_manager`|`none`), `rejected`.
- Coherence: `lists` impossible with 512 MB; `batch_size` positive and ≤ 100000; reiterable results require materialization at `sink`; cleanup not `none`.

---

# 06-context-and-errors — Context Managers and Exceptions

Question: who releases the resource when something fails, and what does an exception carry?

### 01-context-errors-map (Q, B)
`with`, `finally`, exception hierarchy, chaining, groups. Quiz: order of `__exit__` and `finally`.

### 02-with-protocol (P, I)
- Concept: `__enter__`/`__exit__(exc_type, exc, tb)`, return value controls suppression, `with` with multiple items.
- Contrast: JS has `try/finally` and `using` (explicit resource management, stage 3/ES2026: verify status) but no protocol-based `with`.
- Challenge: `class Timer(clock)` records `elapsed` using an injected clock; `class Transaction(store)` commits on success and rolls back on exception, re-raising; `__enter__` returns the object.
- Tests: elapsed from fake clock; commit and rollback flags; exception propagates; exit receives exception info.
- Notes: verify the current `using` proposal status and date it.

### 03-contextmanager-decorator (P, I)
- Concept: `@contextmanager`, the single `yield`, `try/finally` around it, exceptions thrown in at the `yield`, `ContextDecorator`.
- Challenge: `temporary_env(mapping, key, value)`; `captured_output()` yielding a `StringIO` and restoring `sys.stdout`; `section(log, name)` appending `enter:name` / `exit:name`.
- Tests: restoration after normal exit and after an exception; nesting order; value yielded.

### 04-suppressing-and-handling-in-exit (P, Ad)
- Concept: returning `True` swallows; `contextlib.suppress`; `ErrorCollector` pattern; never swallow `BaseException` subclasses by accident.
- Challenge: `class Suppress(*types)`; `class ErrorCollector(*types)` collecting matching errors in `.errors` and suppressing them, letting others propagate; `run_all(callables)` using the collector and returning `(results, errors)`.
- Tests: suppression only for listed types; others propagate; collector keeps order; `KeyboardInterrupt`-like `BaseException` subclass propagates.
- Notes: `capture_error` in the harness catches `Exception` only; tests for `BaseException` use `try/except BaseException`.

### 05-exitstack (P, Ad)
- Concept: `ExitStack`, `enter_context`, `callback`, `push`, `pop_all` (ownership transfer), cleanup order (LIFO).
- Challenge: `open_all(openers)` opens every resource and closes already-opened ones if a later one fails; `class ResourcePool` using `ExitStack.pop_all()` for transfer to `close()`.
- Tests: all closed after normal use; partial failure closes opened ones in reverse order; `pop_all` keeps them open until `close()`.

### 06-exception-hierarchies (P, B)
- Concept: `BaseException` vs `Exception`, domain exceptions, `except` ordering by specificity, `LookupError`/`OSError` families, `else`/`finally`.
- Contrast: JS can throw anything; Python only `BaseException` instances; errors are typed.
- Challenge: `AppError` → `ValidationError`, `NotFoundError`, `ConflictError` (with `status` class attribute); `exit_status(error)` returning the nearest `status` via MRO; `parse_age(text)` raising `ValidationError` with a message.
- Tests: subclass relationships; `except AppError` catches children; status resolution; `Exception` not `BaseException` ancestry.

### 07-chaining-and-notes (P, I)
- Concept: `raise … from …`, `__cause__`, `__context__`, `from None`, `add_note`, `__notes__`.
- Challenge: `load_config(text)` wraps `json.JSONDecodeError` into `ConfigError` with `from`; `reraise_hidden(function)` uses `from None`; `annotate(error, **context)` adds a note per key sorted.
- Tests: `__cause__` identity; `__suppress_context__` true with `from None`; notes order; message untouched.
- Notes: `add_note` 3.11 (PEP 678).

### 08-exception-groups (P, Ad)
- Concept: `ExceptionGroup`, `except*`, `split`/`subgroup`, nesting, why concurrency created them.
- Contrast: `AggregateError`/`Promise.allSettled`.
- Challenge: `validate_all(record, rules)` collects every failed rule in an `ExceptionGroup("validation failed", errors)`; `handle(group)` with `except*` returning counts per type; `only(group, type)` using `subgroup`.
- Tests: all errors collected; `except*` handles two types separately; unmatched types re-raise as group; empty errors raise nothing.
- Notes: PEP 654 (3.11).

### 09-context-errors-adr (A, I)
- Briefing: payment-capture workflow touching one database connection, one message-broker channel and one file export **per active region**; on an average run **4 regions** are active, on a peak run **7**; partial failures must not leave locks held; operators need the root cause and the order ID; support wants all validation errors at once (a capture request has 11 validated fields).
- `PLAN`: `resource_management` (`context_managers`|`try_finally`|`gc`), `multi_resource` (`exit_stack`|`nested_with`), `peak_resources` int, `error_model` (`hierarchy`|`error_codes`|`strings`), `validation_errors` (`exception_group`|`first_error`), `max_errors_reported` int, `chaining` (`from_cause`|`none`), `context_notes` bool, `rejected`.
- Computed fields: `peak_resources` = 1 + 1 + 7 = **9** (database, broker, one export per region at peak); `max_errors_reported` = **11** (every validated field can fail in one request).
- Coherence: a resource count that varies per run (6 to 9) requires `exit_stack`; all-at-once validation requires `exception_group`; root cause requires `from_cause`; `gc` rejected. Test names are neutral.

---

# 07-stdlib — Standard Library in Practice

Question: which batteries replace which npm packages, and which defaults lose data silently?

### 01-stdlib-map (Q, B)
Standard-library tour for JS developers (`json`, `re`, `pathlib`, `decimal`, `datetime`, `enum`, `logging`, and `argparse` as theory only) and the npm equivalent of each. The module has no ADR; it ends with `08-logging`.

### 02-json-and-serialization (P, I)
- Concept: `json.dumps/loads`, `default=`, `object_hook`, `sort_keys`, `separators`, what is lossy (tuples → lists, int keys → strings, `NaN`).
- Challenge: `class DojoEncoder(json.JSONEncoder)` handling `datetime` (ISO), `Decimal` (string), dataclasses; `dumps_stable(value)` sorted keys, compact separators; `loads_with_decimals(text)` using `parse_float=Decimal`.
- Tests: round trips; stable bytes for dict order; unknown types raise `TypeError`; floats become `Decimal`.

### 03-regular-expressions (P, I)
- Concept: `re.compile`, groups and named groups, `match` vs `search` vs `fullmatch`, greedy vs lazy, `VERBOSE`, `sub` with function, raw strings.
- Contrast: JS regex literals, no named-group `(?<n>)` difference (Python `(?P<n>)`), `fullmatch` vs anchors.
- Challenge: `parse_log_line(line)` → dict via named groups, `None` if no match; `mask_emails(text)` with `sub` and a callback keeping the first character and domain; `extract_ids(text)` using `finditer`.
- Tests: fixtures including no-match; lazy quantifier case; masks multiple emails.

### 04-pathlib-and-io (P, I)
- Concept: `PurePosixPath` vs `Path`, `/` operator, `read_text/write_text`, `StringIO/BytesIO`, text vs binary modes, encoding argument, `tempfile`.
- Challenge: `build_path(*parts)` with `PurePosixPath`; `write_report(directory, rows)` writes CSV to a `Path` under the given directory and returns the path; `read_report(path)` returns rows; `copy_stream(source, target, chunk_size)` between `BytesIO` objects.
- Tests use `/tmp/dojo-<unique>`; paths, round trip, chunking.
- Notes: Pyodide file system is in memory.

### 05-numbers-decimal-and-fractions (P, I)
- Concept: binary floating point error, `Decimal` contexts and `quantize`, `Fraction`, `round` (banker's), integer arbitrary precision, `//` and `%` with negatives.
- Contrast: JS has only IEEE doubles (`Number`) and `BigInt`.
- Challenge: `split_bill(total_cents, people)` returns a list of ints summing exactly to total, distributing remainder from the first; `round_money(value)` → `Decimal` rounded `ROUND_HALF_UP`; `exact_ratio(text)` → `Fraction`.
- Tests: sums; `0.1 + 0.2 != 0.3` documented via a test on `math.isclose`; rounding of 2.675 as Decimal vs float.

### 06-dates-and-times (P, I)
- Concept: aware vs naive `datetime`, `timezone.utc`, `timedelta`, `fromisoformat`, `strftime`, never compare naive with aware.
- Challenge: `to_utc(text)` parses ISO text (with offset required, `ValueError` otherwise); `add_months(date, n)` clamping end of month; `age_in_days(start, end)`; clocks injected.
- Tests: offsets normalize; naive input rejected; Jan 31 + 1 month = Feb 28/29; negative months.
- Notes: do not use `zoneinfo` (no tz data in Pyodide by default).

### 07-enums (P, I)
- Concept: `Enum`, `auto`, `StrEnum`, `IntEnum` pitfalls, `Flag`, `_missing_`, members are singletons compared with `is`.
- Challenge: `Status(StrEnum)` with `parse(text)` classmethod using `_missing_` for case-insensitive lookup; `Permission(Flag)` with `READ|WRITE`; `describe(flags)` returns sorted member names.
- Tests: parsing; invalid raises `ValueError`; flag composition and membership; `IntEnum` equality with int documented.

### 08-logging (P, I)
- Concept: loggers, handlers, formatters, levels, propagation, `extra`, configure once, library vs application logging.
- Contrast: `console.log` vs the logging tree.
- Challenge: `configure_logger(name, stream, level)` idempotent (calling twice adds one handler); `log_event(logger, event, **fields)` adds fields in the record; capturing through a `StringIO` handler.
- Tests: single handler after two configs; level filtering; format contains level and message; fields attached to the record via `extra`.

### v2 backlog — 09-argparse-and-cli (P, I)
Deferred: no `sys.argv` or shell in the sandbox, so the challenge would teach argparse through a stand-in. Spec kept for v2.
- Concept: `ArgumentParser`, subcommands, types, defaults, `parse_args(argv)`, exit behavior (`SystemExit`), `main(argv)` returning an exit code.
- Challenge: `build_parser()` with subcommands `add` and `list`; `main(argv, out)` returns 0/2 and writes to the `out` stream.
- Tests: parsing results; unknown command raises `SystemExit` with code 2 (caught as `BaseException`); output captured.

### v2 backlog — 10-stdlib-adr (A, I)
Deferred ([03-curriculum.md](03-curriculum.md) "v2 backlog"). Spec kept for v2; a v2 version must add a computed field.
- Briefing: a billing-report tool: money, multi-timezone timestamps, JSON export for 3 consumers, logs for operators, CLI for finance, files on shared storage.
- `PLAN`: `money_type` (`decimal`|`float`|`int_cents`), `timestamps` (`aware_utc`|`naive_local`|`strings`), `serialization` (`custom_encoder`|`str_everywhere`|`pickle`), `logging` (`configured_logger`|`print`), `cli` (`argparse`|`manual`), `rejected`.
- Coherence: finance requires exact money (`decimal` or `int_cents`, not `float`); multi-timezone requires `aware_utc`; cross-team JSON excludes `pickle`; operators require a configured logger.

---

# 08-pattern-matching — Pattern Matching and Control Flow

Question: when does `match` express intent better than `if/elif`, dict dispatch or polymorphism?

### 01-matching-map (Q, B)
`match` is destructuring plus dispatch, not `switch`. Quiz: capture-vs-compare pitfalls.

### 02-sequence-and-mapping-patterns (P, I)
- Concept: sequence patterns with `*rest`, mapping patterns (extra keys allowed), literals, wildcard, nested patterns.
- Contrast: JS `switch` compares by `===`; Python patterns bind names and check structure.
- Challenge: `parse_command(tokens)` → dict for `["move", x, y]`, `["say", *words]`, `["quit"]`, anything else → `ValueError`; `handle_event(event)` for mapping events `{"type": "click", "pos": (x, y)}` and `{"type": "key", "key": k}`.
- Tests: each shape; extra keys tolerated; unknown shape raises.

### 03-class-patterns (P, I)
- Concept: class patterns, `__match_args__`, dataclass auto `__match_args__`, positional vs keyword sub-patterns.
- Challenge: dataclasses `Circle`, `Rectangle`, `Square`; `area(shape)`; `describe(event)` for custom `__match_args__`; unknown type raises `TypeError`.
- Tests: all shapes; positional vs keyword patterns; custom match args class.

### 04-guards-or-and-capture (P, I)
- Concept: guards (`if`), or-patterns (`|`), `as` capture, value patterns (`Color.RED`, dotted names) vs capture names, order matters.
- Contrast: bare names capture, they do not compare (`case DEFAULT:` binds).
- Challenge: `route(request)` returning handler names for `("GET", "/users")`, `("GET", "/users", id)`, methods in or-patterns, version prefix capture, guard on role.
- Tests: route table fixtures; guard fallthrough; first match wins; a test proving a bare-name `case` captures anything (documented through the starter bug).

### 05-walrus-and-loop-else (P, I)
- Concept: `:=` in `while`/comprehensions/conditions, `for … else`, `try … else`, conditional expressions.
- Challenge: `read_chunks(read, size)` with `while chunk := read(size)`; `find_first(items, predicate)` using `for … else` returning `(index, item)` or `None`; `parse_pairs(lines)` with a walrus in a comprehension filter.
- Tests: chunk boundaries with an empty final read; `for/else` not triggered by `break`; comprehension with walrus keeps parsed values.

### v2 backlog — 06-matching-adr (A, I)
Deferred ([03-curriculum.md](03-curriculum.md) "v2 backlog"). Module 08 ends with `05-walrus-and-loop-else`; the dispatch decision is trained by the module 09 and 10 ADRs and the capstone. Spec kept for v2; a v2 version must add a computed field.
- Briefing: an API gateway routes 25 message types, with 5 new types per quarter, 3 teams adding handlers, payloads arriving as JSON dicts and typed objects, 1M msgs/min.
- `PLAN`: `dispatch` (`match`|`dict_registry`|`polymorphism`|`singledispatch`|`if_elif`), `payload_model` (`dataclasses`|`dicts`|`mixed`), `extension_point` (`registry`|`edit_match`|`subclass`), `exhaustiveness` (`wildcard_raises`|`silent_default`), `rejected`.
- Coherence: 3 teams adding handlers rule out `edit_match` and `if_elif`; unknown types must not pass silently; `match` only as a leaf decoder, `registry` as extension point.
