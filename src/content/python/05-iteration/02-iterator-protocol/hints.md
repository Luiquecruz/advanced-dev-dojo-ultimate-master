A container must not remember where a loop is. Keep the pages on `Paginator`, move `page_index`, `item_index` and `__next__` to a new cursor class, and make `Paginator.__iter__` return a brand-new cursor every time it is called.
---
For `LineReader` the two roles merge: `__iter__` returns `self`. In `__next__`, never return `None` or a "done" flag: when no line is left, raise `StopIteration`. If you keep a list iterator internally, `next()` on it already raises `StopIteration` at the end, and keeps raising it.
---
Both helpers come down to one call: `iter(obj) is obj` for an iterator, `iter(obj) is not obj` for a re-iterable. Wrap the call in `try`/`except TypeError` so `42` and `None` return `False` for both.
