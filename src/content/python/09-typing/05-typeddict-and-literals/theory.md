A **`TypedDict`** describes a `dict` with a fixed set of string keys and a type per key. It is the natural type for JSON objects that stay dicts. A **`Literal`** type lists the exact values allowed.

```py
from typing import Literal, NotRequired, ReadOnly, TypedDict

class Order(TypedDict):
    id: ReadOnly[int]
    status: Literal["open", "paid", "shipped"]
    note: NotRequired[str]

order = Order(id=1, status="lost")     # no error: it is just dict(id=1, status="lost")
print(type(order))                     # <class 'dict'>
print(sorted(Order.__required_keys__)) # ['id', 'status']
print(sorted(Order.__optional_keys__)) # ['note']
print(sorted(Order.__readonly_keys__)) # ['id']
```

A checker would flag `status="lost"`, a missing `id` or `order["id"] = 2`. At runtime the class only records metadata; checking real data is your code's job.

## Coming from TypeScript and JavaScript

```ts
interface Order { readonly id: number; status: "open" | "paid" | "shipped"; note?: string; }
const order = JSON.parse(body) as Order;   // a cast: nothing is checked
```

The Python spelling maps one to one (`readonly` → `ReadOnly`, `?` → `NotRequired`, a string-literal union → `Literal[...]`), and three habits break when you write the runtime check:

- **A TypedDict is not a validating class.** `Order(**data)` builds a plain dict and `isinstance(data, Order)` raises `TypeError: TypedDict does not support instance and class checks`. The type is for the checker; validation needs code that reads the key sets and annotations.
- **`bool` is an `int`.** In JavaScript `typeof true` is `"boolean"`, never `"number"`. In Python `bool` subclasses `int`, so `isinstance(True, int)` is `True`, and a JSON `true` slips into an integer field unless you exclude it.
- **Parameterized generics are not classes.** `isinstance(value, list[str])` raises `TypeError`; split the annotation with `typing.get_origin` (`list`) and `typing.get_args` (`(str,)`) and check the items yourself.

## How it works

- Each key is required unless the class says otherwise: `total=False` makes every key optional, and `Required[...]` / `NotRequired[...]` (PEP 655, Python 3.11) override per key. The metaclass computes `__required_keys__` and `__optional_keys__` from them, and `__readonly_keys__` / `__mutable_keys__` from `ReadOnly[...]` (PEP 705, Python 3.13).
- `typing.get_type_hints(Order)` strips those qualifiers and returns the value types (`{'id': int, 'status': Literal[...], 'note': str}`); pass `include_extras=True` to keep them.
- `typing.get_args(Literal["open", "paid"])` returns `("open", "paid")`, which is what a validator compares against.
- `Final` (PEP 591) marks a name that must not be reassigned (`MAX_RETRIES: Final = 3`). Like `ReadOnly`, it is enforced only by checkers.

A small validator therefore walks `get_type_hints(schema)`, reports required keys that are absent, checks each present value against its annotation, and decides what to do with keys the schema does not declare.

Pitfalls:

- `value in get_args(literal)` uses `==`, so `True` matches `Literal[1]`. Keep literal sets to strings, or compare types too.
- By default a checker treats a TypedDict as **open**: another dict type with more keys is still compatible. A validator at a trust boundary usually rejects unknown keys explicitly.

> **Status as of November 2026:** PEP 728 shipped in Python 3.15 (October 2026): `class Order(TypedDict, closed=True)` forbids extra keys for checkers, and `extra_items=T` types them, exposed at runtime as `__closed__` and `__extra_items__`. This sandbox runs Python 3.14, where neither exists, so the validator in this lesson rejects unknown keys itself.

## When to choose it

- **`TypedDict`** for JSON-shaped data that stays a dict: API payloads, configuration files, messages passed between services.
- **A dataclass** when you own the object, want methods, defaults or identity, and can afford converting the dict once.
- **A runtime validator** (yours or a library) at every boundary where data comes from outside; a TypedDict documents the shape but never checks it.
- **`Literal`** for a small closed set of strings; an `Enum` when the values need behavior, iteration or a stable identity.
