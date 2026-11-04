# Modules 02–04 — Collections, Functions, Classes

Format per lesson: **Concept**, **Contrast** (JS/TS), **Challenge** (contract), **Tests** (sentences, 3–6), **Notes** (facts to verify, Pyodide, demo). Every practice lesson also ships 2–4 hints, an `approach.md`, `concepts.json`, a 4–6 question `quiz.json` and a theory ending in `## When to choose it`, as in [02-content-standards.md](02-content-standards.md). Maps (`01-*-map`) are quiz lessons: what the module answers, prerequisites, path, the decision the ADR trains.

---

# 02-collections — Collections and Data Protocols

Question: which container and which protocol fits this data, and what does the type promise about order, uniqueness, hashing and mutation?

### 01-collections-map (Q, B)
Map of list/tuple/dict/set/frozenset/deque/Counter, the sequence/mapping/set protocols, text vs bytes. Quiz: pick the container for four scenarios.

### 02-unpacking-and-star-expressions (P, B)
- Concept: tuple/list unpacking, starred targets (`first, *middle, last`), `*`/`**` in calls and displays, nested unpacking, swap.
- Contrast: JS destructuring/spread/rest. Python's `*rest` is always a list; `**` merges dicts with right-most winning; unpacking works on any iterable.
- Challenge: `split_ends(items)` → `(first, middle_list, last)`, `ValueError` for fewer than two items; `merge_layers(*layers, **overrides)` → new dict, later layers win, overrides win last, inputs untouched; `swap_pairs(pairs)` → list of reversed 2-tuples via unpacking.
- Tests: ends of a 5-item list; middle is a `list`; fewer than two raises `ValueError`; layer precedence; inputs untouched; works on a generator input for `split_ends`.
- Notes: PEP 3132 (extended unpacking), PEP 448 (generalizations): cite, no volatile facts.

### 03-comprehensions-and-dict-views (P, I)
- Concept: list/set/dict comprehensions, conditional and nested clauses, comprehension scope; `dict.keys()/values()/items()` are live views that support set operations.
- Contrast: `map/filter/Object.fromEntries` vs comprehension; JS `Object.keys` returns a snapshot array, Python returns a live view.
- Challenge: `invert(mapping)` → `{value: set_of_keys}`; `group_by(items, key)` → `{key(item): [items…]}` preserving order; `shared_keys(first, second)` → set via `keys() & keys()`; `live_keys(mapping)` returns `mapping.keys()`.
- Tests: duplicates collected in a set; group order preserved; `shared_keys` result is a `set`; `live_keys` reflects a key added afterwards; `invert` does not mutate input.
- Notes: dicts keep insertion order since 3.7 (language guarantee). Comprehension inlining (PEP 709, 3.12) does not change semantics.

### 04-set-algebra (P, B)
- Concept: `|`, `&`, `-`, `^`, subset/superset, `frozenset`, average O(1) membership, hashable-only members, `dict.fromkeys` for ordered dedupe.
- Contrast: JS `Set` has no operators (until recent set methods); `array.includes` is O(n).
- Challenge: `access_report(roles, user_roles)` where `roles` maps role → set of permissions: returns `{"all": union, "common": intersection, "exclusive": symmetric difference, "missing": needed - union}` (needed passed as third parameter); `dedupe_keep_order(items)`; `unique_ids(*iterables)`.
- Tests: union/intersection/exclusive/missing for a fixture; empty roles → empty sets; dedupe preserves first occurrence; unhashable item raises `TypeError`.
- Notes: behavior only; never assert timing.

### 05-sequence-protocol (P, I)
- Concept: implementing `__len__` and `__getitem__` gives indexing, slicing, iteration fallback, `in`, `reversed`; slice objects; `collections.abc.Sequence` mixins.
- Contrast: extending `Array` vs implementing a protocol; negative indexes and `slice` objects.
- Challenge: `class Deck` over an internal list: `len`, int index (including negative), slices returning a new `Deck`, `IndexError` for out of range, `TypeError` for other key types; iteration works without defining `__iter__`.
- Tests: length; negative index; slice returns `Deck` with right items; iteration order; `reversed(deck)`; bad index raises `IndexError`.
- Notes: optional second step: `class Deck(Sequence)` gives `index`/`count` for free.

