1. List what the syntax needs: a length, an index lookup, and a slice case.
2. Copy the input into a private list so the caller cannot change the deck.
3. In `__getitem__`, branch on `slice`, then on `int`, otherwise raise `TypeError`.
4. Rely on the inner list for negative indexes and `IndexError`.
5. Check iteration, `in` and `reversed` without adding `__iter__`.
