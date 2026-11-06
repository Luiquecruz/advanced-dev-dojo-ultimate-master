`@dataclass` reads the annotated class attributes and **generates** methods for you when the class is created: `__init__`, `__repr__`, `__eq__`, and on request ordering, hashing, immutability and slots.

```py
from dataclasses import dataclass, field

@dataclass(frozen=True, order=True)
class Version:
    major: int
    minor: int = 0
    labels: list[str] = field(default_factory=list, compare=False)

Version(1, 2) < Version(1, 10)       # True: fields compared in order, as a tuple
Version(1).labels is Version(1).labels   # False: one new list per instance
```

The options you will use most:

| Option | Effect |
| --- | --- |
| `frozen=True` | assignment raises `FrozenInstanceError`; with `eq` the class gets a `__hash__` |
| `order=True` | `<`, `<=`, `>`, `>=` comparing the fields in definition order |
| `slots=True` | generated `__slots__` (next lesson) |
| `kw_only=True` | every field must be passed by keyword |

`field()` tunes one field: `default_factory` for mutable defaults, `compare=False` to leave it out of equality, ordering and hashing, `repr=False`, `kw_only=True`.

## How it works

The generated `__init__` assigns the fields and then calls `__post_init__` if you define it. That is the place for validation and normalization:

```py
@dataclass(frozen=True)
class Email:
    address: str

    def __post_init__(self):
        if "@" not in self.address:
            raise ValueError("invalid email")
        object.__setattr__(self, "address", self.address.lower())
```

A frozen class blocks `self.address = ...` even inside `__post_init__`, so normalization goes through `object.__setattr__`, which is what the generated `__init__` does too.

- A mutable default is refused at class creation: `tags: list[str] = []` raises `ValueError: mutable default <class 'list'> for field tags is not allowed: use default_factory`. `field(default_factory=list)` calls `list()` once per instance.
- `dataclasses.replace(obj, **changes)` builds a new object through `__init__`, so `__post_init__` validates it like any other.
- `frozen=True` is enforced at runtime: the generated `__setattr__` and `__delattr__` raise `FrozenInstanceError`.
- `InitVar[T]` declares an argument passed to `__post_init__` but not stored as a field.
- `asdict(obj)` and `astuple(obj)` convert recursively; `fields(obj)` lists the `Field` objects.
- `frozen` makes the attributes read-only, not their values: a frozen object holding a list can still have that list appended to. Use tuples when the whole value must be immutable.
- `eq=True` without `frozen` sets `__hash__` to `None`, so mutable dataclasses cannot go into sets.
- `replace` is **shallow**: the new object receives the same field values, so `with_price(mug, 700).tags is mug.tags`. Copy mutable fields explicitly (`replace(p, tags=list(p.tags))`) when the copies must diverge, or store a tuple.

Python 3.14 evaluates annotations lazily (PEP 649 and PEP 749), and `dataclasses` reads field annotations through `annotationlib` with forward references allowed, so a field can name a class defined later in the module. `slots` and `kw_only` exist since 3.10. This track runs Python 3.14.

## Common mistakes

**Copying a frozen object and patching the copy.** Assigning a field fails on a frozen instance, so the workaround is a copy plus `object.__setattr__`. That skips `__post_init__`, and an invalid object slips through:

```py
import copy

# wrong: with_price(mug, -5) returns a product with a negative price
def with_price(product, price_cents):
    changed = copy.copy(product)
    object.__setattr__(changed, "price_cents", price_cents)
    return changed

# right: replace runs __init__ and __post_init__ on the new object
def with_price(product, price_cents):
    return replace(product, price_cents=price_cents)
```

Keep `object.__setattr__` for the one place the generated `__init__` needs it: normalizing a field inside `__post_init__`.

Rebuilding by hand, `Product(product.name, price_cents, product.tags)`, does validate, but it names every field: when a field with a default is added to the class later, the hand-written call silently resets it to that default. `replace` carries over every `__init__` field you do not name, so it keeps working as the class grows. Fields declared with `init=False` are not copied: `__post_init__` sets them again.

## When to choose it

- **`@dataclass`** for classes that are mainly data with a few methods: records, configuration, value objects, messages.
- **`frozen=True`** (plus `order` when sorting makes sense) for value objects that are compared, hashed or shared.
- **`replace`** to derive modified copies; never patch a frozen instance.
- **A plain class** when construction has real logic, the attributes are mostly private, or the class exists for behavior rather than data.
- **`NamedTuple`** when tuple unpacking and indexing are part of the API; **Pydantic-style libraries** when you validate untrusted input against a schema.
