A default value is an **object created once**, when the `def` statement runs, and stored on the function. Every call that omits the argument receives that same object.

```py
def add_tag(tag, tags=[]):
    tags.append(tag)
    return tags

print(add_tag("a"))   # ['a']
print(add_tag("b"))   # ['a', 'b']: the same list, still holding "a"
print(add_tag.__defaults__)   # (['a', 'b'],)
```

The fix is a sentinel that cannot be confused with real data, usually `None`, and a fresh object built inside the body:

```py
def add_tag(tag, tags=None):
    if tags is None:
        tags = []
    tags.append(tag)
    return tags
```

## Coming from TypeScript and JavaScript

JavaScript evaluates a default expression **on every call** that needs it, so `[]` in a signature is a brand-new array each time:

```ts
function addTag(tag: string, tags: string[] = []) {
  tags.push(tag);
  return tags;
}
addTag("a");   // ["a"]
addTag("b");   // ["b"]
```

The same line in Python shares one list across calls, and the bug hides until a second call (often in a different request, test or user session) sees data from the first. The reverse surprise exists too: `def stamp(at=datetime.now())` freezes the time when the module was imported.

## How it works

- `def` evaluates the defaults and stores them in `function.__defaults__` (and `__kwdefaults__` for keyword-only parameters). Nothing is re-evaluated later.
- The bug only appears with **mutable** defaults that the function mutates: lists, dicts, sets, instances. `None`, numbers, strings and tuples are safe.
- Methods are functions, so `def __init__(self, items={})` shares one dict across **every instance**.
- `tags = tags or []` is a weaker fix: an empty list passed by the caller is falsy, so the function silently replaces it instead of filling it. Compare with `is None`.

### Dataclasses

`@dataclass` refuses unhashable defaults such as `[]` with a `ValueError` at class creation. Use a factory, called once per instance:

```py
from dataclasses import dataclass, field

@dataclass
class Settings:
    tags: list[str] = field(default_factory=list)
    limits: dict[str, int] = field(default_factory=dict)
```

### When `None` is a valid argument

Sometimes `None` already means something ("send no headers"). Then you need a second, private sentinel to mean "argument omitted":

```py
_UNSET = object()

def request(path, headers=_UNSET):
    if headers is _UNSET:
        headers = dict(DEFAULT_HEADERS)   # a copy, never the module dict itself
    elif headers is None:
        headers = {}
```

`object()` creates a value no caller can pass by accident, and `is` compares identity, so the check is exact. Copying the module-level defaults matters for the same reason as the default list: handing out the shared dict lets one caller change it for everyone.

## When to choose it

- **`None` sentinel** for any optional mutable argument. It is the convention readers and type checkers expect (`list[str] | None = None`).
- **`field(default_factory=...)`** for dataclass fields, and the same idea in other model libraries.
- **A private `object()` sentinel** only when `None` is a meaningful value of the argument.
- **Immutable defaults** (`()`, `frozenset()`, a tuple of tuples) when the function only reads the value: they can be shared safely.
