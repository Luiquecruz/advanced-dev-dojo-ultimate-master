An annotation is an expression written after a parameter (`name: str`), after `->` for the result, or after a variable name. Python evaluates it into an ordinary object and stores it; it never checks a value against it.

```py
import typing
from collections.abc import Callable

def retry(task: Callable[[], str], attempts: int = 3, delay: float | None = None) -> list[str]:
    return [task() for _ in range(attempts)]

print(typing.get_type_hints(retry))
# {'task': collections.abc.Callable[[], str], 'attempts': <class 'int'>,
#  'delay': float | None, 'return': list[str]}
retry(lambda: "ok", attempts="3")   # TypeError raised by range(), not by the annotation
```

The objects are real: `list[str]` is a `types.GenericAlias` whose `__origin__` is `list`, and `float | None` is a `typing.Union` object. That is why runtime code can read them.

## How it works

The common shapes, written the modern way:

```py
from collections.abc import Callable

def count_words(items: list[str], limit: int | None = None) -> dict[str, int]: ...
def merge(base: dict[str, int], *overrides: dict[str, int], strict: bool = False) -> dict[str, int]: ...
def apply_all(values: list[int], transform: Callable[[int], int]) -> list[int]: ...
```

- `function.__annotations__` (or `cls.__annotations__`) is the raw dict of evaluated annotations. A variable annotation in a class body (`name: str`) is recorded there without creating a class attribute.
- `typing.get_type_hints(obj)` is the consumer-friendly view: it resolves string annotations and forward references, turns `None` into `NoneType`, merges base classes for a class, and strips `Annotated` extras unless `include_extras=True`. Prefer it whenever code reads annotations.
- **A default never changes the annotation.** `limit: int = None` declares `int`, and since Python 3.11 `get_type_hints` returns `int`, not `int | None`. When `None` is a valid value, it belongs in the type.
- **Variadic parameters annotate one element.** `*overrides: dict[str, int]` says that **each** extra argument is a `dict[str, int]`; `overrides` itself is a `tuple`. In the same way, `**options: str` makes every keyword value a `str`.
- `-> Self` (PEP 673, Python 3.11) means "the class of the receiver": a method that returns `self` keeps a subclass's own type, so chained calls on a subclass stay typed as that subclass.
- Equality is structural: `get_type_hints(f)["items"] == list[str]` is true. `typing.List[str] == list[str]` is **false** (different alias classes). `typing.Optional[int] == int | None` is true (on 3.14 both spellings even build the same `typing.Union` class), so only a look at the source can tell the old spelling apart.
- `Callable[[int], int]` lists the parameter types, then the result; `Callable[..., str]` accepts any arguments.

Pitfalls:

- An annotation is not a conversion: `count: int` does not turn `"3"` into `3`.
- `typing.Callable[[int], int] == collections.abc.Callable[[int], int]` is false; pick the `collections.abc` one.

## Common mistakes

**A `None` default without `None` in the type.** The function works, because nothing checks the annotation, but every reader of the annotations is told `None` is not allowed: a checker reports the default itself as an error, and a validator or schema built from `get_type_hints` rejects `None` or marks the field as required.

```py
# wrong: the annotation says int, the default says None
def count_words(items: list[str], limit: int = None) -> dict[str, int]: ...

# right: None is part of the type
def count_words(items: list[str], limit: int | None = None) -> dict[str, int]: ...
```

The second slip is annotating the collection on a variadic parameter: `*overrides: tuple[dict[str, int], ...]` declares that each extra argument is itself a tuple.

## Legacy vs modern

| Legacy (still works) | Modern | Since |
| --- | --- | --- |
| `List[str]`, `Dict[str, int]`, `Tuple[int, ...]` | `list[str]`, `dict[str, int]`, `tuple[int, ...]` | 3.9 (PEP 585) |
| `Optional[int]`, `Union[int, str]` | `int \| None`, `int \| str` | 3.10 (PEP 604) |
| `typing.Callable` | `collections.abc.Callable` | 3.9 |
| `-> "Node"` returning `self` | `-> Self` | 3.11 (PEP 673) |

> **Status as of November 2026:** the `typing` documentation calls the capitalised aliases deprecated since 3.9 but says their removal "is not currently planned" and the interpreter emits no warning for them; type checkers are encouraged to flag them when targeting 3.9 or newer. Python 3.15 was released in October 2026; this sandbox runs CPython 3.14 (Pyodide), and every example here behaves the same on both.

## When to choose it

- **Annotate public functions and classes** with the modern spelling: builtin generics, `X | None`, `collections.abc.Callable`, `Self`.
- **Read annotations with `get_type_hints`**, never by parsing their `repr`.
- **Keep runtime checks** where a value comes from outside (user input, JSON, plugins): an annotation documents the contract, a check enforces it.
- **Skip annotations** on obvious local variables; a checker infers them.
