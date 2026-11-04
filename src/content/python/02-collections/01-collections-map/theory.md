**Question this module answers:** which container fits this data, and what does its type promise about order, uniqueness, hashing and mutation?

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

## Protocols over inheritance

Python collections are defined by **protocols**, sets of special methods, not by base classes you must extend:

- **Sequence**: `__len__` and `__getitem__` give indexing, slicing, iteration, `in` and `reversed`.
- **Mapping**: `__getitem__`, `__iter__` and `__len__`, and `collections.abc.MutableMapping` supplies the rest.
- **Set**: operators `|`, `&`, `-`, `^` and fast membership through hashing.

```ts
// TypeScript: extend Array or wrap an object with a Proxy
class Deck extends Array<string> {}
```

```py
# Python: implement the protocol and the built-in syntax works
class Deck:
    def __len__(self): ...
    def __getitem__(self, index): ...
```

## Coming from TypeScript and JavaScript

- `Array` does everything; Python splits it into `list`, `tuple`, `deque`. Choosing the type states your intent.
- `Map` and plain objects become one `dict`, keyed by value (hashable keys), not by reference.
- `Set` has operators in Python; JavaScript added set methods only recently.
- Strings are Unicode text, and `bytes` is a separate type for data.

## What this module covers

Unpacking and star expressions, comprehensions and live dict views, set algebra, implementing the sequence protocol, `collections`, a custom mapping, and text versus bytes. It ends with an ADR about choosing containers and protocols for a shared payload store.

## When to choose it

Use this module whenever you reach for a list "because everything is a list". Pick the container from the questions: do I need order, uniqueness, lookup by key, hashing, or cheap changes at both ends?
