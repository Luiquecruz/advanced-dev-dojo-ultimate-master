# TTL, Eviction and Cache Stampede

A cache that never forgets serves stale data and eventually fills the memory of its server. A cache that forgets everything at the same moment sends a flood of requests to the database. This lesson covers the three tools that control a cache's life: time to live, eviction by memory pressure and explicit invalidation. It also covers the failure that appears when a popular entry expires, the cache stampede.

You need: Caching with Spring and Redis, Pessimistic Locking with LockModeType.

## Time to live

A time to live (TTL) is how long an entry stays valid after it is written. It is a safety net: even if some write path forgets to invalidate an entry, the wrong value disappears when the TTL ends. Choose it from the business meaning of staleness, not from a habit. A course catalog may tolerate ten minutes; a seat count for a sold-out concert may tolerate a few seconds.

In Spring you set a default in `RedisCacheConfiguration.entryTtl(Duration)` or `spring.cache.redis.time-to-live`, and override it per cache name when one kind of data needs a shorter life. A `Duration.ZERO` TTL means no expiry in Spring Data Redis, so entries live until evicted: avoid it for anything but tiny fixed data.

## Eviction when memory runs out

TTL is time-based. Eviction is pressure-based. When Redis reaches its configured `maxmemory`, its `maxmemory-policy` decides what happens. With `noeviction`, writes fail with an error. With policies such as `allkeys-lru` or `allkeys-lfu`, Redis removes the least recently or least frequently used keys to make room. For a pure cache, set `maxmemory` and an `allkeys-*` policy, so a full cache degrades gracefully instead of rejecting writes. Do not share that instance with data that must not disappear.

## Invalidation

Three strategies exist, and real systems combine them:

- **By time**: the TTL above.
- **By write**: `@CacheEvict` or `@CachePut` in the code path that changes the data.
- **By event**: another instance or module publishes an event and listeners evict the affected keys, which matters when several services change the same data.

Evict after the transaction commits. If you evict inside the transaction, a concurrent reader can load the old row from the database, repopulate the cache and keep it there until the TTL ends.

## Cache stampede

A cache stampede, also called a thundering herd, happens when a hot entry expires and many requests arrive before anyone has rebuilt it. All of them miss, all of them run the expensive query, and the database receives hundreds of identical requests at once. The query that the cache hid is suddenly under peak load.

Defenses, from simplest to strongest:

1. **Synchronized loading**: `@Cacheable(sync = true)` makes concurrent callers in the same instance wait for one thread to compute the value. It does not coordinate separate instances, so each instance still reloads once.
2. **TTL jitter**: add a random amount to each TTL so keys written together do not expire together. Spring Data Redis lets you provide a `TtlFunction` that computes the TTL per entry.
3. **Refresh before expiry**: rebuild popular entries in the background shortly before they expire, so readers always find a value.
4. **A distributed lock** around the rebuild, when the query is very expensive and several instances compete. It adds complexity and its own failure modes, so use it last.

Related problems have similar fixes. A key that never exists but is requested constantly (cache penetration) can be answered with a short-lived cached "not found" marker. A whole Redis outage should degrade to the database with a timeout and a circuit breaker, not take the API down.

## Common mistakes

- An infinite TTL on every entry, which fills memory and keeps wrong data forever.
- Giving every key the same TTL and the same write time, so they expire together.
- Evicting inside the transaction instead of after commit.
- Assuming `sync = true` protects against a stampede across several instances. It only coordinates the threads of one JVM, so measure the database load when many instances start together.

## In practice

Start with a modest TTL per cache, add jitter to the busiest ones, and watch the hit ratio and the database load at expiry times. Add refresh-ahead or locking only when measurements show a stampede.

## Check yourself

1. What does the TTL protect you from that explicit eviction does not?
2. Why does `sync = true` not remove a stampede across instances?
3. Why should invalidation run after the transaction commits?
