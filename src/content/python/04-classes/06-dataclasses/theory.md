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
| `slots=True` | generated `__slots__` (previous lesson) |
| `kw_only=True` | every field must be passed by keyword |

`field()` tunes one field: `default_factory` for mutable defaults, `compare=False` to leave it out of equality, ordering and hashing, `repr=False`, `kw_only=True`.

## Coming from TypeScript and JavaScript

```ts
class Product {
  tags: string[] = [];                               // a new array per instance
  constructor(public name: string, public priceCents: number) {}
}
const sale = { ...product, priceCents: 700 };       // a plain object, no class, no checks
```

- **Field initializers.** TypeScript evaluates `tags = []` for each instance. In a dataclass, `tags: list[str] = []` would be one list shared by every instance, so the decorator refuses it with `ValueError: mutable default <class 'list'> for field tags is not allowed`. Write `field(default_factory=list)`.
- **Spread to copy.** `{...product, priceCents: 700}` skips the constructor. The Python habit that matches it, copying the object and patching an attribute, either fails on a frozen instance or skips validation. `dataclasses.replace(product, price_cents=700)` calls `__init__` again, so `__post_init__` validates the new object.
- TypeScript `readonly` exists only at compile time; `frozen=True` is enforced at runtime.

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

- `InitVar[T]` declares an argument passed to `__post_init__` but not stored as a field.
- `asdict(obj)` and `astuple(obj)` convert recursively; `fields(obj)` lists the `Field` objects.
- `frozen` makes the attributes read-only, not their values: a frozen object holding a list can still have that list appended to. Use tuples when the whole value must be immutable.
- `eq=True` without `frozen` sets `__hash__` to `None`, so mutable dataclasses cannot go into sets.

> **Status as of November 2026:** Python 3.14 evaluates annotations lazily (PEP 649 and PEP 749), and `dataclasses` reads field annotations through `annotationlib` with forward references allowed, so a field can name a class defined later in the module. `slots` and `kw_only` exist since 3.10. The current release is Python 3.15; this track runs 3.14.

## When to choose it

- **`@dataclass`** for classes that are mainly data with a few methods: records, configuration, value objects, messages.
- **`frozen=True`** (plus `order` when sorting makes sense) for value objects that are compared, hashed or shared.
- **`replace`** to derive modified copies; never patch a frozen instance.
- **A plain class** when construction has real logic, the attributes are mostly private, or the class exists for behavior rather than data.
- **`NamedTuple`** when tuple unpacking and indexing are part of the API; **Pydantic-style libraries** when you validate untrusted input against a schema.
