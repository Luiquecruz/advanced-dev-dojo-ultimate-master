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

## Coming from TypeScript and JavaScript

JavaScript classes cannot be called, so a configurable function becomes an object with a `run()` or `execute()` method, and fluent builders usually **mutate** `this` and return it:

```ts
class Pipeline {
  steps: Array<(v: unknown) => unknown> = [];
  then(step: (v: unknown) => unknown) { this.steps.push(step); return this; }
  run(value: unknown) { return this.steps.reduce((v, step) => step(v), value); }
}
```

In Python, define `__call__` and the object is used exactly like a function: no `run()`, and it can be passed to `map`, `sorted(key=...)` or any API that expects a callable. And make `then` return a **new** object: a mutating builder means `base.then(a)` and `base.then(b)` silently share and change `base`, the same aliasing trap as module 01.

The second habit is overloading by hand with `typeof`/`instanceof` chains. `functools.singledispatch` picks an implementation from the type of the first argument, following the class hierarchy:

```py
from functools import singledispatch

@singledispatch
def render(value):
    return f"<{type(value).__name__}>"

@render.register
def _(value: int):
    return f"#{value}"

render(True)   # "#True": bool is a subclass of int, so the int handler wins
```

## How it works: caches

- `@lru_cache(maxsize=128)` memoizes a function by its arguments (which must be hashable). When full, it evicts the **least recently used** entry. `cache_info()` reports `hits`, `misses`, `maxsize` and `currsize`, and `cache_clear()` empties it. `@cache` is `lru_cache(maxsize=None)`: unbounded.
- `@cached_property` runs a method on first access and stores the result in the **instance's `__dict__`** under the same name, so later reads never call it again. Delete the attribute to recompute. It needs instances with a `__dict__` (no `__slots__` without it).

Pitfalls:

- `lru_cache` on a method caches `self` too, keeping instances alive; prefer `cached_property` or a cache keyed by an id.
- A cached function must be pure for its arguments: a cache in front of a value that changes needs an expiry or `cache_clear()`.
- `singledispatch` dispatches on the **first** argument only; use `singledispatchmethod` for methods.

> **Status as of November 2026:** Python 3.14 added `functools.Placeholder` to reserve positional slots in `partial`, as in `partial(str.replace, Placeholder, " ", "-")`. Since 3.12 `cached_property` no longer takes a lock, so concurrent first accesses may compute the value twice.

## When to choose it

- **A class with `__call__`** when a callable needs configuration you want to inspect, compare or extend; a closure when it does not.
- **`partial`, `itemgetter`, `attrgetter`** instead of one-line lambdas that only fix arguments or read a field.
- **`singledispatch`** for an open set of types where other modules may register handlers; a `match` statement or `if` chain for a closed, local set.
- **`lru_cache`** for bounded, pure lookups; **`cached_property`** for derived values of an object that does not change.
