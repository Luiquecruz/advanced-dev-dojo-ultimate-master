# Module 01 — Names, Objects and Scope (pilot)

Folder: `src/content/python/01-object-model/`. This module is implemented first to validate the format, the harness and the pedagogy. Standards: [02-content-standards.md](02-content-standards.md).

`module.json`:

```json
{ "title": "Names, Objects and Scope", "description": "How Python binds names to objects: references, mutability and hashing, scope, copying, identity versus equality, and truthiness. The mental model every other module relies on." }
```

**Question this module answers:** when two names point at the same object, who sees a change, and which operations create a new object instead?

**Path:** names → mutability and hashing → scope → copying → identity/equality → truthiness → a decision record.

---

## 01-python-map — Python Track Map (Q, beginner)

- Tags: `["established", "core", "theory"]`. No challenge; `quiz.json` with 4 questions.
- Theory (200–500 words): how the track works (theory, challenge, hints, quiz, ADR per module), the 13-module path, who it is for (learners with no prior programming language), the Pyodide runtime (CPython 3.14 in the browser, first load about 12 MB), what the browser cannot run (threads, network, real venv: taught in theory), maturity tags, the `**Status as of**` convention.
- Key idea (a map has no `## Common mistakes`): names bind to objects, everything is an object, and protocols (dunder methods) drive much of the syntax.
- Quiz topics: what the Run button does, which topics are theory-only in the browser, what an ADR checkpoint is, where the track starts.
- Resources: docs.python.org tutorial, Language Reference data model, peps.python.org/pep-0008.

## 02-names-and-references — Names Are Labels, Not Boxes (P, beginner)

- Concept: assignment binds a name to an object; it never copies. Passing an argument binds a new name to the same object. `+=` on a list mutates in place, `x = x + [..]` rebinds.
- Common mistake: expecting `b = a` to copy a list, so appending through `b` also changes `a`; the same aliasing hides in `+=` on lists, in default values and function arguments, and in `a = b = []`.
- Challenge: **repair the aliasing bugs in a small cart module** (`main.py`).
  - `add_item(cart, item)`: must add `item` to the caller's list and return that same list. Starter rebinds locally (`cart = cart + [item]`).
  - `snapshot(cart)`: returns a new list with the same items; later changes to the cart must not appear in the snapshot. Starter returns `cart`.
  - `merge_carts(first, second)`: returns a new list with the items of both; neither input is modified and the result is not either input. Starter uses `first += second`.
  - `empty_carts(count)`: returns `count` independent empty lists. Starter returns `[[]] * count`.
- `challenge.md`: names the four functions, their return value and mutation rules, and the sentence "state in your own words which operation rebinds and which mutates" is *not* graded.
- Tests (5):
  1. `add_item` mutates the list passed in (`caller_list` contains the item afterwards).
  2. `add_item` returns the same object (`result is cart`).
  3. `snapshot` is a different object and stays unchanged after the cart grows (the `# beginner mistake:` test: returning the cart itself).
  4. `merge_carts` does not mutate inputs and returns a third object.
  5. `empty_carts(3)` returns three lists where appending to the first leaves the others empty.
