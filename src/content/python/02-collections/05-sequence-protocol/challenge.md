Implement a `Deck` class in `main.py` that behaves like a read-only sequence **without defining `__iter__`** and without inheriting from `list`.

## `Deck(cards)`

- Copies `cards` into its own list.
- `len(deck)` returns the number of cards.
- `deck[i]` returns a card for any valid integer index, including negative ones. An out-of-range index raises `IndexError`.
- `deck[a:b]` (any slice) returns a **new `Deck`** with the selected cards.
- Any other index type (for example a string) raises `TypeError`.
- `for card in deck`, `card in deck` and `reversed(deck)` work through the protocol alone.

The tests also read your source: it must not define `__iter__`.