### 06-collections-module (P, I)
- Concept: `deque(maxlen)`, `Counter` arithmetic, `defaultdict`, `ChainMap`, `namedtuple`/`OrderedDict` only as history.
- Contrast: JS arrays used as queues (`shift` is O(n) conceptually) and manual `obj[key] ??= []`.
- Challenge: `class RecentItems(limit)` with `add`, `items()` (oldest first) over a `deque`; `class Inventory` over a `Counter` with `restock(sku, n)`, `remove(sku, n)` raising `ValueError` if insufficient, `available(sku)` and `snapshot()` returning a plain dict without zero entries; `layered_config(cli, env, defaults)` → `ChainMap` with lookup priority, writes landing in the first mapping.
- Tests: limit drops oldest; insufficient removal raises; zero entries absent from snapshot; chain priority and write target; `RecentItems` of limit 0 stays empty.
- Notes: `Counter` subtraction semantics: do not rely on removing negative counts silently.

### 07-custom-mapping (P, Ad)
- Concept: subclass `MutableMapping`, implement five methods, get `get/pop/update/setdefault/items/==` for free; why subclassing `dict` bypasses overrides in `update`/`get`.
- Contrast: JS `Proxy` and `Map` subclassing.
- Challenge: `class CaseInsensitiveDict(MutableMapping)`: lookup/set/delete ignoring case, iteration yields the *original-cased* key of the last write, `len`, `repr`, `copy()`.
- Tests: any-case lookup; assignment with different case keeps one entry and updates the stored key; `update` and `setdefault` come for free and respect case-insensitivity; `isinstance(d, MutableMapping)`; deleting in any case.
- Notes: store `{lower: (original_key, value)}`.

### 08-text-and-bytes (P, I)
- Concept: `str` is Unicode code points, `bytes` is data; encode/decode, `errors=` modes, normalization (`unicodedata`), `len` ≠ user-perceived characters, f-string format specs.
- Contrast: JS strings are UTF-16 code units (`"😀".length === 2`), Python's `len("😀") == 1`; JS has no bytes type besides `Uint8Array`.
- Challenge: `decode_lenient(data, encodings=("utf-8", "latin-1"))` tries encodings in order; `truncate_utf8(text, max_bytes)` never splits a character and returns `str`; `normalize_key(text)` → NFC + `casefold`; `money_row(label, cents)` → f-string `f"{label:<10}{cents/100:>8.2f}"`.
- Tests: valid UTF-8; Latin-1 fallback; truncation at a multi-byte boundary with an emoji; `normalize_key("É")` equals the decomposed form; row alignment exact for a fixture (format spec is the contract).
- Notes: grapheme clusters are not in the standard library (mention; no challenge).

### 09-collections-adr (A, I)
- Briefing: an event-payload store shared by 4 services: 12 000 000 lookups per minute by composite key (`tenant`, `event_id`), payloads kept in arrival order, a nightly batch of 2 000 000 payloads of which 5% are repeats, case-insensitive header names, a 3-service JSON contract.
- `PLAN`: `lookup_container` (`dict`|`set`|`list`), `key_type` (`str`|`tuple`|`frozenset`), `ordering` (`insertion`|`sorted`|`none`), `dedupe` (`set`|`dict.fromkeys`|`sort_unique`), `headers` (`CaseInsensitiveDict`|`lower_on_write`|`dict`), `protocol` (`mapping`|`sequence`|`custom_class`), `rejected` list.
- Computed fields (required by [02-content-standards.md](02-content-standards.md) "ADR checkpoint format"): `lookups_per_second` = 12 000 000 / 60 = **200 000**; `expected_unique` = 2 000 000 × 0.95 = **1 900 000**. Tests compare them exactly (integers).
- Coherence: composite key must be hashable (`tuple` or `str`, never `list`); lookups at that rate rule out `list`; dedupe must preserve arrival order; headers solution must be case-insensitive; payload order requires `insertion`.
- Test names are neutral ("the lookup choices are coherent with the briefing"), never the expected value.

