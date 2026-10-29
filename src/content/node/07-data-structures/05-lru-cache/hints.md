Write two private helpers first: `unlink(entry)` removes an entry from the list (fixing `head`/`tail` at the edges) and `append(entry)` attaches it at the tail. Every public method is a combination of these two plus a `Map` operation.
---
"Mark as most recently used" is `unlink(entry)` followed by `append(entry)`. `get` does it on a hit; `set` does it when the key already exists (after updating `entry.value`), and simply appends a new entry otherwise.
---
After appending a new entry, if `entries.size > max`, the least recently used entry is `this.head`. Unlink it, delete `oldest.key` from the map (this is why entries store their key) and call `this.onEvict?.(oldest.key, oldest.value)`.
---
`delete` must unlink the entry before removing it from the map, or the list keeps a dangling node that `keys()` would still return. `keys()` walks `for (let entry = this.head; entry; entry = entry.next)`.
