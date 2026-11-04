1. Treat `Pipeline` as a value object: its steps are fixed at construction, calling it reads them, and `then` derives a new value.
2. Decide which built-in tool replaces each hand-written mechanism: `__call__` for `run()`, `singledispatch` for the type checks, `lru_cache` for the memo dict, `cached_property` for the recomputed property.
3. For `render`, start from the fallback and register the most general handler you need; let the class hierarchy route subclasses such as `bool`.
4. Trace the cache sequence USD, EUR, USD, GBP, EUR on paper with a size of two, marking which entry is least recently used before each miss.
5. Access `report.total` twice and look at `vars(report)` to see where `cached_property` stored the value.
