A **comprehension** builds a list, set or dict from an iterable in one expression.

```py
squares = [n * n for n in range(5)]                    # list
evens = {n for n in range(10) if n % 2 == 0}           # set
lengths = {word: len(word) for word in ["a", "bb"]}    # dict
pairs = [(x, y) for x in range(2) for y in "ab"]       # two loops, read left to right
```

The shape is `expression for target in iterable if condition`. A comprehension runs in **its own scope**: the loop variable does not leak into the surrounding function.

## How it works

A comprehension reads like the loop it replaces: `[f(x) for x in items if ok(x)]` is a loop that appends `f(x)` for each `x` that passes the condition. Several `for` clauses nest from left to right. Keep a comprehension to **one idea**: more than two loops or conditions belong in a normal `for` loop with a name, and `[f(x) for x in items]` written only for its side effects builds a useless list.

### Dict views are live

`mapping.keys()`, `.values()` and `.items()` do not return lists. They return **views** that reflect later changes.

```py
stock = {"pen": 3}
names = stock.keys()
stock["ink"] = 5
print(list(names))      # ['pen', 'ink']  the view followed the dict
```

`keys()` (and `items()` when values are hashable) behave like **sets**; `values()` does not, because values may repeat and may be unhashable:

```py
left = {"a": 1, "b": 2}
right = {"b": 9, "c": 3}
left.keys() & right.keys()     # {'b'}
left.keys() - right.keys()     # {'a'}
```

Take a snapshot with `list(view)` when you need one. Adding or removing keys while iterating over a dict (or one of its views) raises `RuntimeError`, so iterate over `list(mapping)` when the loop deletes keys. Assigning a new value to an existing key is allowed.

## Common mistakes

**Inverting a mapping with a dict comprehension.** A dict holds one value per key, so when two keys share a value, the later one silently overwrites the earlier one:

```py
roles = {"u1": "admin", "u2": "admin", "u3": "guest"}
{role: user for user, role in roles.items()}
# wrong: {'admin': 'u2', 'guest': 'u3'}, u1 is lost

by_role = {}
for user, role in roles.items():
    by_role.setdefault(role, set()).add(user)
# right: {'admin': {'u1', 'u2'}, 'guest': {'u3'}}
```

`setdefault(key, default)` returns the value stored under `key`, inserting `default` first when the key is missing, so each role gets its own set.

**Copying a view by accident.** `list(mapping.keys())` is a snapshot that never sees later keys; return `mapping.keys()` itself when the caller needs the live view.

## When to choose it

- **Comprehension** for a simple transform or filter that produces a collection.
- **Generator expression** `( ... )` when the consumer reads once and the data may be large (module 05).
- **A `for` loop** for several statements, early exits or side effects.
- **A live view** when callers should see changes; **a list or set copy** when you need a stable snapshot.
