Python typing grew one PEP at a time, and the checkers that read it are separate tools with their own release cycles. This lesson connects the two: which spelling belongs to which Python version, and what a checker in CI actually buys you.

## How the syntax evolved

| Python | What arrived | PEPs |
| --- | --- | --- |
| 3.5–3.6 | `typing` module, function and variable annotations | 484, 526 |
| 3.8 | `Protocol`, `Literal`, `TypedDict`, `Final` | 544, 586, 589, 591 |
| 3.9 | builtin generics: `list[str]` replaces `typing.List[str]` | 585 |
| 3.10 | `X \| Y` replaces `Union`/`Optional`; `ParamSpec`, `TypeGuard` | 604, 612, 647 |
| 3.11 | `Self`, `Required`/`NotRequired`, variadic generics | 673, 655, 646 |
| 3.12 | `def f[T]`, `class C[T]`, `type` aliases | 695 |
| 3.13 | type parameter defaults, `ReadOnly`, `TypeIs` | 696, 705, 742 |
| 3.14 | deferred evaluation of annotations, `annotationlib` | 649, 749 |
| 3.15 | `TypedDict` extra items, `TypeForm`, disjoint bases | 728, 747, 800 |

The old spellings still run. `typing.List`, `Dict` and `Optional` are deprecated aliases with no removal planned and no runtime warning, so the push to modernise comes from checkers and linters (for example `ruff`'s `UP` rules), not from the interpreter.

```py
from typing import List, Optional

def legacy(tags: Optional[List[str]] = None) -> None: ...   # runs on 3.14, flagged by linters
def modern(tags: list[str] | None = None) -> None: ...      # same meaning
```

## What a checker does

A checker parses your code and its dependencies **without running them**, infers types, and reports calls, returns and attribute accesses that do not fit. It runs in the editor (language server) and in CI. It never runs inside your program, and **none runs in this sandbox**: every challenge in this module tested runtime introspection (`get_type_hints`, `__type_params__`, key sets, overload registries, protocol `isinstance`), not type checking. On a real project, add the checker as a CI step.

What a checker reports, on code that runs without any error until the bad value arrives:

| Code | What the checker reports |
| --- | --- |
| `ship("A-17")` where `def ship(order_id: int)` | an argument of the wrong type |
| `def find(...) -> str \| None` and then `find(x).upper()` | an attribute access on a value that may be `None` |
| `def total(...) -> int: return "0"` | a return value that does not match the annotation |
| `user.nmae` | an attribute the class does not have |
| `def page(size: int = None)` | a default that does not fit the annotation |
| `match` over a closed union with a missing case before `assert_never` | an unhandled variant |

The vocabulary you meet in its settings and messages:

- `Any` switches checking off, in both directions: everything is accepted from it and passed to it. `object` accepts every value but allows only what every object supports, so you narrow it first.
- A **stub file** (`.pyi`) holds signatures only, for untyped or compiled code; **typeshed** collects stubs for the standard library and popular packages, published as `types-x` packages.
- A **`py.typed`** marker file (PEP 561) tells checkers that an installed package ships inline annotations.
- **Strict mode** (mypy `--strict`, pyright `"typeCheckingMode": "strict"`) requires annotations everywhere and rejects the implicit `Any` of missing annotations and bare generics such as `list`; an `Any` that a library returns, as `json.loads` does, still passes.

A Python program with type errors still runs, so the checker only protects you if CI fails on its report.

## The checkers

- **mypy**: the first Python type checker (PEP 484 grew out of it), configurable per module, with plugins (Django, Pydantic) and incremental caching.
- **pyright**: Microsoft's checker; it powers Pylance in VS Code and is known for fast, precise inference.
- **ty** (Astral, the makers of uv and ruff) and **pyrefly** (Meta): newer checkers built as compiled native tools, aimed at very large codebases and editor speed.

The checkers named here are mypy, pyright, pyrefly and ty. Versions move monthly or faster; check each project's own release history before pinning.

Each checker infers a little differently, and new releases find new errors in unchanged code. Pin the checker version in your lock file and upgrade it on purpose, in its own change.

## Gradual typing in practice

- By default mypy skips the bodies of unannotated functions, while pyright still analyses them with whatever it can infer; strict modes require annotations on every definition.
- `Any` spreads: a value returned from an untyped library is `Any`, and so is everything computed from it. Stubs or a typed wrapper at the boundary stop the spread.
- `# type: ignore[code]` silences one line; prefer it to a global `Any`, and let the checker warn about unused ignores.

## When types pay off

They pay most on public APIs, libraries consumed by other teams, long-lived services and big refactors, where a checker finds every caller you broke. They pay least in short scripts and notebooks. In every case, annotations document intent but never validate data: keep runtime checks where data enters the program.
