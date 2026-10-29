1. Split the two jobs: the `Map` answers "where is this key?" in `O(1)`, the doubly linked list answers "which key is the oldest?" in `O(1)` (its head).
2. Write `unlink` and `append` once, handling the empty list and the edge nodes, so the public methods never touch pointers directly.
3. `get`: look up the entry, return `undefined` on a miss, otherwise move the entry to the tail and return its value.
4. `set`: when the key exists, update the value and move it to the tail; there is no new entry, so nothing to evict. Otherwise create an entry, store it in the map, append it, and evict the head if the map grew past `max`.
5. Store the key inside each entry: eviction starts from a list node and must delete the matching map key.
6. Keep `has` as a plain map check (no recency change), make `delete` unlink before removing from the map, and build `keys()` by walking from head to tail.
7. Validate `max` in the constructor so the cache can always hold at least one entry.
