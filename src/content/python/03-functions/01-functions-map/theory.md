**Question this module answers:** how do arguments bind, what does a closure capture, and where should cross-cutting behavior live?

## Prerequisites

Module 01 (names are references, scope and `nonlocal`) and module 02 (unpacking with `*` and `**`). Functions are objects like any other: you can store them, pass them and give them attributes.

## The pieces

| Piece | What to know |
| --- | --- |
| Modules | A file runs once on first import and is cached in `sys.modules` |
| Parameters | Positional-only `/`, keyword-only `*`, `*args`, `**kwargs` |
| Defaults | Evaluated once, when `def` runs |
| Closures | Capture variables, not values, so loops bind late |
| Decorators | `@dec` means `f = dec(f)`; `functools.wraps` keeps metadata |
| Callables | Any object with `__call__`, plus `partial`, `singledispatch`, `lru_cache` |

```py
def connect(host, /, port=5432, *, ssl=True):
    return f"{host}:{port} ssl={ssl}"

connect("db", 5433, ssl=False)   # host is positional-only, ssl keyword-only
```

## Coming from TypeScript and JavaScript

- ES module bindings are live; `from config import LEVEL` binds a new name to the current object once, and later rebinding of `config.LEVEL` is not seen.
- JS defaults are evaluated per call; Python evaluates them once, so `def f(items=[])` shares one list.
- A closure in a `for` loop behaves like `var`, not `let`.
- Options objects become keyword arguments and keyword-only parameters.

## Annotations are not enforced

```py
def double(x: int) -> int:
    return x * 2

double("a")   # "aa": no error, the annotation is never checked
```

Annotations are metadata stored on the function and read by type checkers, IDEs and libraries. The interpreter does not validate arguments against them. Module 09 covers type checkers.

> **Status as of November 2026:** Python 3.14 evaluates annotations lazily (PEP 649), and `annotationlib` inspects them. They are still not checked at call time.

## The path

Modules and imports, `*args`/`**kwargs`, positional-only and keyword-only parameters, mutable defaults, closures and late binding, decorators with `wraps`, parameterized decorators, callables with `partial` and caches, and a closing challenge that builds a client middleware stack, and an ADR checkpoint.

## When to choose it

The module closes with a code challenge, stacking cache, metrics, retry and auth around one client call, and then an ADR that records the same kind of decision for a team's SDK with numbers you compute (attempts, requests, worst-case latency). The decision it trains is where each cross-cutting behavior lives and in which order it runs.
