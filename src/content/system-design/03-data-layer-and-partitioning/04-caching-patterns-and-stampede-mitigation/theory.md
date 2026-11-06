# Caching Patterns & Stampede Mitigation

Putting a cache in front of a database is easy; deciding who fills it, what happens on a write and how it behaves when a hot key expires is where systems break. This lesson names the standard read and write patterns, the invalidation races they invite, the two common eviction policies, and the **cache stampede**: the moment one expired key sends thousands of identical queries to the database at once.

You need: Caching Fundamentals (hit, miss, TTL, the cache is not the source of truth) and Database Replication & Sharding (the database is the bottleneck a cache protects).

## Read patterns

- **Cache-aside** (lazy loading): the application asks the cache; on a miss it reads the database, stores the result in the cache with a TTL and returns it. Only data that is actually read gets cached, and a cache outage degrades to slower database reads instead of errors, as long as the database can take the full load. It is the default in most systems.
- **Read-through**: the same flow, but the cache layer itself (a library or a caching proxy) calls the loader on a miss, so the application only ever talks to the cache.

## Write patterns

- **Write-through**: every write goes to the cache and to the database synchronously before it is acknowledged. Reads after a write are fresh; every write pays both latencies, and data that is never read is cached anyway.
- **Write-behind** (write-back): the write goes to the cache and is acknowledged at once; the cache flushes changes to the database later, often in batches. Writes are fast and the database sees fewer, larger writes, but **acknowledged writes that have not been flushed are lost** if the cache node dies.
- **Write-around**: writes go only to the database and the cache is filled on the next read. Good for data that is written once and rarely read back, such as logs or uploads, so it does not push useful entries out of the cache.

## Invalidation on write

With cache-aside, a write updates the database and then either **updates** or **deletes** the cache key. Deleting is the safer default. If two writers update the database in the order A then B but their cache updates arrive as B then A, an update-based cache holds A's stale value until the TTL expires. A delete leaves nothing stale; the next read reloads the current row.

Deleting still has a smaller race: a reader misses, reads the old row, the writer updates the row and deletes the key, and then the slow reader stores the old row it read. A TTL caps how long such an entry survives, and stricter systems use versions or **leases** (the cache hands out a token on a miss and rejects a store whose token was invalidated by a write in the meantime).

## Eviction: LRU and LFU

When memory is full, the cache must evict something.

- **LRU** (least recently used) evicts the entry untouched for the longest time. It adapts quickly to changing traffic, but one large scan of rarely used keys can push the hot set out.
- **LFU** (least frequently used) evicts the entry with the fewest accesses, usually with counters that decay over time. Popular keys survive scans; a key that was hot yesterday can linger.

Redis implements both as approximations based on sampling: `allkeys-lru` and `allkeys-lfu` consider every key, their `volatile-` variants only keys with a TTL. Its `noeviction` policy rejects writes that need memory once the limit is reached, which is the wrong choice for a pure cache.

## The cache stampede

A product page is read 5,000 times per second and cached with a 60-second TTL. When the entry expires, every request in the next moment misses at once. If loading takes 200 ms, about 1,000 requests run the same expensive query concurrently, the database slows down, loading takes even longer and more requests pile up. This is a **cache stampede**, also called a thundering herd. A related version happens when thousands of keys cached by one batch job all expire in the same second.

Mitigations, usually combined:

- **Request coalescing** (single flight): the first miss starts the load and keeps it as the key's in-flight load (a promise or a future); concurrent misses for the same key wait on it instead of starting their own load. One load per key per process, and a failed load is not cached, so the next request retries.
- **Locks or leases across servers**: coalescing works inside one process. With 50 application servers, a short distributed lock or a cache lease lets only one of them recompute while the others wait briefly or serve the old value.
- **TTL jitter**: add a random amount to each TTL (`ttl + random() * jitter`) so entries written together expire at different moments.
- **Early probabilistic refresh**: each read near the end of the TTL has a small, growing chance to refresh the entry in the background, so a single request usually renews a hot key before it expires.
- **Stale-while-revalidate**: keep serving the expired value for a short grace period while one background refresh runs. HTTP caches support this with `Cache-Control: stale-while-revalidate`.

## Common mistakes

- **Choosing write-behind when no data loss is acceptable.** Write-behind acknowledges a write before the database has it, so a cache node failure loses those writes. Balances, orders and payments need write-through or a database write first.
- **Updating the cache on write instead of deleting it**, which lets concurrent writers leave a stale value behind.
- **Letting every concurrent miss call the database.** One hot key expiring becomes a burst of identical queries; coalesce them into a single load.
- **Caching a failed load**, which serves the error until the TTL expires instead of retrying.

## In practice

Start with cache-aside, a TTL on every key, and delete on write. Add request coalescing for keys that are read concurrently and TTL jitter for anything written in bulk. For the few very hot keys, add stale-while-revalidate or early refresh so they never expire under load. Measure hit rate, database queries per cache miss and load latency, and pick the eviction policy from the access pattern: LRU for recency, LFU for long-lived popularity.

## Check yourself

1. A shopping cart service wants faster writes and proposes write-behind. What failure would lose data, and which pattern avoids it?
2. Why is deleting a cache key on write safer than updating it when two writers race?
3. A hot key expires and 300 requests in one process miss at the same moment. How many database loads should a well-built cache-aside layer start, and how?
