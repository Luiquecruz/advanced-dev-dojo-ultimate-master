Copying a container does not automatically copy what is inside it.

```py
config = {"name": "api", "db": {"port": 5432}, "tags": ["a"]}

shallow = config.copy()          # also: dict(config), {**config}
shallow["db"]["port"] = 1        # changes config["db"]["port"] too
print(config["db"]["port"])      # 1
```

A **shallow copy** builds a new outer container and reuses the same inner objects. A **deep copy** builds new inner containers recursively.

| Operation | Depth |
| --- | --- |
| `list(x)`, `x.copy()`, `x[:]`, `dict(d)`, `{**d}`, `copy.copy(x)` | shallow |
| `copy.deepcopy(x)` | deep |

```py
import copy

deep = copy.deepcopy(config)
deep["db"]["port"] = 1
print(config["db"]["port"])      # 5432
```

## How it works

`copy.deepcopy` walks the whole structure. For every mutable container it meets, it builds a new one and copies the children into it; instances of your own classes are copied the same way, and a class can take control with `__copy__` and `__deepcopy__`.

It returns **atomic** immutable values (numbers, strings, `None`) as they are: there is nothing to protect. That is why identity checks such as `original["name"] is clone["name"]` stay true even after a deep copy.

`deepcopy` also keeps a **memo**: a table of the objects it has already copied. When it meets the same object again, it reuses the copy instead of copying again. That makes **cycles** safe, and a structure that contains itself is copied without infinite recursion and keeps its cycle:

```py
config["self"] = config
clone = copy.deepcopy(config)
print(clone["self"] is clone)    # True: the cycle points at the clone, not the original
```

Deep copies are not free: copying a large structure on every read costs time and memory. Copy at the boundary, once. Objects that hold resources (open files, locks, sockets) usually cannot be deep-copied.

## Common mistakes

**Using a shallow copy for nested data.** `dict(config)`, `config.copy()` and `{**config}` copy only the outer dict, so the nested dicts and lists are still shared with the original:

```py
clone = dict(config)             # wrong: clone["db"] is config["db"]
clone["db"]["port"] = 1          # changes the original too

clone = copy.deepcopy(config)    # right: every nested container is new
clone["db"]["port"] = 1          # the original keeps 5432
```

**Merging over shared defaults.** `merged = {**defaults, **config}` is shallow too: `merged["tags"]` is the same list as `defaults["tags"]`, so appending to it changes the defaults for every later caller. Deep-copy the defaults before you merge.

## When to choose it

- **No copy** when the data is immutable or the callee only reads it.
- **Shallow copy** when the top-level container changes and the inner objects are immutable or intentionally shared.
- **`copy.deepcopy`** for configuration and snapshot data with nested mutable structure that callers may change.
- **Immutable data** (tuples, frozen dataclasses) when you want sharing to be safe and copying unnecessary.
