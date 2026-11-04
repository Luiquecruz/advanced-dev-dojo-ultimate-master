A `set` stores **unique, hashable** items and answers membership questions in constant time on average. It also supports the operations of set algebra.

```py
a = {"read", "write"}
b = {"write", "delete"}

a | b      # union          {'read', 'write', 'delete'}
a & b      # intersection   {'write'}
a - b      # difference     {'read'}
a ^ b      # symmetric difference  {'read', 'delete'}
a <= b     # subset test    False
{"read"} < a   # proper subset   True
```

The named methods (`union`, `intersection`, `difference`, `issubset`...) accept **any iterable**, while the operators need sets on both sides.

```py
a.union(["admin", "ops"])      # fine
a | ["admin"]                  # TypeError
```

## Building and freezing

```py
empty = set()          # {} is an empty dict, not a set
unique = set(["a", "b", "a"])          # {'a', 'b'}
frozen = frozenset({"read", "write"})  # immutable and hashable: a valid dict key
```

A set is **unordered**: do not rely on iteration order. To remove duplicates **and keep order**, use a dict, which preserves insertion order:

```py
list(dict.fromkeys(["b", "a", "b", "c"]))   # ['b', 'a', 'c']
```

Elements must be hashable. `{[1, 2]}` raises `TypeError: unhashable type: 'list'`.

## Coming from TypeScript and JavaScript

```ts
const union = new Set([...a, ...b]);
const inter = [...a].filter((x) => b.has(x));
```

- Python has had set operators for decades. Recent JavaScript engines added `Set.prototype.union`, `intersection` and friends, but code often still spells them out with spreads and filters.
- JavaScript's `Set` keeps insertion order; Python's does not guarantee any order.
- `array.includes(x)` in a loop is O(n) per check. In Python `x in some_set` is the fast path; `x in some_list` has the same cost problem.

## Pitfalls

- `{}` is a dict. Use `set()` for an empty set.
- `set.intersection(*sets)` with **no** sets raises `TypeError`; guard the empty case.
- Do not expect `sorted(set)` order to match insertion order.
- `a | b` and `a.union(b)` return new sets, but `a |= b` changes `a` in place. Returning one of the input sets hands the caller a reference into your data.

## When to choose it

- **`set`** for membership tests, uniqueness and comparing groups (permissions, tags, ids).
- **`frozenset`** when the set must be a dict key or a constant.
- **`dict.fromkeys`** when you need uniqueness **and** order.
- **A list** when order and duplicates matter, or the items are unhashable.
