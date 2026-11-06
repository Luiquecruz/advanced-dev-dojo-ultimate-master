Keep the full pool in its original order and a `set` of the names that are down. `mark_down` adds to the set, `mark_up` removes from it with `discard` (no error when the name is not there), and `healthy()` filters the pool with it.
---
Remember the index of the last server returned in the full pool (`self._last`, starting at `-1`), not a request counter and not a position in the healthy list: that server may be marked down before the next call. A counter over a list of only the healthy servers jumps to a different server whenever that list shrinks or grows.
---
In `next()`, try at most `len(self._pool)` positions after `self._last`: `index = (self._last + step) % len(self._pool)` for `step` in `range(1, len(self._pool) + 1)`. Return the first one that is not in the down set and store its index in `self._last`. If the loop finishes without a match, `raise RuntimeError("no healthy servers")`.
