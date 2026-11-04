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

## Coming from TypeScript and JavaScript

- `{ ...obj }`, `[...arr]` and `Object.assign` are shallow, exactly like `dict(d)` and `list(x)`.
- `structuredClone(obj)` is the JavaScript deep copy. It drops functions, loses class prototypes and throws on some values. `copy.deepcopy` copies instances of your own classes and honors `__copy__` and `__deepcopy__`.
- Both handle **cycles**: `deepcopy` keeps a memo of objects it has already copied, so a dict that contains itself is copied without infinite recursion and keeps its cycle.

## How it works

`deepcopy` returns **atomic** immutable values (numbers, strings, `None`) as they are: there is nothing to protect. That is why identity checks such as `original["name"] is clone["name"]` stay true even after a deep copy.

```py
config["self"] = config
clone = copy.deepcopy(config)
print(clone["self"] is clone)    # True: the cycle points at the clone, not the original
```

## Pitfalls

- Shared defaults: `merged = {**defaults, **config}` shares every mutable default with the caller. Appending to `merged["tags"]` changes `defaults`.
- Deep copies are not free: copying a large graph on every read costs time and memory. Copy at the boundary, once.
- Objects that hold resources (open files, locks, sockets) usually cannot be deep-copied.

## When to choose it

- **No copy** when the data is immutable or the callee only reads it.
- **Shallow copy** when the top-level container changes and the inner objects are immutable or intentionally shared.
- **`copy.deepcopy`** for configuration and snapshot data with nested mutable structure that callers may change.
- **Immutable data** (tuples, frozen dataclasses) when you want sharing to be safe and copying unnecessary.
