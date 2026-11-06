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

## How it works

A `dict` key or a `set` member must be **hashable**: it has a `__hash__` that never changes while the object is stored, and `a == b` implies `hash(a) == hash(b)`. The dict uses the hash to find the slot, then `==` to confirm the match. Keys are therefore compared by **value**: `(1, 2)` and another `(1, 2)` built elsewhere are the same key.

Immutable scalars such as `int`, `str` and `bytes` satisfy this, and so does a `frozenset`; a `tuple` does only when its items do. `list`, `dict` and `set` do not, because their contents could change while stored and their hash would no longer point to the right slot, so they raise `TypeError: unhashable type`.

```py
cache = {}
cache[(1, 2)] = "ok"            # a tuple of immutables works
cache[[1, 2]] = "boom"          # TypeError: unhashable type: 'list'
cache[(1, [2])] = "boom"        # also TypeError: the tuple holds a list
```

A tuple is immutable, but it is hashable only when everything inside it is hashable. **Immutability is shallow for containers.** When you need a list as a key, you first **freeze** it: convert it, and everything inside it, to immutable types (`tuple`, `frozenset`).

Mutating an object *after* using it as a key (possible only for custom classes that define `__hash__`) breaks lookups silently. Keep hashable objects immutable.

## Common mistakes

**Freezing only the outer container.** `tuple(data)` turns the outer list into a tuple, but the lists inside it are still lists, so the result is still unhashable:

```py
data = [1, [2, 3]]
key = tuple(data)                  # wrong: (1, [2, 3]) still holds a list
hash(key)                          # TypeError: unhashable type: 'list'

key = (1, tuple(data[1]))          # right: every level converted
hash(key)                          # works
```

A function that freezes nested data has to convert each child before wrapping it, at every level.

**Building a string with `+=` in a loop.** Strings are immutable, so each `+=` may build a new string. Collect the pieces and join them once:

```py
log = ""
for line in lines:
    log += line + "\n"      # may build a new string each time

log = "".join([line + "\n" for line in lines])   # one pass, preferred
```

## When to choose it

- **Immutable values** for dict keys, set members, cache keys and data shared between components: they cannot change under you.
- **Mutable containers** for local accumulation, where you control every writer.
- **`tuple` or `frozenset`** when you need a hashable collection; `@dataclass(frozen=True)` for hashable records (module 04).
- Avoid freezing large structures on every call: freeze once at the boundary and pass the frozen value on.
