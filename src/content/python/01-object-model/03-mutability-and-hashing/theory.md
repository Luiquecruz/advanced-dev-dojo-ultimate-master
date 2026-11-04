Objects are either **mutable** (their contents can change in place) or **immutable** (every "change" builds a new object).

| Immutable | Mutable |
| --- | --- |
| `int`, `float`, `bool`, `str`, `bytes`, `tuple`, `frozenset`, `None` | `list`, `dict`, `set`, `bytearray`, most class instances |

```py
text = "abc"
text.upper()          # returns "ABC"; text is still "abc"

items = [3, 1, 2]
items.sort()          # changes the list in place and returns None
```

## Hashing decides what can be a key

A `dict` key or a `set` member must be **hashable**: it has a `__hash__` that never changes while the object is stored, and `a == b` implies `hash(a) == hash(b)`. Immutable built-ins satisfy this; `list`, `dict` and `set` do not, so they raise `TypeError: unhashable type`.

```py
cache = {}
cache[(1, 2)] = "ok"            # a tuple of immutables works
cache[[1, 2]] = "boom"          # TypeError: unhashable type: 'list'
cache[(1, [2])] = "boom"        # also TypeError: the tuple holds a list
```

A tuple is immutable, but it is hashable only when everything inside it is hashable. **Immutability is shallow for containers.**

## Coming from TypeScript and JavaScript

- A JS `Map` keys objects by *reference*: two equal-looking arrays are different keys. A Python `dict` keys by **value** (`__hash__` plus `__eq__`), so `(1, 2)` and another `(1, 2)` are the same key, and a list cannot be a key at all.
- `Object.freeze` is shallow and only blocks assignment. Python's `frozenset` and `tuple` are real immutable types, and being hashable is part of the contract.
- JS strings are immutable like Python strings, but JS arrays are not hashed at all. When you need a list as a cache key in Python you first **freeze** it into a tuple.

## Pitfalls

```py
log = ""
for line in lines:
    log += line + "\n"      # may build a new string each time

log = "\n".join(lines)      # one pass, preferred
```

Mutating an object *after* using it as a key (possible only for custom classes that define `__hash__`) breaks lookups silently. Keep hashable objects immutable.

## When to choose it

- **Immutable values** for dict keys, set members, cache keys and data shared between components: they cannot change under you.
- **Mutable containers** for local accumulation, where you control every writer.
- **`tuple` or `frozenset`** when you need a hashable collection; `@dataclass(frozen=True)` for hashable records (lesson of module 04).
- Avoid freezing large structures on every call: freeze once at the boundary and pass the frozen value on.
