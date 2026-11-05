**Question this module answers:** which container fits this data, and what does its type guarantee about order, uniqueness, hashing and mutation?

**You need:** module 01 (names and aliasing, mutable versus immutable, hashing, shallow and deep copies).

## The containers at a glance

| Type | Ordered | Unique | Mutable | Hashable | Typical use |
| --- | --- | --- | --- | --- | --- |
| `list` | yes | no | yes | no | a sequence you build and change |
| `tuple` | yes | no | no | if items are | a fixed record, a dict key |
| `dict` | insertion order | keys | yes | no | lookup by key |
| `set` | no | yes | yes | no | membership, uniqueness, algebra |
| `frozenset` | no | yes | no | yes | a set used as a key |
| `deque` | yes | no | yes | no | a queue with fast ends |

```py
point = (3, 4)                       # a fixed record
roles = {"admin", "editor"}          # uniqueness and fast membership
by_id = {1: "Ada", 2: "Alan"}        # lookup
```

Choosing the type states your intent: a `tuple` says "this record does not change", a `set` says "no duplicates, no order". Dict keys compare by value: two equal tuples are the same key.

## Iterables and iterators

Everything a `for` loop can walk through is an **iterable**: every container above, a string, a `range`, a file. Most can be looped as often as you like. Some can be looped **only once**: a generator, `zip(...)`, `map(...)` and a file object hand out each item one time, and a second loop over them finds nothing.

```py
pairs = zip("ab", [1, 2])
print(list(pairs))   # [('a', 1), ('b', 2)]
print(list(pairs))   # []: the items were already consumed
```

When a function must read its input twice, turn it into a list first. Module 05 explains the iterator protocol behind this.

## Protocols over inheritance

Python collections are defined by **protocols**, sets of special methods, not by base classes you must extend:

- **Sequence**: `__len__` and `__getitem__` give indexing, slicing, iteration, `in` and `reversed`.
- **Mapping**: `__getitem__`, `__iter__` and `__len__`, and `collections.abc.MutableMapping` supplies the rest.
- **Set**: operators `|`, `&`, `-`, `^` and fast membership through hashing.

```py
# implement the protocol and the built-in syntax works
class Deck:
    def __len__(self): ...
    def __getitem__(self, index): ...
```

## What this module covers

Unpacking and star expressions, comprehensions and live dict views, set algebra, implementing the sequence protocol, `collections`, a custom mapping, and text versus bytes. It ends with an ADR on containers and protocols for a shared payload store.

## When to choose it

Use this module whenever you reach for a list "because everything is a list". Pick the container from the questions: do I need order, uniqueness, lookup by key, hashing, or cheap changes at both ends?
