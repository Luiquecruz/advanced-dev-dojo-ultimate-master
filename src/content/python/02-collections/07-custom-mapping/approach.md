1. Decide the internal representation: normalized key to `(original key, value)`.
2. Implement the five required methods, normalizing the key at every entry point.
3. Return an iterator over the original-cased keys from `__iter__` so `items()` and `list(d)` show what was written.
4. Let the constructor reuse `update`, which the ABC already provides.
5. Check that `get`, `pop`, `setdefault`, `in` and `update` behave case-insensitively without custom code.
