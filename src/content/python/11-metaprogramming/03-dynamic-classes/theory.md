A class statement is a convenient way to call `type`. With three arguments, `type(name, bases, namespace)` creates a class from data you already have at runtime:

```py
def describe(self):
    return f"{type(self).__name__} with {self.sku}"

namespace = {"__slots__": ("sku",), "describe": describe}
Product = type("Product", (), namespace)

item = Product()
item.sku = "A-1"
item.describe()          # 'Product with A-1'
Product.__name__         # 'Product'
```

The namespace dict becomes the class `__dict__`, its functions become methods, and the first argument becomes `__name__` and `__qualname__`. This is how `namedtuple`, `make_dataclass` and many ORMs turn a schema (a CSV header, a database table) into a class.

## How it works

- **Methods are plain functions** in the namespace; they are closures over the factory's arguments (`field_names`, `name`), so each generated class carries its own field list.
- **`__slots__` must be in the namespace** when `type()` runs. It replaces the per-instance `__dict__` with fixed slots; assigning `cls.__slots__` later changes nothing.
- **Equality and hashing**: a namespace that defines `__eq__` without `__hash__` gets `__hash__ = None`, exactly like a class statement, so the records are unhashable while they stay mutable.
- **Class keywords** can follow the namespace: `type("Csv", (Plugin,), {}, name="csv")` reaches `__init_subclass__`. But `type()` never calls a metaclass `__prepare__`: `type("Color", (enum.Enum,), {"RED": 1})` fails because `Enum` needs its own namespace object.
- **`types.new_class(name, bases, kwds, exec_body)`** runs the full class creation steps: it resolves the metaclass, calls `__prepare__`, lets `exec_body(namespace)` fill the namespace, and passes the keywords. Use it when the bases have a custom metaclass. Its classes report `__module__ == "types"` (the module that calls the metaclass) unless `exec_body` sets `__module__`.

### The ready-made factories

```py
from collections import namedtuple
from dataclasses import make_dataclass

Point = namedtuple("Point", ["x", "y"])
Point(1, 2) == (1, 2)             # True: a namedtuple is a tuple

Line = make_dataclass("Line", [("sku", str), ("quantity", int)], slots=True)
```

`namedtuple` builds an immutable tuple subclass: indexable, unpackable and equal to any tuple with the same items, which surprises code that compares records of different kinds. `make_dataclass` builds a real dataclass with defaults, ordering and `frozen=` options.

**Type checkers** read source code, not runtime data. They special-case `namedtuple(...)` and `NamedTuple` calls with literal field lists, but a class returned by your own factory is just `type` to them, so attribute access on its instances goes unchecked. When the fields are known while you write the code, a class statement is better.

Python 3.14 added the `decorator` parameter to `dataclasses.make_dataclass`, so a generated class can go through a custom `@dataclass`-style decorator. This track runs 3.14.

## Common mistakes

**Writing a class statement inside the factory.** A class statement names the class after the identifier it uses, so every class the factory returns is called `Record`, and `__dict__.update` accepts any key while requiring none:

```py
# wrong: one fixed name, and the field list is never used
def make_record_class(name, fields):
    class Record:
        def __init__(self, **values):
            self.__dict__.update(values)
    return Record

LineItem = make_record_class("LineItem", ["sku", "quantity"])
LineItem.__name__                 # 'Record'
LineItem(sku="A-1", price=9)      # accepted

# right: the name and the fields come from the arguments (positional values only here)
def make_record_class(name, fields):
    field_names = tuple(fields)

    def __init__(self, *args):
        if len(args) != len(field_names):
            raise TypeError(f"{name}() takes {len(field_names)} values, got {len(args)}")
        for field, value in zip(field_names, args):
            setattr(self, field, value)

    return type(name, (), {"__slots__": field_names, "__init__": __init__})
```

Reprs, tracebacks and logs report the class by its `__name__`, so the wrong version makes every record look the same. `pickle` stores a class by module and `__qualname__`: it refuses the nested `Record` (`make_record_class.<locals>.Record`), and a generated class pickles only when it is bound at module level under its own name.

## When to choose it

- **`type()`** when the fields come from data at runtime (a file header, a schema, a plugin manifest) and the class is simple.
- **`types.new_class`** when the bases bring a metaclass or `__prepare__` (enums, ABCs, ORM bases).
- **`make_dataclass`** when you need dataclass features; **`namedtuple`** only when tuple behavior (unpacking, indexing, tuple equality) is wanted.
- **A class statement** whenever the fields are known in advance: readers and type checkers can see it.
