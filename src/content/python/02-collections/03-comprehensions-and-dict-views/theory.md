A **comprehension** builds a list, set or dict from an iterable in one expression.

```py
squares = [n * n for n in range(5)]                    # list
evens = {n for n in range(10) if n % 2 == 0}           # set
lengths = {word: len(word) for word in ["a", "bb"]}    # dict
pairs = [(x, y) for x in range(2) for y in "ab"]       # two loops, read left to right
```

The shape is `expression for target in iterable if condition`. A comprehension runs in **its own scope**: the loop variable does not leak into the surrounding function.

## Dict views are live

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

Take a snapshot with `list(view)` when you need one, for example before mutating the dict while iterating.

## Coming from TypeScript and JavaScript

```ts
const squares = [0, 1, 2].map((n) => n * n);
const inverted = Object.fromEntries(Object.entries(map).map(([k, v]) => [v, k]));
const keys = Object.keys(map);       // a snapshot array
```

- A comprehension replaces chained `map`/`filter` and `Object.fromEntries(...)` with one readable expression.
- `Object.keys` returns a **copy**; a Python `keys()` is a **live view** with set operators.
- Inverting a mapping silently overwrites duplicate values in both languages. In Python you decide what to do: collect into sets, or raise.

## Pitfalls

- Adding or removing keys while iterating over a dict (or one of its views) raises `RuntimeError`. Iterate over `list(mapping)` instead. Assigning a new value to an existing key is allowed.
- Keep a comprehension to **one idea**. More than two loops or conditions belongs in a normal `for` loop with a name.
- `[f(x) for x in items]` just for side effects builds a useless list; use a loop.

## When to choose it

- **Comprehension** for a simple transform or filter that produces a collection.
- **Generator expression** `( ... )` when the consumer reads once and the data may be large (module 05).
- **A `for` loop** for several statements, early exits or side effects.
- **A live view** when callers should see changes; **a list or set copy** when you need a stable snapshot.
