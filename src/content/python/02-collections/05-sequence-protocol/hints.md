`__len__` and `__getitem__` are enough. Python builds iteration, `in` and `reversed` from them. Store the cards in a list you own (`list(cards)`).
---
In `__getitem__`, check `isinstance(index, slice)` first. A slice can be applied to the inner list directly, and you wrap the result in `Deck(...)`.
---
For integers return `self._cards[index]`: negative indexes and `IndexError` come for free. Reject everything else with `TypeError`.
