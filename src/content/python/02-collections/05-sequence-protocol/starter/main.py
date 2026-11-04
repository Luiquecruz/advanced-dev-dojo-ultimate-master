class Deck:
    def __init__(self, cards):
        self._cards = list(cards)

    def __len__(self):
        return len(self._cards)

    # TODO: implement __getitem__ so that indexes (including negative), slices (returning a Deck)
    # and iteration, `in` and reversed() all work. Do not define __iter__.
