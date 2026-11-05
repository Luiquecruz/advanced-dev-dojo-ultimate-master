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

## How it works

A set stores each item in a slot chosen by the item's hash, so `x in some_set` jumps to one slot instead of comparing `x` with every element, as `x in some_list` must. That is why set members must be hashable: `{[1, 2]}` raises `TypeError: unhashable type: 'list'`. The slot layout has nothing to do with insertion order, so a set is **unordered**: iteration order is not guaranteed.

```py
empty = set()          # {} is an empty dict, not a set
unique = set(["a", "b", "a"])          # {'a', 'b'}
frozen = frozenset({"read", "write"})  # immutable and hashable: a valid dict key
```

`a | b` and `a.union(b)` return **new** sets, but `a |= b` changes `a` in place. Returning one of the input sets hands the caller a reference into your data. `set.intersection(*sets)` with **no** sets raises `TypeError`, so guard the empty case.

## Common mistakes

**Removing duplicates with `list(set(items))` when the order matters.** The duplicates disappear, and so does the order of the items. A dict keeps insertion order and its keys are unique, so it removes duplicates and keeps the first occurrence:

```py
items = [3, 1, 3, 2, 1]
list(set(items))             # wrong: [1, 2, 3], the original order is gone
list(dict.fromkeys(items))   # right: [3, 1, 2]
```

**Writing `{}` for an empty set.** `{}` is an empty dict; `set()` is the empty set.

## When to choose it

- **`set`** for membership tests, uniqueness and comparing groups (permissions, tags, ids).
- **`frozenset`** when the set must be a dict key or a constant.
- **`dict.fromkeys`** when you need uniqueness **and** order.
- **A list** when order and duplicates matter, or the items are unhashable.
