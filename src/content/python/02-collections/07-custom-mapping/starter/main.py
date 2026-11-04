from collections.abc import MutableMapping


class CaseInsensitiveDict(MutableMapping):
    def __init__(self, initial=()):
        self._data = {}
        # TODO: load `initial` (a mapping or pairs) through self.update.

    # TODO: store entries as {lowercase key: (original key, value)} and implement the five
    # abstract methods: __getitem__, __setitem__, __delitem__, __iter__ (original keys), __len__.

    def __getitem__(self, key):
        return self._data[key]

    def __setitem__(self, key, value):
        self._data[key] = value

    def __delitem__(self, key):
        del self._data[key]

    def __iter__(self):
        return iter(self._data)

    def __len__(self):
        return len(self._data)

    def copy(self):
        # TODO: return a new CaseInsensitiveDict with the same entries.
        return self
