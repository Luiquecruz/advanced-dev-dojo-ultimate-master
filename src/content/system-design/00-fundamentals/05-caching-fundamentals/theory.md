# Caching Fundamentals

The fastest request is the one that never reaches the database. A cache keeps a copy of data that is expensive to fetch in a place that is cheap to read, so most requests are answered from the copy. This lesson explains why that works (the distances between memory, disk and network), how to measure it (hits, misses, hit ratio) and the price you pay for it: a copy can be out of date.

You need: Statelessness & Sessions, Database Basics: SQL vs NoSQL, Load Balancing Basics.

## Why caching works: latency orders of magnitude

Where data sits decides how long it takes to read. Rough figures that every designer keeps in mind:

| Read | Typical latency |
| --- | --- |
| main memory (RAM) | about 100 nanoseconds |
| solid-state disk (SSD), random read | tens to 100 microseconds |
| round trip inside one data center | about 0.5 milliseconds |
| spinning disk seek | about 10 milliseconds |
| round trip across continents | about 150 milliseconds |

From the first row to the last, the gap is about a million times. A database query adds a network round trip, query work and often a disk read, so a few milliseconds is common. Reading the same answer from the server's own memory is thousands of times faster; a store like Redis, one short round trip away, is still several times faster and spares the database the work. Most workloads also read the same small set of items again and again (popular products, the home page, a user's own profile), which is what makes a small cache useful.

## Hits, misses and hit ratio

A lookup that finds the key in the cache is a **hit**; one that does not is a **miss** and must fetch from the slower source. The **hit ratio** (also called the hit rate) is `hits / (hits + misses)`. It is the number that tells you whether a cache earns its place: at 0.9, nine of ten requests skip the database, and the database sees a tenth of the traffic. At 0.1, the cache adds a lookup to nearly every request and saves almost nothing.

## Read-through and TTL

In a **read-through** cache, the code asks the cache for a key, and the cache itself calls a **loader** on a miss: it fetches from the source (a database query, another service), stores the result and returns it. Callers only ever talk to the cache.

Every entry gets a **time-to-live** (TTL). A value stored at time `t` with a TTL of 60 seconds is served from memory until `t + 60 s`; the first read after that is a miss and loads a fresh copy. The TTL is the maximum **staleness** you accept: for up to 60 seconds after the source changes, readers may still see the old value. A product description can be minutes old; an account balance shown before a payment cannot.

## Invalidation

Waiting for the TTL is the simplest way to refresh data. When you know the source changed (your own code just updated the row), you can **invalidate** the key: delete it from the cache, so the next read is a miss that loads the new value. Invalidation is famously hard because every code path that changes the data must remember to do it, which is why a TTL stays as a safety net even when you invalidate.

Memory is limited, so caches also **evict** entries when full, usually the least recently used ones. An evicted key is simply a miss.

## The cache is not the source of truth

A cache may lose any entry at any moment: eviction, expiry, a restart, a new server behind the load balancer with an empty local cache. Data that exists only in the cache can vanish. The source of truth is the database or service behind the loader; the cache is a disposable copy that can always be rebuilt from it. Write to the source, then invalidate or let the TTL expire, and never answer "not found" just because the cache missed.

## Common mistakes

- **Using the cache as the primary store.** Writing data only to the cache, or never reloading from the source, loses it on the next eviction or restart; the database is the truth, the cache a copy.
- **No TTL.** Without expiry, a missed invalidation keeps a wrong value forever.
- **Caching failures as values.** A loader error stored in the cache turns one outage into minutes of errors after the source has recovered.
- **Ignoring the hit ratio.** A cache nobody measures may cost more lookups than it saves.

## In practice

Cache data that is read far more often than it changes, choose the TTL by how stale each kind of data may be, and invalidate on your own writes. Put a shared cache behind stateless servers so every copy benefits from the same entries, and watch the hit ratio on a dashboard.

## Check yourself

1. A cache reports 300 hits and 100 misses. What is the hit ratio, and how many of those requests reached the database?
2. A price changes in the database, and the cached entry has a 5-minute TTL with no invalidation. How long can readers see the old price?
3. The cache server restarts and is empty. Why must the application keep working, only slower?
