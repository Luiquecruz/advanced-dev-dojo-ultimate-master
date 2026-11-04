class Deck:
    def __init__(self, cards):
        self._cards = list(cards)

    def __len__(self):
        return len(self._cards)

    def __getitem__(self, index):
        if isinstance(index, slice):
            return Deck(self._cards[index])
        if not isinstance(index, int):
            raise TypeError(f"Deck indices must be integers or slices, not {type(index).__name__}")
        return self._cards[index]

    def __repr__(self):
        return f"Deck({self._cards!r})"