---

# 03-functions — Functions, Modules and Callables

Question: how do arguments bind, what does a closure capture, and where should cross-cutting behavior live?

From this module on, solutions may use type annotations ([02-content-standards.md](02-content-standards.md) "Challenge rules"). The module has no ADR: it ends with the code integration challenge `10-client-middleware-stack`.

### 01-functions-map (Q, B)
Parameter kinds, modules, scope and closures, decorators, callable objects. One section, **"Annotations are not enforced"**: `def f(x: int)` accepts `"a"` at runtime, annotations are metadata read by checkers and tools, and module 09 covers checkers. Quiz: signature reading, decorator order, and one question predicting what `f("a")` does on an annotated function.

### 02-modules-and-imports (P, B)
- Concept: a module is a file executed once on first import and cached in `sys.modules`; `import x` vs `from x import y` (binding a name vs copying the current value); `__name__ == "__main__"`; packages and `__init__.py`; import-time side effects; circular imports and how to break them (import inside a function, move the shared piece out).
- Contrast: ES modules have live bindings (`export let` updates are seen by importers); `from config import LEVEL` copies the value once, so later rebinding in `config` is not seen. Node caches modules too, but `require` cycles return a partial `exports` object; Python returns a partially initialized module and fails on the missing name.
- Challenge (multi-file, `main.py` + `config.py` + `registry.py`): `current_level()` must see a level changed through `config.set_level()` (fix the starter's `from config import LEVEL` by reading `config.LEVEL`); `registry.py` registers handlers at import time and `main.handlers()` returns them, proving the module body ran once; break the starter's `registry` ↔ `main` circular import by moving the shared decorator into `registry.py`; `run_as_script()` code guarded by `if __name__ == "__main__":` must not run on import.
- Tests: level change visible after `set_level`; importing twice does not register handlers twice (`sys.modules` cache); the guarded block did not run on import (a module-level flag stays false); `main` imports cleanly with no circular import error.
- Notes: verify that the harness's fresh import per test resets `sys.modules` entries of learner modules (it must, or the "runs once" test leaks between tests). `importlib` internals belong to `11-metaprogramming/07-import-system-internals`.

### 03-args-and-kwargs (P, B)
- Concept: `*args` tuple, `**kwargs` dict, argument unpacking at call sites, forwarding.
- Contrast: JS rest parameters, spread, `arguments`; Python has named arguments at call time.
- Challenge: `forward(function, /, *args, **kwargs)` → `(result, call_record)` where `call_record = {"args": args, "kwargs": kwargs}`; `retry_call(function, /, *args, attempts=3, **kwargs)` forwards everything except `attempts`, re-raises the last error; `compose(*functions)` → left-to-right composition.
- Tests: positional/keyword forwarding; `attempts` not forwarded; retries stop on first success; compose of zero functions is identity; compose order.
- Notes: none volatile.

### 04-positional-and-keyword-only (P, I)
- Concept: `/` and `*` in signatures, `inspect.Parameter.kind`, why public APIs use them.
- Contrast: TS options objects as the keyword-only substitute.
- Challenge: define `connect(host, /, port=5432, *, ssl=True, timeout=None)` returning a dict; `describe_signature(function)` → `{name: kind_name}` using `inspect.signature`.
- Tests: `connect("db")` defaults; `connect(host="db")` raises `TypeError`; `connect("db", 5433, True)` raises `TypeError`; `describe_signature` of `connect` reports `POSITIONAL_ONLY`, `POSITIONAL_OR_KEYWORD`, `KEYWORD_ONLY`.
- Notes: PEP 570 (3.8), PEP 3102.

### 05-mutable-default-arguments (P, B)
- Concept: defaults evaluated once at definition; `None` sentinel; `dataclasses.field(default_factory=…)`; a private sentinel for `None` as a valid argument.
- Contrast: JS defaults evaluate per call, the classic reverse trap.
- Challenge: fix `add_tag(tag, tags=[])`; fix `class Registry(items={})`; `@dataclass class Settings` with list and dict fields using `default_factory`; `request(path, headers=_UNSET)` where `None` means "send no headers" and `_UNSET` means "use defaults".
- Tests: independent calls; independent `Registry` instances; two `Settings` do not share lists; `None` vs unset behavior.
- Notes: `inspect.signature(f).parameters["tags"].default` can reveal the shared list (use in theory only).

### 06-closures-and-late-binding (P, I)
- Concept: closures capture variables; late binding in loops; fixes with default arguments or `functools.partial` or a factory function; cell objects (`__closure__`).
- Contrast: `var` vs `let` in loops: Python behaves like `var`.
- Challenge: `make_handlers(names)` → list of callables, each returns `f"hello {name}"` for its own name; `make_multipliers(factors)` → callables multiplying by their own factor; `once(function)` → wrapper that runs once and caches the result (including an exception? no: only the result).
- Tests: handlers return their own names; multipliers independent; `once` calls the function once; arguments of the first call win.
- Notes: none.

### 07-decorators-and-wraps (P, I)
Merges the 115-plan lessons `06-decorators` and the `wraps` half of `07-functools-wraps-and-cache`.
- Concept: `@dec` is `f = dec(f)`; wrappers; stacking order (bottom-up application, top-down call); `functools.wraps` copies `__name__`, `__doc__`, `__wrapped__`, and `inspect.signature` follows `__wrapped__`.
- Contrast: TS stage-3 decorators and HOFs; Python decorators are plain functions with no metadata API, and a wrapper loses the wrapped function's metadata unless you copy it.
- Challenge: `count_calls(function)` adding a `calls` attribute on the wrapper and preserving metadata with `wraps`; `require_positive(function)` raising `ValueError` when the first positional argument ≤ 0; two decorators `first` and `second` appending to a module-level `ORDER` list on call.
- Tests: counter increments; error raised; stack records `["first", "second", "function"]` in the specified order; `__name__`, `__wrapped__` and `inspect.signature` match the original; return values untouched.
- Notes: PEP 318, PEP 614 (relaxed decorator grammar).

### 08-parameterized-decorators (P, Ad)
- Concept: decorator factories (three levels), decorators usable with and without arguments, class-based decorators, state in closures.
- Contrast: TS decorator factories; Python's `@retry` vs `@retry(times=3)` ambiguity.
- Challenge: `rate_limit(max_calls, period, clock)` → raises `RateLimitError` when more than `max_calls` calls happen inside `period` per the injected `clock()`; `retry(times=3, exceptions=(Exception,))` usable as `@retry` and `@retry(times=2)`, preserving metadata.
- Tests: window rollover with a fake clock; error type; retry success after failures; no retry for non-listed exceptions; bare and called forms both work.
- Notes: never use real time.

### 09-callables-partial-and-cache (P, I)
Takes the 115-plan lesson `09-callable-objects-and-partial` plus the cache half of `07-functools-wraps-and-cache`.
- Concept: `__call__`, `functools.partial/partialmethod`, `operator.itemgetter/attrgetter`, `singledispatch`, `lru_cache`/`cache`, `cached_property`.
- Contrast: classes with a `call()` method vs Python callables; function overloading by type; JS memoization libraries vs `lru_cache`.
- Challenge: `class Pipeline(*steps)` callable applying steps in order, `.then(step)` returns a *new* pipeline; `render = singledispatch` function with registrations for `int`, `list`, and a fallback; `exchange_rate(currency)` decorated with `lru_cache(maxsize=2)` over a call counter; `class Report` with a `cached_property` `total` computed once.
- Tests: pipeline immutability and call order; dispatch by type including subclass (`bool` → `int` handler unless registered); cache hits and eviction at `maxsize` via `cache_info()`; `cached_property` computed once per instance.
- Notes: `functools.cache` is `lru_cache(maxsize=None)`; `cached_property` and free-threading: mention only.

### 10-client-middleware-stack (P, Ad)
Code integration challenge that closes the module. It reuses the briefing of the deferred `10-functions-adr` (see [03-curriculum.md](03-curriculum.md) "v2 backlog") as code instead of a plan.
- Concept: composing cross-cutting behavior (cache, metrics, retry, auth refresh) as decorators with explicit order; state in closures, not globals; injected clocks; metadata preserved through every layer.
- Contrast: Axios/fetch interceptors and Express middleware chains; in Python the stack order *is* the decorator order, read bottom-up.
- Challenge: decorator factories `cached(store)`, `measured(metrics)`, `retried(times, exceptions)`, `authenticated(tokens)` and `build_client(call, *, store, metrics, tokens, clock)` that returns the wrapped call in the order cache → metrics → retry → auth (outermost first, stated in `challenge.md`). `authenticated` refreshes the token once on `AuthExpired` and retries the inner call. Because `measured` sits outside `retried`, it records one sample per client call (with the total elapsed time across attempts), not one per attempt.
- Tests: a cache hit skips every inner layer (call counter); a call that fails twice and then succeeds produces 3 inner calls but 1 metrics sample; an expired token is refreshed exactly once; the composed function keeps `__name__` and `__wrapped__` chain; no module-level mutable state (two clients built side by side do not share counters).
- Notes: no real time; the clock is injected. Keep 5 tests.

### v2 backlog — 10-functions-adr (A, I)
Deferred ([03-curriculum.md](03-curriculum.md) "v2 backlog"). Spec kept for v2:
- Briefing: internal HTTP SDK used by 9 teams: logging, retries, auth refresh, metrics, caching and rate limits on every call; teams want to add behavior without editing the client; errors must keep the original function names in traces; tests need deterministic clocks.
- `PLAN`: `mechanism` (`decorators`|`callable_pipeline`|`subclassing`|`dependency_injection`), `order` (list of cross-cutting concerns outermost → innermost), `metadata_preserved` bool, `time_source` (`injected_clock`|`system_clock`), `state_location` (`closure`|`instance`|`global`), `rejected`.
- Coherence: `order` fixed by the briefing; `metadata_preserved` is `true`; `time_source` is `injected_clock`; `state_location` is not `global`; `mechanism` is not `subclassing` when 9 teams add behavior independently. A v2 version must add a computed field (for example the worst-case attempts per client call from the retry and auth settings).

---

# 04-classes — Classes, Attributes and Descriptors

Question: where does an attribute really live, and which hook runs when you read, write or create one?

### 01-classes-map (Q, B)
Instance vs class attributes, lookup order, `__dict__`, descriptors, MRO. Quiz: attribute lookup predictions.

### 02-new-and-init (P, I)
- Concept: `__new__` creates, `__init__` initializes; immutable subclasses need `__new__`; instance caching; `__init__` re-runs when `__new__` returns an existing instance.
- Contrast: JS constructors do both; no `new`-only hook.
- Challenge: `class Currency` interned by code (`Currency("EUR") is Currency("EUR")`); `class Percent(float)` validated in `__new__` (0–100 else `ValueError`); an init counter proves `__init__` is idempotent.
- Tests: same object for same code; different codes differ; `Percent(101)` raises; `isinstance(Percent(5), float)` and arithmetic result is `float`.
- Notes: weak-reference caches optional.

### 03-properties (P, I)
- Concept: `@property`, setter, deleter, read-only and computed attributes; start with public attributes and add properties later; `property` is a descriptor.
- Contrast: TS getters/setters and `private`.
- Challenge: `class Temperature` with `celsius` (validated ≥ −273.15), read/write `fahrenheit`, read-only `kelvin`, deleter resets to 0.
- Tests: conversions; validation error; `AttributeError` assigning `kelvin`; `isinstance(Temperature.celsius, property)`; deleting resets.

### 04-descriptors-and-set-name (P, Ad)
Merges the 115-plan lessons `04-descriptors` and `05-set-name`: `__set_name__` is a descriptor hook, so one challenge in two steps.
- Concept: `__get__`, `__set__`, `__delete__`; data vs non-data descriptors and precedence over instance `__dict__`; why state lives on the instance; `__set_name__` gives a descriptor its attribute name; collecting fields from the class namespace.
- Contrast: no JS equivalent besides `Object.defineProperty`; TS decorators do not change lookup.
- Challenge, step 1: `class Positive` data descriptor storing values on instances; `class LazyAttribute(function)` non-data descriptor caching into the instance `__dict__` after first access. Step 2: `class Field(min_value, max_value)` using `__set_name__` so error messages contain the attribute name; `class Model` base with classmethod `fields()` returning names in definition order.
- Tests: instance isolation (two objects, different values) and class access returns the descriptor; lazy computed once and assignment overrides it; invalid value raises with the attribute name in the message; `fields()` order and two models independent.
- Notes: PEP 487 (3.6). Advanced level: budget 30–45 minutes; split again only if review time exceeds that.

### 05-slots (P, I)
- Concept: `__slots__` removes `__dict__`, blocks new attributes, saves memory; subclasses without `__slots__` regain `__dict__`; `dataclass(slots=True)`.
- Challenge: `class Point3D` with slots; a slotted child; `@dataclass(slots=True) class Pixel`.
- Tests: no `__dict__`; assigning an unknown attribute raises `AttributeError`; child without slots has `__dict__`; dataclass slots instance has no `__dict__`.
- Notes: do not assert byte sizes.

### 06-dataclasses (P, I)
- Concept: `@dataclass` options (`frozen`, `order`, `slots`, `kw_only`), `field`, `__post_init__`, `InitVar`, `replace`, `asdict`.
- Contrast: TS interfaces/classes with parameter properties; dataclasses generate methods at class-creation time.
- Challenge: `@dataclass(frozen=True, order=True) class Product` with validation in `__post_init__` and `tags` default factory; `with_price(product, price)` using `replace`.
- Tests: frozen assignment raises `FrozenInstanceError`; ordering by fields; validation; tags not shared; `replace` keeps other fields.

### 07-data-model-methods (P, I)
- Concept: `__repr__`/`__str__`/`__format__`, `__eq__`/`__hash__`, `__lt__` with `total_ordering`, `NotImplemented`, `__bool__`, `__add__`/`__radd__`.
- Challenge: `class Money` (cents + currency) with repr that round-trips (`eval`-free: compare `repr(m)` string), `format(m, ".2f")`-style `__format__`, ordering within a currency (`TypeError` across currencies), `+` returning `NotImplemented` for non-Money, hash/eq consistent.
- Tests: set dedupe; `sorted`; cross-currency compare/add raises `TypeError`; `Money + 1` raises `TypeError`; `sum([...], start=Money.zero("EUR"))` works.

### 08-inheritance-and-mro (P, Ad)
- Concept: C3 linearization, `super()` as "next in MRO", cooperative multiple inheritance, mixins.
- Contrast: JS single inheritance plus mixin functions.
- Challenge: three mixins and a base recording `save()` call order in a list through cooperative `super().save()`; `linearize(cls)` → list of class names from `__mro__`; a diamond whose order is asserted.
- Tests: call order for a specific class composition; `linearize` output; `super()` without arguments works in each mixin; incompatible MRO raises `TypeError` (constructed with `type()` in the test).
- Notes: none.

### 09-classes-adr (A, Ad)
- Briefing: a domain model for an order system with 40 entity types: validation rules reused across 15 fields, immutable value objects, 1 000 000 line-item instances in memory with a **100 MB** budget for them, audit/timestamp behaviors shared by many classes, third-party serialization. A measurement in the briefing gives **152 bytes** per line item with `__dict__` and **72 bytes** with `__slots__` (stated as given; never measured in the sandbox).
- `PLAN`: `entities` (`dataclass`|`plain_class`|`namedtuple`|`pydantic`), `validation` (`descriptors`|`properties`|`post_init`), `value_objects` (`frozen_dataclass`|`mutable`), `shared_behavior` (`mixins`|`inheritance`|`composition`), `cooperative_super` bool, `memory` (`slots`|`default`), `estimated_memory_mb` int, `rejected`.
- Computed field: `estimated_memory_mb` = 1 000 000 × the per-instance size of the chosen `memory` option / 1 000 000 → **72** with `slots` (152 with `default`, which exceeds the budget). The test checks the number matches the chosen option and is ≤ 100.
- Coherence: 15 shared validations rule out per-field properties; value objects frozen; mixins require `cooperative_super: true`. Test names are neutral.
