# Module 00 — Foundations: Python from Zero (optional)

Folder: `src/content/python/00-foundations/`. A beginner module for learners who have never programmed. Standards: [02-content-standards.md](02-content-standards.md); the module-zero exceptions are listed below.

`module.json`:

```json
{ "title": "Foundations: Python from Zero", "description": "For people who have never programmed: values and expressions, decisions and loops, functions, text and lists, tuples, dicts and sets, errors and exceptions, classes and objects. If you can solve the challenge of its last lesson, start at module 01.", "optional": true }
```

**Question this module answers:** how do you write, run and test your first Python programs when you have never programmed before?

**Path:** what a program is → values → decisions and loops → functions → functions as values → strings and lists → tuples, dicts and sets → errors → classes (the skip test).

**Skip rule:** a text rule, stated in `01-foundations-map`, in `01-object-model/01-python-map` and in the challenge of `09-classes-and-objects`: a learner who solves the lesson 09 challenge without the hints starts at module 01. The map quiz keeps 4 questions (map rule), so the skip test is the lesson 09 challenge, not a quiz.

**Progress:** `"optional": true`. The module counts toward `done`/`total` only once a lesson between the map and lesson 09 is complete, or all nine are ([02-content-standards.md](02-content-standards.md) "Lesson file contract"); completing the map or the skip test alone does not start it.

## Module-zero exceptions to the standards

- **Small exercises allowed.** The anti-LeetCode rule targets puzzles in modules 01–13. Module 00 teaches the language itself, so a challenge may be a short exercise of the construct the lesson teaches (`fizzbuzz` for `%` and `if`/`elif`, `first_index` for a loop with an early `return`), never an algorithm puzzle.
- **Annotations.** Lessons 02–04 and 06–09 stay unannotated. Lesson 05 annotates its starter and solution (`from collections.abc import Callable`) because it teaches reading type hints.
- **Only what earlier lessons taught.** Solutions use nothing a later lesson introduces (no `is None` before module 01, no comprehension before lesson 06). Lessons 02 and 03 ship `def` shells and say that lesson 04 explains them.
- **No `input()`.** Every challenge uses `@test` with plain `assert`, `mod`, `capture_output()` and `capture_error()`.

Every practice lesson has theory (300–1,000 words, `## How it works`, `## Common mistakes`, `## When to choose it` last), `concepts.json`, a quiz of 4–5 questions, `challenge.md`, 2–4 hints, a numbered `approach.md`, 3–6 tests with exactly one `# beginner mistake:` marker, `starter/` and `solution/` with `main.py` and `demo.py`, and `meta.json` with `"entry": "main.py"` and `"run": "demo.py"`. Level `beginner`, tags `["established", "core", "practice"]`.

---

## 01-foundations-map — Map: Python from Zero (Q, beginner)

- Theory (200–500 words): what a program is, comments, the editor, `main.py` (graded) versus `demo.py` (Run), `return` versus `print`, reading the last line of a traceback, the path table, the skip rule.
- Quiz (4): what Run executes, why a printing function fails its test, where to start reading a traceback, the skip rule.

## 02-values-and-expressions — Values and Expressions (P)

- Teaches: `int`, `float`, `str`, `bool`, `None`; assignment; `+ - * / // % **`; comparisons and chained comparisons; `and`/`or`/`not`; `type()`, `isinstance()`; conversions; f-strings `{x}`, `{x:.2f}`, `{x!r}`; `+=`.
- Challenge **Receipt**: `line_total(price_cents, quantity)`, `split_evenly(total_cents, people)` returns `(share, remainder)`, `format_cents(1250) == "12.50 EUR"`, `kind_of(value)` returns `type(value).__name__` (no `if` needed, no bool case), `print_receipt(item, price_cents, quantity)` checked with `capture_output()`.
- Beginner mistake: `/` instead of `//` in `split_evenly`, so the share is a float.

## 03-decisions-and-loops — Decisions and Loops (P)

- Teaches: `if`/`elif`/`else`, the conditional expression, `while`, `for` over lists, strings and `range`, `enumerate`, `zip`, `break`/`continue`, accumulating, `in`; a first look at lists.
- Challenge **Shipping desk**: `shipping_cost(total_cents)` (4 tiers, boundaries exact), `fizzbuzz(n)`, `first_index(items, target)` (`None` when absent, no `.index(`), `running_max(numbers)`, `pair_up(names, scores)` with `zip`.
- Beginner mistake: checking the widest tier first, so small orders get the top price.

