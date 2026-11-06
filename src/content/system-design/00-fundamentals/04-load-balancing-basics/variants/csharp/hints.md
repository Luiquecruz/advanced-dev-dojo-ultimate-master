Keep the full pool in its original order and a `HashSet<string>` of the names that are down. `MarkDown` adds to the set, `MarkUp` removes from it (`Remove` returns `false` when the name is not there instead of throwing), and `Healthy()` filters the pool with it.
---
Remember the index of the last server returned in the full pool (`_last`, starting at `-1`), not a request counter and not a position in the healthy list: that server may be marked down before the next call. A counter over a list of only the healthy servers jumps to a different server whenever that list shrinks or grows.
---
In `Next()`, try at most `_pool.Count` positions after `_last`: `var index = (_last + step) % _pool.Count;` for `step` from `1` to `_pool.Count`. Return the first one that is not in the down set and store its index in `_last`. If the loop finishes without a match, `throw new InvalidOperationException("no healthy servers")`.
