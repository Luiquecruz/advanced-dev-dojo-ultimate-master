from collections.abc import MutableMapping


class CaseInsensitiveDict(MutableMapping):
    def __init__(self, initial=()):
        self._data = {}
        self.update(initial)

    def __getitem__(self, key):
        return self._data[key.lower()][1]

    def __setitem__(self, key, value):
        self._data[key.lower()] = (key, value)

    def __delitem__(self, key):
        del self._data[key.lower()]

    def __iter__(self):
        return (original for original, _ in self._data.values())

    def __len__(self):
        return len(self._data)

    def __repr__(self):
        return f"CaseInsensitiveDict({dict(self.items())!r})"

    def copy(self):
        return CaseInsensitiveDict(self.items())
