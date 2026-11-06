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

## How it works

- `def` is a statement that runs once, usually at import time. It evaluates every default expression right then and stores the results in `function.__defaults__` (and `__kwdefaults__` for keyword-only parameters). Nothing is re-evaluated on later calls.
- The bug hides until a second call, often in a different request, test or user session, sees data left by the first. The same rule freezes values that look dynamic: `def stamp(at=datetime.now())` records the moment the module was imported, not the moment of the call.
- The bug only appears with **mutable** defaults that the function mutates: lists, dicts, sets, instances. `None`, numbers, strings and tuples are safe.
- Methods are functions, so `def __init__(self, items={})` shares one dict across **every instance**.

The dataclasses lesson in module 04 meets the same rule: a dataclass refuses a `[]` default for a field and asks for `field(default_factory=list)`, a factory called once per instance.

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

## Common mistakes

**Writing a mutable default in the signature.** `tags=[]` builds one list when `def` runs, and every call that omits the argument appends to that same list:

```py
# wrong: add_tag("python"), then add_tag("docs") returns ['python', 'docs']
def add_tag(tag, tags=[]):
    tags.append(tag)
    return tags

# right: a new list per call, built in the body
def add_tag(tag, tags=None):
    if tags is None:
        tags = []
    tags.append(tag)
    return tags
```

**Replacing the sentinel check with `tags = tags or []`.** An empty list the caller passed on purpose is falsy, so the function fills a new list and the caller's list stays empty.

## When to choose it

- **`None` sentinel** for any optional mutable argument. It is the convention readers and type checkers expect (`list[str] | None = None`).
- **A copy of what the caller passes** (`dict(items)`) when the object must own its state, as `Registry` does.
- **A private `object()` sentinel** only when `None` is a meaningful value of the argument.
- **Immutable defaults** (`()`, `frozenset()`, a tuple of tuples) when the function only reads the value: they can be shared safely.
