Keep the full pool in its original order and a `Set` of the names that are down. `markDown` adds to the set, `markUp` deletes from it, and `healthy()` filters the pool with it.
---
Remember the index of the last server returned in the full pool (`last`, starting at `-1`), not a request counter and not a position in the healthy list: that server may be marked down before the next call. A counter over a list of only the healthy servers jumps to a different server whenever that list shrinks or grows.
---
In `next()`, try at most `pool.length` positions after `last`: `const index = (last + step) % pool.length` for `step` from `1` to `pool.length`. Return the first one that is not in the down set and store its index in `last`. If the loop finishes without a match, `throw new Error('no healthy servers')`.
