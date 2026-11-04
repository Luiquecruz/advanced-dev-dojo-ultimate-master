Python does not ask a class to extend `list` to behave like one. If the class implements the **sequence protocol**, built-in syntax works with it.

```py
class Deck:
    def __init__(self, cards):
        self._cards = list(cards)

    def __len__(self):
        return len(self._cards)

    def __getitem__(self, index):
        return self._cards[index]

deck = Deck(["A", "K", "Q", "J"])
len(deck)          # 4
deck[0]            # 'A'
deck[-1]           # 'J'
deck[1:3]          # ['K', 'Q']   a plain list, because the slice went to the inner list
for card in deck:  # works without __iter__
    ...
"Q" in deck        # True
list(reversed(deck))
```

Two methods unlock indexing, negative indexes, slicing, iteration, `in` and `reversed`. Python's iteration falls back to calling `__getitem__(0)`, `__getitem__(1)`... until `IndexError`.

## Slices are objects

`deck[1:3]` calls `__getitem__(slice(1, 3, None))`. The method receives a `slice` object and decides what to return. Passing it to the inner list is the simplest way to support the full slicing syntax, including steps and negative bounds.

```py
def __getitem__(self, index):
    if isinstance(index, slice):
        return Deck(self._cards[index])   # a slice of a Deck is a Deck
    return self._cards[index]             # ints, negatives, IndexError for free
```

## `collections.abc.Sequence`

Inheriting `Sequence` and implementing `__len__` and `__getitem__` adds `__contains__`, `__iter__`, `__reversed__`, `index` and `count`, and makes `isinstance(deck, Sequence)` true. A class that only implements the protocol is **not** a `Sequence` for `isinstance`: unlike `Iterable` or `Sized`, the `Sequence` ABC has no structural check, so you inherit it or call `Sequence.register(Deck)`.

## Coming from TypeScript and JavaScript

```ts
class Deck extends Array<string> {}   // inherits everything, including things you do not want
```

- JavaScript classes extend `Array` or expose an iterator. Python classes implement the **protocol** and need no base class.
- Index syntax is a method call (`__getitem__`), so negative indexes and slices are your responsibility, not a built-in array feature.
- A `list` subclass is possible but fragile: methods like `copy` or slicing return plain lists, not your type.

## Pitfalls

- Raise `IndexError` for out-of-range integers (the inner list does that). Iteration relies on it to stop: a `__getitem__` that never raises makes `for` loop forever.
- `reversed()` needs both `__len__` and `__getitem__`; plain iteration needs only `__getitem__`.
- Raise `TypeError` for other index types instead of returning garbage.
- Do not mutate the list you were given; copy it in `__init__`.

## When to choose it

- **Implement the protocol** when your class is a read-only or custom-storage sequence (a paginated result, a deck, a ring buffer).
- **Inherit `Sequence`** when you also want `index`, `count` and `isinstance` checks.
- **Subclass `list`** only when you really need every list method and accept the pitfalls.
- **A plain `list` or `tuple`** when nothing about the behavior is special.
