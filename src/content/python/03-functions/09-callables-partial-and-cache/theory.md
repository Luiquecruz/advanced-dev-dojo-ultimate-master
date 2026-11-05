In Python, "callable" is a protocol, not a type. Functions, classes, bound methods and any object whose class defines `__call__` can be called with `()`:

```py
class Discount:
    def __init__(self, percent):
        self.percent = percent

    def __call__(self, price):
        return price * (1 - self.percent / 100)

ten_off = Discount(10)
ten_off(200)                     # 180.0
callable(ten_off)                # True
list(map(ten_off, [100, 50]))    # works anywhere a function does
```

`functools` and `operator` build callables for you:

```py
from functools import partial
from operator import attrgetter, itemgetter

to_int = partial(int, base=2)        # pre-filled arguments
to_int("101")                        # 5
second = itemgetter(1)               # lambda row: row[1]
by_name = attrgetter("name")         # lambda user: user.name
```

## How it works

An object with `__call__` is used exactly like a function: it can be passed to `map`, `sorted(key=...)` or any API that expects a callable. Unlike a closure, its configuration stays visible (`ten_off.percent`), so it can be inspected, compared and extended. A builder method such as `then` should return a **new** object instead of changing `self`, so every derived pipeline is independent.

### Dispatch by type

`functools.singledispatch` turns a function into a **generic function**: it picks an implementation from the type of the first argument. The decorated function is the fallback, and `@render.register` adds a handler for the type named in the handler's annotation. The lookup follows the class hierarchy, so a subclass uses its parent's handler unless it has its own:

```py
from functools import singledispatch

@singledispatch
def render(value):
    return f"<{type(value).__name__}>"

@render.register
def _(value: int):
    return f"#{value}"

render(7)      # "#7"
render(True)   # "#True": bool is a subclass of int, so the int handler wins
render("x")    # "<str>": no handler for str, so the fallback runs
```

Handlers can live in other modules, so new types can be supported without editing an `if` chain. This is one of the few places where an annotation changes behavior: `register` reads it to know the type.

### Caches

- `@lru_cache(maxsize=128)` memoizes a function by its arguments (which must be hashable). When full, it evicts the **least recently used** entry. `cache_info()` reports `hits`, `misses`, `maxsize` and `currsize`, and `cache_clear()` empties it. `@cache` is `lru_cache(maxsize=None)`: unbounded.
- `@cached_property` runs a method on first access and stores the result in the **instance's `__dict__`** under the same name, so later reads never call it again. Delete the attribute to recompute. It needs instances with a `__dict__` (no `__slots__` without it).

Pitfalls:

- `lru_cache` on a method caches `self` too, keeping instances alive; prefer `cached_property` or a cache keyed by an id.
- A cached function must be pure for its arguments: a cache in front of a value that changes needs an expiry or `cache_clear()`.
- `singledispatch` dispatches on the **first** argument only; use `singledispatchmethod` for methods.

> **Status as of November 2026:** Python 3.14 added `functools.Placeholder` to reserve positional slots in `partial`, as in `partial(str.replace, Placeholder, " ", "-")`. Since 3.12 `cached_property` no longer takes a lock, so concurrent first accesses may compute the value twice.

## Common mistakes

**A builder method that changes `self` and returns it.** Every pipeline derived from the same base is then one object, and each `then` call adds a step to all of them:

```py
# wrong: shouting and whispering are base, with both steps appended
def then(self, step):
    self._steps.append(step)
    return self

# right: a new pipeline; base keeps its own steps
def then(self, step):
    return Pipeline(*self._steps, step)
```

**Checking `type(value) is int` by hand instead of dispatching.** The check rejects subclasses such as `bool`, and every new type means editing the same function.

## When to choose it

- **A class with `__call__`** when a callable needs configuration you want to inspect, compare or extend; a closure when it does not.
- **`partial`, `itemgetter`, `attrgetter`** instead of one-line lambdas that only fix arguments or read a field.
- **`singledispatch`** for an open set of types where other modules may register handlers; a `match` statement or `if` chain for a closed, local set.
- **`lru_cache`** for bounded, pure lookups; **`cached_property`** for derived values of an object that does not change.
