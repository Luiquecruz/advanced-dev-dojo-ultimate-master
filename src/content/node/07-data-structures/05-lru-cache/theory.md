# LRU Cache

A cache trades memory for speed: keep the answer to an expensive question (a slow API call, a rendered page, a user's permissions) so the next request skips the work. In a long-running Node.js server the cache lives as long as the process, so it **must have a bound**. Otherwise it is a memory leak with good intentions.

An **LRU** (least recently used) cache holds at most `max` entries. When a new entry would exceed the limit, it evicts the entry that was used longest ago. The bet is that recently used data is likely to be used again soon, which holds for most web traffic (popular products, active users, current exchange rates).

## Eviction policies

| Policy | Evicts | Good for |
| --- | --- | --- |
| LRU | the least recently read or written entry | general purpose, skewed popularity |
| LFU | the least frequently used entry | stable hot sets; slow to adapt to changes |
| FIFO | the oldest inserted entry | simplicity; ignores popularity |
| TTL | entries older than a duration | data that goes stale (prices, tokens); usually combined with LRU |

Libraries combine them: `lru-cache` supports `max`, `ttl` and `maxSize` in bytes; Redis offers `maxmemory-policy allkeys-lru` server-wide.

## The shortcut: `Map` is already ordered

A `Map` iterates in insertion order, and deleting then re-inserting a key moves it to the end. So the map itself can act as the recency list:

```ts
get(key: K): V | undefined {
  if (!this.map.has(key)) return undefined;
  const value = this.map.get(key)!;
  this.map.delete(key);
  this.map.set(key, value);
  return value;
}

private evictOldest() {
  this.map.delete(this.map.keys().next().value!);
}
```

No pointers, and fine for small caches. It hides a cost, though: in V8 a deleted `Map` entry stays in the table as a hole until the table is rebuilt, and an iterator started from the front walks over every hole. Evicting with `keys().next()` after many deletions therefore costs time proportional to the cache size. Measured on Node 22: about 0.5 µs per eviction at 1 000 entries, 8 µs at 10 000 and 20 µs at 50 000. Big O on paper (`O(1)`) and Big O in the engine are not always the same.

## The classic design: hash map plus doubly linked list

The version that is `O(1)` everywhere, in every engine, combines two structures:

- a **`Map` from key to node** finds an entry without searching;
- a **doubly linked list** keeps the nodes ordered by recency: a hit moves its node to the tail, eviction removes the head.

```ts
interface Entry<K, V> { key: K; value: V; prev: Entry<K, V> | null; next: Entry<K, V> | null }

get(key: K): V | undefined {
  const entry = this.map.get(key);
  if (!entry) return undefined;
  this.unlink(entry);
  this.append(entry);
  return entry.value;
}
```

The node stores its own `key` so that evicting the head can also delete it from the map. This is the linked list from the previous lesson with the `Map` holding the handles, and it is how `lru-cache` works internally (with arrays of indexes instead of objects, to spare the garbage collector).

## Using it for API responses

```ts
const profiles = new LruCache<number, Profile>({ max: 5_000 });

async function getProfile(id: number): Promise<Profile> {
  const hit = profiles.get(id);
  if (hit) return hit;
  const profile = await fetchProfile(id);
  profiles.set(id, profile);
  return profile;
}
```

This is **cache-aside**; the persistence module adds TTLs, invalidation and deduplication of concurrent misses.

## Pitfalls

- **Sizing by count, not bytes.** 5 000 small profiles and 5 000 rendered PDFs are very different amounts of memory. Bound by estimated size when entries vary.
- **Shared mutable values.** `get` returns the stored object itself; a caller that mutates it changes the cache for everyone. Store immutable data or copies.
- **Cleanup on eviction.** Entries that own resources (file handles, sockets) need an `onEvict` hook to release them.
- **One cache per instance.** With four server instances you have four caches with different contents and no shared invalidation. Use Redis when every instance must see the same data or when invalidation must be immediate.
- **Caching per user data under a shared key.** A key such as `'/me'` without the user id leaks one user's data to another. Always include every input that changes the answer in the key.

## Complexity

| Operation | `Map` + linked list | `Map` only (V8) | Array of keys (`indexOf` + `splice`) |
| --- | --- | --- | --- |
| `get` (hit, refresh) | `O(1)` | `O(1)` | `O(n)` |
| `set` with eviction | `O(1)` | grows with `max` (holes) | `O(n)` |
| memory | `O(max)` | `O(max)` | `O(max)` |

## When to choose it

Use an in-process LRU for read-heavy data that is expensive to compute or fetch, tolerates slight staleness, and is fine to differ between instances: configuration, feature flags, external API lookups, compiled templates. Add a TTL when data changes over time. Use Redis (or a CDN for public responses) when the cache must be shared, survive restarts or be invalidated everywhere at once. Do not cache at all when the source is already fast (an indexed primary key lookup) or when correctness requires fresh data (balances, stock levels during checkout).

## Working with AI

Ask for "an LRU cache bounded at N entries with `O(1)` operations (map plus doubly linked list)" or, better, ask the assistant to use `lru-cache` with explicit `max` and `ttl`. Review for:

- A module-level `Map` or object used as a cache with no bound.
- Recency tracked with an array (`indexOf`, `splice`, `shift`).
- Cache keys missing an input (user id, locale, query params).
- Mutable cached objects returned directly to callers.
- No TTL on data that changes, and no invalidation when the source is updated.