- Hints: (1) "Which operation changes the object a name points to, and which changes the name?" `list.append`/`extend` mutate; `+` builds a new list. (2) `list(cart)` and `cart.copy()` both build a new list; `[[] for _ in range(count)]` runs the expression once per element.
- Approach steps: identify each function's required identity contract (same object / new object), choose mutation or construction accordingly, check inputs after the call.
- Demo (`demo.py`): builds two carts, shows that `snapshot` keeps old state, prints sizes with `id` comparisons expressed as `is` booleans (never raw ids).
- Quiz (4): `b = a; b += [2]` after aliasing, `b = b + [2]` after aliasing, `[[0] * 2] * 2` with one item changed, `items = sorted(items)` inside a function (the caller's list is unchanged).
- Facts to verify: none volatile; cite the data model reference.

## 03-mutability-and-hashing — Mutable, Immutable and Hashable (P, beginner)

- Concept: mutable and immutable types; why only hashable (effectively immutable) objects can be dict keys or set members; `tuple` is immutable but may hold mutable items, so it may be unhashable.
- Common mistake: using a list, or a tuple that holds a list, as a dict key or set member, which raises `TypeError: unhashable type: 'list'`; convert it to a `tuple` or `frozenset` first, recursively.
- Challenge: **`freeze` and `cache_key`** (`main.py`).
  - `freeze(value)`: returns a hashable, immutable equivalent: `list`/`tuple` → `tuple` (recursively), `set` → `frozenset`, `dict` → `frozenset` of `(key, frozen_value)` pairs, scalars (`int`, `float`, `str`, `bytes`, `bool`, `None`) unchanged. Any other type raises `TypeError` whose message contains the type name. The input is never modified.
  - `cache_key(args, kwargs)`: returns `(freeze(args), freeze(kwargs))`, a hashable key that is equal for equal arguments whatever the keyword order.
- Tests (6): freeze is hashable for nested lists and dicts (the `# beginner mistake:` test: freezing only the outer container); equal nested data freezes equal whatever the key order; the input is unchanged; a set becomes a `frozenset`; unsupported type raises `TypeError` naming the type; `cache_key` finds equal calls in a dict, misses different ones, and is hashable and equal for nested keyword values (a list and a dict) in either keyword order.
- Hints: (1) recursion: freeze children first, then wrap. (2) dict order is insertion order but `frozenset` ignores order, which is what makes `{"a":1,"b":2}` equal `{"b":2,"a":1}`.
- Demo: freezes a config, uses it as a cache key, prints cache hits.
- Quiz (5): hashability of `tuple` with a list inside, why `list` and `dict` are unhashable, `frozenset` equality ignores order, fixing `lookup[[1, 2]]` with a `tuple` key, building one string from many lines (use `str.join`).
- Facts: none volatile; PEP 8 not needed.

## 04-scope-and-nonlocal — Scope: LEGB, global and nonlocal (P, intermediate)

- Concept: names resolve Local → Enclosing → Global → Built-in at *compile time per function*; assignment inside a function makes the name local for the whole function (`UnboundLocalError`); `nonlocal` and `global` rebind outer names.
- Common mistake: assigning to an outer name inside a nested function without `nonlocal`, which makes the name local for the whole function and raises `UnboundLocalError` at the first read. `if` and `for` blocks do not create scopes, and closures capture variables, not values.
- Challenge: **stateful closures without classes or globals** (`main.py`).
  - `make_counter(start=0, step=1)`: returns `(next_value, reset)`. Each call to `next_value()` returns the current value, then advances by `step`. `reset()` returns the counter to `start`. Two counters are independent.
  - `make_history(limit)`: returns `(record, entries)` where `record(value)` appends to a bounded history and `entries()` returns a tuple of the last `limit` values (oldest first), sharing state through the enclosing scope.
  - The solution must not use `global`; the source check forbids the word `global` and requires `nonlocal` in `make_counter`.
- Tests (6): counter sequence for start/step; defaults `start=0`, `step=1`; two counters independent; `reset` restores `start` (the `# beginner mistake:` test: assigning in `reset` without `nonlocal`); history respects the limit and returns a tuple; source uses `nonlocal` and not `global` (checked with `ast`).
- Hints: (1) assignment inside the inner function creates a *local* name; read-only access works without `nonlocal`. (2) for the history, mutating a list in the enclosing scope needs no `nonlocal`, rebinding does.
- Demo: two counters side by side, a history recording events.
- Quiz (5): predict the `UnboundLocalError` snippet, comprehension variable not visible at module level, `if` blocks do not create a scope, which declaration rebinds an enclosing variable (`nonlocal`), class-body scope not visible to methods.
- Facts: scope rules unchanged since Python 3.0; PEP 709 inlined comprehensions in 3.12 (behavior preserved): verify wording in the reference before citing.

## 05-shallow-vs-deep-copy — Shallow and Deep Copies (P, intermediate)

- Concept: `list.copy()`, `dict.copy()`, slicing, `copy.copy`, `dict(d)` and `{**d}` are shallow; `copy.deepcopy` copies recursively and preserves cycles via a memo; `__copy__`/`__deepcopy__` customize it.
- Common mistake: `copy.copy`, `dict.copy()` or `{**config}` on a nested config, so both copies share the inner lists and dicts; use `copy.deepcopy`, which also preserves cycles through its memo.
- Challenge: **configuration cloning** (`main.py`).
  - `clone_config(config, **overrides)`: returns a deep copy of `config` with top-level `overrides` applied; the original and its nested dicts/lists are never shared with the result. Cyclic structures (a dict that contains itself) are cloned preserving the cycle.
  - `with_defaults(config, defaults)`: returns a new dict where missing keys are filled from `defaults` *without* aliasing mutable defaults (appending to a list in the result must not change `defaults`).
  - `diff_shared(first, second)`: returns the sorted list of top-level keys whose values are the *same object* (`is`) in both dicts (diagnostic helper for shallow copies).
- Tests (6): nested dict and list isolation after mutating the clone (the `# beginner mistake:` test: a shallow copy); overrides applied; cyclic input cloned with `clone["self"] is clone`; `with_defaults` does not alias defaults; `diff_shared` of a shallow copy lists nested keys; `diff_shared` of a deep copy is empty.
- Hints: (1) `copy.deepcopy` already handles cycles; do not write recursion yourself. (2) For `with_defaults`, deep-copy the *default* before inserting it.
- Demo: shallow vs deep copy of a settings dict, prints which keys are shared.
- Quiz (4): effect of `a.copy()` on a nested list, `copy.deepcopy` with a cycle, which pair builds equivalent shallow copies (`list(a)` and `a[:]`), why `{**defaults, **config}` shares a mutable default.
- Facts: none.

## 06-identity-equality-and-interning — `is` vs `==` (P, intermediate)

- Concept: `==` calls `__eq__`; `is` compares object identity; `is` is for singletons (`None`, `True`, `False`, sentinels). CPython caches small ints and interns some strings, an implementation detail that must never be relied on. Defining `__eq__` without `__hash__` makes a class unhashable; equal objects must hash equal.
- Common mistake: `is` to compare values (`count is 1000`, `role is "admin"`), which may work for cached small ints and interned strings and fails elsewhere; use `==` for values and `is` only for `None`, `True`, `False` and sentinels.
- Challenge: **a value object and a sentinel lookup** (`main.py`).
  - `MISSING = object()` module-level sentinel and `lookup(mapping, key, default=MISSING)`: returns the value; if the key is absent and `default is MISSING` raises `KeyError(key)`; otherwise returns `default` (so `default=None` is a legitimate return value).
  - `class Money` with `amount: int` (cents) and `currency: str`: equality and hashing based on both fields, `Money(100, "EUR") == Money(100, "EUR")`, hashes equal, usable in sets; comparison with a non-`Money` returns `NotImplemented` (so `Money(1, "EUR") == 1` is `False` without raising).
  - `same_amount(first, second)`: returns `True` when the two `Money` have equal `amount` regardless of currency; it must use `==` on amounts. A source check (with `ast`) forbids `==`/`!=` with `None` and `is` comparisons with literals.
- Tests (6): `lookup` returns a present value, even a falsy one; a missing key with no default raises `KeyError`, while `default=None` and a stored `None` both return `None`; equal `Money` objects compare and hash equal, are distinct objects and collapse in a set; `Money(1, "EUR") == 1` is `False` and `!=` is `True`; `same_amount` on large amounts built at run time (`int("250000")`), the `# beginner mistake:` test, so an `is` comparison fails; source check (with `ast`) for `== None` and `is` with literals.
- Hints: (1) a fresh `object()` is a unique sentinel that no caller can pass by accident. (2) `@dataclass(frozen=True)` is allowed but writing `__eq__` and `__hash__` by hand is the point of the lesson; either passes the tests.
- Demo: sentinel vs `None`, interning demo printing `a == b` and noting in text that `is` results for ints are implementation-defined (the demo never prints an `is` on ints or strings).
- Quiz (5): `x is None` as the absence check, why `[] is []` is `False`, `count is 1000` and why to use `==`, `__eq__` without `__hash__`, `float('nan') == float('nan')`.
- Facts: CPython 3.14 emits `SyntaxWarning` for `is` with a literal: verify in the 3.14 docs before stating it as dated fact; the small-int cache range (-5 to 256) is an implementation detail, say so.

## 07-truthiness-and-bool — Truthiness and `__bool__` (P, beginner)

- Concept: every object is truthy unless `__bool__` returns `False` or `__len__` returns 0; empty containers, `0`, `0.0`, `""`, `None` are falsy. `if not items` is idiomatic emptiness; `if x is None` is the check for absence. `and`/`or` return operands, not booleans.
- Common mistake: `value or default` to fill a missing value, which also replaces `0`, `""`, `[]` and `False`; test `value is None` when only `None` means missing.
- Challenge: **truthiness protocol and safe fallbacks** (`main.py`).
  - `class Basket`: wraps a list; defines `__len__` only; `bool(Basket())` is `False` when empty and `True` otherwise.
  - `class Quota(limit, used)`: defines `__bool__` as "has remaining capacity" (`used < limit`); `len` is not defined (`len(Quota(1, 0))` raises `TypeError`).
  - `coalesce(*values)`: returns the first value that is not `None` (keeps `0`, `""`, `[]`, `False`); returns `None` when all are `None` or no values are given.
  - `first_truthy(*values, default=None)`: returns the first truthy value or `default`.
- Tests (5): `Basket` falsy/truthy; `Quota` bool by remaining capacity; `len(Quota(...))` raises `TypeError`; `coalesce` keeps `0`, `""` and `[]` and returns `None` for all-`None` or no values (the `# beginner mistake:` test: testing truthiness instead of `is not None`); `first_truthy(0, "", [], "x") == "x"` and the default path.
- Hints: (1) `__bool__` wins over `__len__` when both exist. (2) `coalesce` needs `is None`, not truthiness.
- Demo: counts how many settings use falsy-but-valid values like `0` and `""`.
- Quiz (4): `[] or "default"`, `0 or None`, which expression replaces only `None` with `0` (`0 if value is None else value`), truthiness of a custom class with no `__bool__` or `__len__`.
- Facts: none volatile.

## 08-object-model-adr — Checkpoint: Shared Value Objects ADR (A, intermediate)

- Entry `adr.py`; tags `["established", "core", "practice"]`; no demo. Implemented in `src/content/python/01-object-model/08-object-model-adr/`.
- **Briefing**: six services in one process share `PriceRule` objects; a surcharge appended to one rule's `fees` list was charged by all of them. 40 000 rules in memory, changed twice a day, about 2 000 reads per request, 5 ms latency budget, about 60 microseconds per deep copy, rules are cache keys and compared by content, `discount=0` means no discount, `None` means inherit, update calls need "not provided".
- Exports `ADR` (record rules from the standards doc, plus: `context` mentions `surcharge` and `shared`/`alias`; `decision` starts with `We will` and names the chosen mutability) and `PLAN`:
  - `value_object`: `{ "mutability": "immutable" | "mutable", "hashable": bool, "equality": "by_value" | "by_identity", "inner_collections": "tuple" | "frozenset" | "list" | "set" }`.
  - `sharing`: `"share_reference"` | `"copy_on_read"` | `"copy_on_write"`; `copy_strategy`: `"none"` | `"shallow"` | `"deep"`.
  - `absence`: `{ "marker": "none" | "sentinel", "checks_use": "is" | "truthiness" }`.
  - `rejected`: at least two `{ "pattern", "reason" }` with distinct patterns.
- Coherence rules tested: (1) cache keys: `hashable` true and `equality` `by_value`; (2) hashable implies `immutable` and `inner_collections` of `tuple` or `frozenset`; (3) `sharing` is not `copy_on_read`, and `share_reference` goes with `copy_strategy` `none`; (4) `copy_on_write` uses `shallow` or `deep`; (5) absence uses a `sentinel` checked with `is`; (6) the decision names the chosen mutability.
- Tests (6): record structure, alternatives and consequences, plan enums, cache-key rules, copy rules, absence/rejected/decision.

---

## Module-level files

`module.json` as above. `CURRICULUM.md` entry:

```
### 01-object-model — Names, Objects and Scope
01-python-map **(quiz)** ✓ · 02-names-and-references ✓ · 03-mutability-and-hashing ✓ · 04-scope-and-nonlocal ✓ · 05-shallow-vs-deep-copy ✓ · 06-identity-equality-and-interning ✓ · 07-truthiness-and-bool ✓ · 08-object-model-adr ✓
```

## Pilot exit criteria

- `npx vitest run src/verify/python.test.ts` passes (solutions pass, starters fail); one lesson at a time with `LESSON=python/names-and-references`.
- `npx vitest run src/verify/content.test.ts` and `curriculum.test.ts` pass.
- In the browser: each lesson opens, Pyodide loads once, starter shows failing test names, solution passes, Run prints demo output, quiz works, progress persists.
- Findings that change the standards go back into [02-content-standards.md](02-content-standards.md) before module 2 starts.
