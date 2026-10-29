Implement a bounded cache for API responses, `LruCache<K, V>`, with the classic design: a `Map` from key to `Entry` plus a doubly linked list of entries ordered from least recently used (`head`) to most recently used (`tail`). The `Entry` interface and the fields are given.

```ts
new LruCache<K, V>({ max: number, onEvict?: (key: K, value: V) => void })
```

| Member | Behavior |
| --- | --- |
| constructor | throws a `RangeError` when `max` is less than 1 |
| `get(key): V \| undefined` | returns the value and marks the key as the **most** recently used; `undefined` when missing |
| `set(key, value): this` | inserts or updates the value and marks the key as most recently used. If the cache then holds more than `max` entries, evicts the **least** recently used one and calls `onEvict(key, value)` with it. Updating an existing key never evicts |
| `has(key): boolean` | checks existence **without** changing recency |
| `delete(key): boolean` | removes the entry (no `onEvict`), returns whether it existed |
| `size` (getter) | number of entries |
| `keys(): K[]` | keys ordered from least to most recently used |

Every operation must be `O(1)`. The tests run 200 000 operations on a cache of 10 000 entries and expect them to finish in a fraction of a second. Evicting with `map.keys().next()` is too slow at that size (see the theory), so evict from the head of the list.
