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

## How it works

- `__init__` must return `None`; returning another object raises `TypeError: __init__() should return None, not ...`. Deciding **which** object a call produces belongs in `__new__`.
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

Validating or converting in `__init__` is too late for an immutable type: by the time `Percent.__init__("12.5%")` would run, `float.__new__` has already tried to convert `"12.5%"` and raised.

### Alternative constructors: `@classmethod` and `@staticmethod`

A method decorated with `@classmethod` receives the **class** as its first argument instead of an instance. That makes it the usual way to offer a second way to build an object, without overriding `__new__`:

```py
class Currency:
    def __init__(self, code):
        self.code = code

    @classmethod
    def from_symbol(cls, symbol):
        return cls({"€": "EUR", "$": "USD"}[symbol])   # cls, so subclasses build subclasses

    @staticmethod
    def is_valid_code(text):
        return len(text) == 3 and text.isalpha()

Currency.from_symbol("€").code    # 'EUR'
Currency.is_valid_code("EUR")     # True
```

A `@staticmethod` receives neither the instance nor the class: it is a plain function kept in the class namespace because it belongs to the concept. Both are called on the class or on an instance.

## Common mistakes

**Resetting state in `__init__` when `__new__` returns a cached instance.** Python calls `__init__` again on the object `__new__` returned, so a cache in `__new__` plus the usual setup in `__init__` wipes the cached object on every call:

```py
# wrong: Currency("EUR") a second time empties the rates added earlier
class Currency:
    _instances = {}

    def __new__(cls, code):
        if code not in cls._instances:
            cls._instances[code] = super().__new__(cls)
        return cls._instances[code]

    def __init__(self, code):
        self.code = code
        self.rates = {}

# right: set up the state once, in the branch of __new__ that creates the instance
class Currency:
    _instances = {}

    def __new__(cls, code):
        if code not in cls._instances:
            instance = super().__new__(cls)
            instance.code, instance.rates = code, {}
            cls._instances[code] = instance
        return cls._instances[code]
```

## When to choose it

- **`__init__` only** for ordinary mutable classes: almost always.
- **`__new__`** for subclasses of immutable built-ins and for controlling which object a call returns (interning, flyweights, returning a subclass).
- **A factory function or classmethod** (`Currency.from_symbol("€")`) when callers can accept a different call shape: it is more explicit than overriding `__new__` and runs no hidden second `__init__`.
- Avoid singletons through `__new__` for configuration; a module-level object already is one.
