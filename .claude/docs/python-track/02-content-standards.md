# Content Standards — Python Track

Applies to every lesson under `src/content/python/`. It restates [CONTENT_GUIDE.md](../CONTENT_GUIDE.md) for a single-language Python track and adds the rules that are specific to it.

## No bridges

The track is written for a learner with no prior programming language. No lesson file (theory, quiz, concepts, `meta.json`, `challenge.md`, hints, approach, `tests.py`, starter or solution), and neither `track.json` nor a `module.json` title or description, explains Python by comparison with another language: no `## Coming from` section, no `ts` fences, and none of the names `pythonConventions.test.ts` rejects. The full list is the `BRIDGE` constant; among others: other languages (`JavaScript`, `TypeScript`, `JS`, `TS`, `PHP` and every word starting with it, `Magento`, Rust, Java, `Golang`, Ruby, Kotlin, Swift, C++, C#), their runtimes and tools (`Node.js`, `Node developer`, `Node's` before one of its APIs (`Node's path`, `Node's fs`, `Node's event loop`), `Node scripts`, V8, Deno, Bun, `npm`, `npx`, `pnpm`, `yarn`, `package.json`, `node_modules`, `tsc`, ESLint, Prettier, Biome, Zod, lodash, Axios, Express (`Express.js`, Express middleware, app or server; the English verb passes), Vitest, Jest, TC39, ECMAScript, `ES2022` and the other ES years), their syntax and APIs (`===` and `!==` between operands or alone in backticks, `??` outside a string literal, `Object.groupBy`, `Object.seal`, `Object.freeze`, `structuredClone`, `Symbol.dispose`, `new Proxy`, `console.log`, `JSON.parse`, `JSON.stringify`, `instanceof`, `typeof`, `AggregateError`, `process.argv`, `process.exit`, `Object.assign` and its siblings, `Array.from`, `Array.isArray`, `array.includes`, `.shift()`, `.prototype.`, "Array methods", ES modules, `exports` and `require` in backticks, spread (`{ ...defaults }`, `...rest: T`), `Record<`, `using x = new`, `x == null`, `catch (error)`, "options object", "object destructuring", and `var`, `let`, `const`, `undefined`, `Array`, `Map`, `this`, `function*`, `some`, `switch` or `catch` in backticks), and the word `promise`, which names a JavaScript type: write "guarantee" or "commit to" for the English verb. A banner such as `=== Report ===` or a string such as `"??"` is not a match, and neither are Python names that look alike: a `Node` class, `str.find`, `ExitStack.push()` or a `push` method of your own, `match`/`case` and `except`. Resources never point at another language's documentation (MDN, nodejs.org, zod.dev, typescriptlang.org, vitest.dev, axios-http.com, expressjs.com, and the `github.com/tc39` proposals: `BLOCKED_HOSTS` and `BLOCKED_PATHS`). There are no exceptions for factual tool or interop mentions: say "a browser client" rather than naming its language, and "a compiled extension" rather than the language a library is written in. The one language a lesson may name is C, because CPython and its extension modules are written in it: "C extension" and "the C API" are Python terms. The mistake a comparison used to carry stays, in Python terms, in `## Common mistakes`.

## Lesson folder

```
src/content/python/<NN-module>/<NN-lesson-id>/
├── meta.json        written last
├── theory.md
├── concepts.json    recommended
├── challenge.md     practice lessons
├── starter/main.py  and starter/demo.py when the lesson has a Run demo
├── solution/main.py and solution/demo.py
├── tests.py
├── hints.md         2–4 hints separated by a line containing only ---
├── approach.md      numbered reasoning steps, never the full solution
└── quiz.json        4–6 questions (optional in practice lessons, the body of quiz lessons)
```

- Challenges always use `starter/` and `solution/` folders (a demo or extra modules sit next to `main.py`). The loader infers the entry file only for single-file starters, so **every practice lesson sets `"entry": "main.py"` in `meta.json`** (`"adr.py"` for ADR checkpoints); without it the module name resolves to `main.undefined`. Learner modules import each other by module name (`from orders import load_orders`).
- `meta.json`: `{ "title", "summary", "level", "tags", "entry", "run"?, "resources"? }`. `entry` is required for challenges (`main.py`, or `adr.py`). `run: "demo.py"` is required when the lesson ships a demo.
- `module.json`: `{ "title", "description", "optional"? }`. Only module zero (`00-foundations`) sets `"optional": true`: its lessons count toward track progress only once completed, so a learner who skips it still reaches 100% ([CONTENT_GUIDE.md](../CONTENT_GUIDE.md) "Files"). `npm run python:new` writes the flag when it creates a `00-` module. Folder names carry numeric prefixes (`01-object-model`, `02-names-and-references`); ids are the names without the prefix and are unique inside the track.
- Tags: maturity first (`established`, `emerging`, `hype-watch`), then `core`, then `theory` (quiz lessons) or `practice` (challenges). Add `legacy` or `new` when relevant.
- `level`: `beginner`, `intermediate`, `advanced`, `expert`.
- `resources`: canonical URLs that return 200 to `curl` (docs.python.org, peps.python.org, packaging.python.org). Open bot-blocking domains in a browser before citing them.

## Module shape

1. `01-<module>-map` **(quiz)**: what the module answers, prerequisites, path, the decision it ends with. Theory 200–500 words plus a 4-question quiz. Module 1 opens with `01-python-map` for the whole track.
2. Practice lessons (3–9) and optional quiz-only lessons for theory topics.
3. The closing lesson, one of:
   - `NN-<module>-adr` checkpoint, **only in modules 01, 02, 04, 06, 09 and 10**: briefing, exported `ADR` and `PLAN`, tests for structure and coherence with the briefing.
   - A code integration challenge (practice lesson combining the module's mechanisms) in modules 03 and 05.
   - Nothing special elsewhere: the module ends with its last practice lesson, and the map's `## When to choose it` names the decision.
4. The capstone (`12-tooling/05-capstone-async-rules-engine`) is a code challenge with a short `adr.py` ([08-module-13-and-capstone.md](08-module-13-and-capstone.md)).

## Theory template

Word limits: practice lessons and the capstone 300–1,000, maps 200–500, quiz-only theory lessons and ADRs 250–1,000. Practice lessons and the capstone follow this order:

1. `# <title>` and **the model**: what Python does, with a runnable example.
2. `## How it works`: the mechanism (data model hook, protocol, bytecode behavior), pitfalls.
3. `## Common mistakes`: 40–250 words. The mistake a newcomer makes most often with this mechanism, named in **bold**, what happens at runtime, and the wrong code next to the fix in a `py` fence. The test marked `# beginner mistake:` catches exactly that mistake.
4. Optional sections, such as **legacy vs modern** when an API evolved (`typing.List` → `list[str]`, `asyncio.gather` → `TaskGroup`).
5. **`## When to choose it`**: when to use, when to avoid, and the alternative. Always last.

Maps have no `## Coming from` section either: they state the prerequisites inside the track.

One blockquote starting `**Status as of <Month YYYY>:**` holds volatile facts (versions, PEP status, free-threading, JIT). Today is November 2026: date the facts at writing time and verify each against docs.python.org or the PEP, never from memory.

Code fences: `py`, `text`, `bash`, `toml` and `json`.

## Challenge rules

- **Anti-LeetCode**: no sorting, searching, graph or math puzzles. A challenge builds or repairs a *language-level mechanism*: a descriptor, a context manager, a protocol class, a decorator, a task group worker, a registry via `__init_subclass__`, a value object with correct equality and hashing.
- `challenge.md` names every function, class, parameter and exception the tests rely on. The tests are the contract.
- Starter compiles, fails at least one test, and marks every place to write code with `# TODO: ...` comments.
- 3–6 tests per challenge, each a sentence. Tests assert behavior: return values, state, raised exception types and messages' *key words*, identity where identity is the lesson. Never assert printed text exactly, bytecode, `id()` values, or `is` on ints and strings that the compiler may fold.
- **Beginner-mistake test**: at least one test fails the most common wrong implementation a newcomer writes for this mechanism (aliasing instead of copying, `==` for identity, a `dict` subclass for a mapping, a mutable default). That mistake is named in bold in `## Common mistakes`, and exactly one test carries `# beginner mistake: <the mistake>` on the line right above its `@test`. The test name states the correct behavior, not the mistake. The reviewer writes the wrong version once and confirms that this test fails on it and that the solution passes. Practice lessons and the capstone need it; ADRs do not.

  ```py
  # beginner mistake: copy.copy for a nested config, so both copies share the inner lists
  @test("a deep copy leaves the original's nested lists untouched")
  def _():
      ...
  ```
- The starter imports cleanly and fails by assertion, not by `NameError`/`ImportError`/`SyntaxError`; every `# TODO` maps to at least one failing test.
- Starters and solutions follow PEP 8 and keep docstrings short. **Type annotations**: modules 01–02 stay unannotated (the lessons are about runtime objects). From module 03 on, solutions may annotate public functions and classes the way modern Python is written, and starters keep the same signatures. Annotations never replace a runtime check the tests rely on, and no test depends on annotations except in module 09. Use builtin generics and `X | None`, never `typing.List`/`Optional`.
- Demos (`demo.py`) import the learner's functions, run a realistic scenario and print results. They are outside the entry's import graph, never run during tests, and must print at least one line and exit 0. Not every lesson needs a demo; lessons about output-less mechanisms may omit `run`.

## Test conventions (repo harness)

`tests.py` is plain Python. The harness provides, without imports: `test`, `mod` (the entry module), `modules["other.py"]`, `source` (entry text), `sources["file.py"]`, `capture_error`, `capture_output`, `approx`, plus `fake_model`, `respond`, `for_each_seed` (unused here).

```py
@test("make_counter returns independent counters")
def _():
    first, second = mod.make_counter(), mod.make_counter()
    first()
    assert first() == 1
    assert second() == 0
```

- `@test("name")` names must be unique string literals at module top level; the lesson UI lists them before the run.
- Each test runs against a fresh import of the learner project. 4 second timeout per test, async tests allowed (`async def _()`).
- Failed `assert` statements print the statement plus `left:`/`right:` values when the expression is a simple comparison of names, attributes, subscripts and a small set of safe builtins (`len`, `sorted`, `list`, `tuple`, `set`, `dict`, `str`, `int`, `float`, `round`, `abs`, `min`, `max`, `sum`, `any`, `all`, `type`, `repr`, `bool`). Write assertions in that shape: compute into a local variable first, then compare. Avoid `await`, lambdas, walrus and comprehensions *inside* an `assert` expression.
- Expected exceptions: `error = await capture_error(lambda: mod.parse("x"))` returns the exception or fails the test when nothing was raised. Check `type(error).__name__` or `isinstance`, then the message with `in`.
- Source checks (`source`, `sources["file.py"]`) only to require or forbid a specific construct, and **always with `ast`, never with regex over the raw text**: a regex matches comments, docstrings and strings, so `re.search(r"\bglobal\b", source)` fails a correct solution that says "global" in a comment. Parse once and walk the nodes:

  ```py
  import ast

  def uses(node_type):
      return any(isinstance(node, node_type) for node in ast.walk(ast.parse(source)))

  @test("counters keep state with nonlocal, not global")
  def _():
      assert uses(ast.Nonlocal)
      assert not uses(ast.Global)
  ```

  Look for names with `ast.Name`/`ast.Attribute`/`ast.ImportFrom` nodes (for example "no `typing.List`"), and calls with `ast.Call`. The harness passes the raw entry text.
- Async tests: no real sleep above **50 ms** anywhere (prefer `await asyncio.sleep(0)` ticks and `asyncio.Event` gates), and learner code never calls `asyncio.run()`/`run_until_complete()` ([07-modules-09-to-12.md](07-modules-09-to-12.md) "10-async" constraints).
- Output capture: `lines = capture_output()` collects printed lines until the test ends.
- Tests may define helpers and import the standard library at the top of `tests.py`.

## Pyodide limits (what a challenge may not depend on)

| Not available or unreliable | Alternative |
| --- | --- |
| Real threads, `multiprocessing`, `subprocess`, `concurrent.futures` pools | Inject an executor/callable; teach the real thing in theory and quizzes |
| `socket`, real network, `urllib`/`http.client` to the outside | Pure functions over strings and in-memory objects; the fake `/api` is a JS facility and not exposed to Python |
| Real `venv`, `pip`, `uv`, `sys.prefix` of a project | Pure functions taking prefixes as parameters; quiz for tooling |
| `zoneinfo` timezone data (not bundled) | `datetime.timezone` fixed offsets |
| `time.sleep` for real delays | `asyncio.sleep` with ≤ 50 ms, `asyncio.Event` gates, or injected clocks |
| C extensions outside Pyodide's package list | Standard library only (until the Pydantic spike) |
| Free-threaded build, JIT toggles | Theory and quiz with dated facts |

Verify in Pyodide before writing any lesson whose challenge touches `asyncio`, `inspect`, `dis`, `sys._getframe`, `tracemalloc`, `gc`, `weakref` or `pathlib` I/O. If unsure, write a throwaway test through `pythonGrader()` first.

## Quiz rules

`quiz.json`: `[{ "question", "options": [...], "answer": <index>, "explanation" }]`, 4–6 questions, Markdown allowed. Questions test decisions and predictions ("what does this print and why"), never trivia of PEP numbers. Vary the answer index. The explanation names the mechanism.

## ADR checkpoint format

The last lesson of every module except 12 (which ends with the capstone). `entry` is `adr.py`; starter and solution are `adr.py` with the same shape:

- `ADR`: module-level dict `{ "id", "title", "status", "context", "decision", "alternatives", "consequences" }` with the same validation rules as the AI Engineering ADRs (`status: "accepted"`, `decision` starts with `We will`, at least two alternatives with distinct options and reasons, `consequences` with `positive` and `negative`).
- `PLAN`: module-level dict (named `PLAN` in every module; the plan fields are listed per module) whose values must be coherent with the briefing's numbers and constraints.
- **Computed field rule**: every `PLAN` has at least one numeric field (`int`, or a number with a stated tolerance) that the learner derives from the briefing's numbers: a capacity, a limit, a size, a count. The per-module spec gives the formula and the expected value or accepted range. The tests check the number, so trying enum combinations until the suite goes green is never the cheapest path.
- **Briefing coherence**: the reviewer redoes the briefing arithmetic before approval. Numbers that cannot be true at once (throughput beyond what the chosen design can serve, quotas below the required call rate) block the lesson.
- **Neutral test names**: names state what is checked, never the expected answer. Good: "the sharing choice fits the read volume and latency budget". Bad: "copy-on-read is ruled out". The failure output (`left:`/`right:`) may show the values; the name in the test list must not.
- Constants are upper case (`ADR`, `PLAN`) because they are data, and tests read them through `mod`. The starter holds `# TODO` placeholders that violate the coherence rules.
- `challenge.md` holds the briefing with concrete numbers; tests check structure and coherence, never wording.
- Level `intermediate` or `advanced`; tags `["established", "core", "practice"]`; `resources` lists Nygard's ADR post, MADR, and the module's primary sources.

## Verification checklist per lesson

- [ ] Solution passes every test; starter fails at least one (`npm run verify` enforces), by assertion and not by import error.
- [ ] The `# beginner mistake:` test fails on the wrong version named in `## Common mistakes`; source checks use `ast`.
- [ ] ADR only: a computed numeric field, coherent briefing arithmetic, neutral test names.
- [ ] At least 2 hints separated by `---`; non-trivial `approach.md`; theory over 200 characters.
- [ ] Theory has `## How it works` before `## Common mistakes`, ends with `## When to choose it` and compares with no other language.
- [ ] Volatile facts dated and verified.
- [ ] `✓` added to `CURRICULUM.md`; `meta.json` written last.
- [ ] `pythonConventions.test.ts` passes. A lesson written before these rules is listed in `src/verify/pythonPendingRewrite.ts` with the rules it still breaks; its rewrite removes the entry (a stale entry fails the suite). Track and module texts that still compare with another language sit in its `PYTHON_PENDING_HEADERS`.
- [ ] Checked in the browser (Pyodide) at least once per module: starter fails, solution passes, Run demo prints.