## 04-functions-basics — Functions: Parameters and Return (P)

- Teaches: `def`, parameters, `return` and the implicit `None`, defaults, keyword arguments, returning a tuple and unpacking it, local variables, docstrings, built-ins `min`/`max`/`sum`/`len`.
- Challenge **Toolbox I**: `apply_discount(price_cents, percent=10)` called by keyword, `stats(numbers)` returns `(min, mean, max)` and three `None`s for an empty list, `bounds(numbers)` returns the text `"2 to 9"` built by unpacking `stats`.
- Beginner mistake: `stats` prints its values instead of returning them.

## 05-functions-as-values — Functions as Values (P)

- Teaches: passing and returning functions, `lambda`, `sorted(key=…)`, `*args` and keyword-only parameters (full rules in `03-functions/03-args-and-kwargs` and `04-positional-and-keyword-only`), recursion, `import`/`from … import`, reading type hints.
- Challenge **Toolbox II**: `sort_by_length(words)` (stable ties, input unchanged), `make_multiplier(factor)`, `total(*amounts, currency="EUR")`, recursive `depth(value)`.
- Beginner mistake: `key=len()` instead of `key=len`.

## 06-strings-and-lists — Strings and Lists (P)

- Teaches: string methods that return new strings, indexes, negative indexes, slicing (`[a:b]`, `[::-1]`, `[:]`), list methods (`append`, `extend`, `pop`, `remove`), `sort()` versus `sorted()`, truthiness of an empty string, a list comprehension as a short loop.
- Challenge **Text and lists**: `initials("ada lovelace") == "A.L."`, `last_items(items, n)` (`n == 0` returns `[]`, the `items[-0:]` trap), `clean_words(text)`, `highest(scores, n)`.
- Beginner mistake: `scores.sort()` inside `highest`, which reorders the caller's list.

## 07-tuples-dicts-and-sets — Tuples, Dicts and Sets (P)

- Teaches: tuples; dicts (`d[key]` and its `KeyError`, `get`, `in`, `items()`, `update`, `del`); sets (`{}` is a dict); sorting by several keys; preview: some iterables can be looped only once (module 05, Iterators and Generators).
- Challenge **Word tools**: `word_counts(text)`, `top_words(counts, n)` (count high to low, then word), `unique_tags(tags)` (stripped, lower-cased, sorted), `invert(phonebook)`; inputs unchanged.
- Beginner mistake: `counts[word] += 1` for a word not yet in the dict.

## 08-errors-and-exceptions — Errors and Exceptions (P)

- Teaches: tracebacks; `ValueError`, `TypeError`, `KeyError`, `IndexError`, `ZeroDivisionError`, `AttributeError`; `raise`; `try`/`except` (several clauses, a tuple, `as`), `else`, `finally`; a bare `raise`; why a catch-all hides bugs.
- Challenge **Order intake**: `parse_quantity(text)` (a `ValueError` whose message contains the text), `safe_ratio(part, whole)`, `read_port(settings)` (default 8080), `parse_all(texts)` returns `(values, errors)`, `run_with_log(action, log)` with `finally`.
- Beginner mistake: `except Exception` in `safe_ratio`, which turns a `TypeError` into `None`.

## 09-classes-and-objects — Classes and Objects (P, the skip test)

- Teaches: `class`, instances, `__init__`/`self`, attributes and methods, separate state per instance, class versus instance attributes, `__repr__` with `!r`, inheritance, `super().__init__`, overriding, `isinstance`, custom exceptions; preview of `__len__`/`__eq__` (module 04, Classes, Attributes and Descriptors).
- Challenge **Bank account** (amounts in integer cents): `InsufficientFunds(ValueError)`, `BankAccount(owner, balance=0)` with `deposit`, `withdraw` and `__repr__`, `SavingsAccount(owner, balance=0, rate_percent=2)` calling `super().__init__` with `add_interest()`, `total_balance(accounts)`.
- Beginner mistake: `history = []` in the class body, so every account shares one list.
- `challenge.md` states the skip rule.
