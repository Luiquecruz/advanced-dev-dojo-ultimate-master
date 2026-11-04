Calling a class runs two hooks in sequence. `__new__` **creates** the object and returns it; `__init__` **initializes** the object that `__new__` returned.

```py
class Point:
    def __new__(cls, x, y):
        print("new")
        return super().__new__(cls)    # object.__new__ allocates the instance

    def __init__(self, x, y):
        print("init")
        self.x, self.y = x, y

Point(1, 2)    # prints "new", then "init"
```

Roughly, `Point(1, 2)` does this:

```py
instance = Point.__new__(Point, 1, 2)
if isinstance(instance, Point):
    instance.__init__(1, 2)
```

Most classes only need `__init__`. You reach for `__new__` in two situations: the object must be decided **before** it exists (return a cached instance instead of a new one), or the type is **immutable** and its value is fixed at creation (`int`, `float`, `str`, `tuple` subclasses).

## Coming from TypeScript and JavaScript

A JavaScript constructor can return a different object, so a cache often lives inside the constructor:

```ts
class Currency {
  static cache = new Map<string, Currency>();
  constructor(public code: string) {
    const hit = Currency.cache.get(code);
    if (hit) return hit;           // allowed in JS
    Currency.cache.set(code, this);
  }
}
```

The Python translation breaks in two ways:

- `__init__` must return `None`; returning the cached object raises `TypeError`. The decision belongs in `__new__`.
- When `__new__` returns an **existing** instance of the class, Python still calls `__init__` on it. Code that sets `self.rates = {}` in `__init__` wipes the cached object's state on every `Currency("EUR")` call. That is the mistake this challenge tests.

The same habit fails for immutable subclasses. Validating or converting in `__init__` is too late:

```py
class Percent(float):
    def __init__(self, value):
        ...              # float.__new__ already ran: Percent("12.5%") raised before we got here
```

## How it works

- `__new__` is a static method that receives the class as its first argument. Call `super().__new__(cls)` to allocate; for immutable bases pass the value too: `super().__new__(cls, number)`.
- If `__new__` returns an object that is not an instance of the class, `__init__` is skipped.
- If it returns an instance, `__init__` runs with the same arguments, every time. Either make `__init__` idempotent (only count, or check before setting) or do the whole setup in `__new__`.
- Operations on a `float` subclass return plain `float`: `Percent(5) + 1` is `6.0`, not a `Percent`. Override `__add__` only if the result must keep the type and its invariant.
- An interning cache keeps instances alive forever. For many short-lived keys, a `weakref.WeakValueDictionary` lets unused instances be collected.

```py
class Celsius(float):
    def __new__(cls, value):
        number = float(value)
        if number < -273.15:
            raise ValueError("below absolute zero")
        return super().__new__(cls, number)
```

## When to choose it

- **`__init__` only** for ordinary mutable classes: almost always.
- **`__new__`** for subclasses of immutable built-ins and for controlling which object a call returns (interning, flyweights, returning a subclass).
- **A factory function or classmethod** (`Currency.of("EUR")`) when callers can accept a different call shape: it is more explicit than overriding `__new__` and runs no hidden second `__init__`.
- Avoid singletons through `__new__` for configuration; a module-level object already is one.
