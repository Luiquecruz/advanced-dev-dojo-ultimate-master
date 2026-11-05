A **descriptor** is an object stored on a class that takes over attribute access for one name. Any object whose class defines `__get__`, `__set__` or `__delete__` qualifies. `property`, methods, `classmethod` and `staticmethod` are all descriptors.

```py
class Positive:
    def __set_name__(self, owner, name):
        self.name = name                          # "price", told by the class statement

    def __get__(self, instance, owner=None):
        if instance is None:
            return self                           # Product.price returns the descriptor
        return instance.__dict__[self.name]

    def __set__(self, instance, value):
        if value <= 0:
            raise ValueError(f"{self.name} must be positive")
        instance.__dict__[self.name] = value      # state lives on the instance

class Product:
    price = Positive()
    weight = Positive()
```

One `Positive` object serves **every** `Product`, so it must never keep a value on `self`. The descriptor holds configuration (the name, limits); the instance holds data.

## How it works

Precedence depends on which methods the descriptor defines:

| Kind | Defines | Versus `instance.__dict__` |
| --- | --- | --- |
| Data descriptor | `__set__` or `__delete__` | wins: always called |
| Non-data descriptor | only `__get__` | loses: a value in the instance dict shadows it |

A data descriptor may therefore store its value under its **own name** in `instance.__dict__`: lookup still reaches the descriptor first. A non-data descriptor uses the shadowing on purpose. A lazy attribute computes on first access, writes the result into `instance.__dict__`, and from then on the plain dict entry answers without calling the descriptor. Assigning a new value simply replaces the entry. `functools.cached_property` works this way.

```py
class LazyAttribute:
    def __init__(self, function):
        self.function = function
        self.name = function.__name__

    def __get__(self, instance, owner=None):
        if instance is None:
            return self
        value = instance.__dict__[self.name] = self.function(instance)
        return value
```

**`__set_name__(owner, name)`** ([PEP 487](https://peps.python.org/pep-0487/), Python 3.6) runs when the class statement finishes, once for each descriptor in the namespace. Before it existed, field names had to be repeated (`price = Positive("price")`) or a metaclass filled them in. With it, errors can say *which* attribute failed.

The class namespace keeps definition order, so a base class can discover its fields:

```py
@classmethod
def fields(cls):
    return [name for name, value in vars(cls).items() if isinstance(value, Field)]
```

Walk `reversed(cls.__mro__)` to include inherited fields. Avoid a registry list on the base class that `__set_name__` appends to: every subclass would share it.

## Common mistakes

**Storing the value on the descriptor.** The descriptor object is created once, in the class body, and shared by every instance, so `self.value` is one slot for all of them and the last write wins:

```py
# wrong: Product(3, 1) then Product(50, 2) makes both prices 50
def __set__(self, instance, value):
    self.value = value

# right: the data lives on the instance, under the descriptor's name
def __set__(self, instance, value):
    instance.__dict__[self.name] = value
```

When the owner class has no `__dict__` (it uses `__slots__`, lesson 06), keep the values in a `weakref.WeakKeyDictionary` keyed by the instance instead.

**Forgetting the `instance is None` branch in `__get__`.** `Product.price` then tries to read a value from `None` and fails, and tools that inspect the class can no longer find the descriptor.

## When to choose it

- **A descriptor class** when the same attribute rule repeats across many fields or classes (validation, units, type coercion, ORM columns).
- **`property`** for a one-off rule on one attribute.
- **`functools.cached_property`** for lazy values before writing your own non-data descriptor.
- **`__set_name__`** whenever a descriptor needs its attribute name; never ask callers to repeat it.
- Avoid descriptors for plain data: a dataclass or a plain attribute is easier to read.
