Implement a case-insensitive dictionary for HTTP headers in `main.py`.

## `CaseInsensitiveDict(MutableMapping)`

Subclass `collections.abc.MutableMapping`; do **not** subclass `dict`.

- `d["Content-Type"]`, `d["content-type"]` and `d["CONTENT-TYPE"]` read the same entry. Assigning with a different case replaces that entry.
- Iteration yields each key in the **original case of its latest assignment**, in the order the entries were first inserted: re-assigning `"a"` after `"A"` and `"B"` keeps it first. `len` counts entries once.
- Deleting works with any case and a missing key raises `KeyError`.
- The constructor accepts an optional mapping or iterable of pairs, like `dict(...)`: `CaseInsensitiveDict({"Accept": "*/*"})`.
- `copy()` returns a new `CaseInsensitiveDict` with the same entries.
- Because you inherit from the ABC, `get`, `pop`, `setdefault`, `update` and `in` must also be case-insensitive without extra code.
