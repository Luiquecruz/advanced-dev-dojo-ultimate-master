# Caching Strategies

A cache stores the result of expensive work (a query, an HTTP call, a computation) so the next request gets it cheaply. You already use one on the frontend: TanStack Query keeps server data with a stale time, deduplicates concurrent requests and invalidates after a mutation. Backend caching is the same set of ideas, with two extra difficulties: many processes share the data, and stale data can be wrong for everybody at once.

## Where to cache

| Layer | Example | Shared by |
| --- | --- | --- |
| HTTP | `Cache-Control`, ETags, CDN | every client, before reaching your server |
| In-process memory | a `Map` or LRU in the Node process | requests on one instance only |
| Distributed | Redis / Valkey, Memcached | every instance |
| Database | materialized views, query cache | every query |

In-process caches are the fastest (no network) but each instance has its own copy, so invalidation only reaches one of them. Redis is shared and survives deploys, at the cost of a network hop and serialization.

## Cache-aside (lazy loading)

The most common pattern: the application owns both reads and writes.

```ts
async function getProduct(id: number) {
  const key = `product:${id}`;
  const cached = await redis.get(key);
  if (cached) return JSON.parse(cached);
  const product = await db.findProduct(id);
  await redis.set(key, JSON.stringify(product), { EX: 60 });
  return product;
}

async function updatePrice(id: number, price: number) {
  await db.updatePrice(id, price);
  await redis.del(`product:${id}`);
}
```

Alternatives: **read-through** (the cache library calls the loader for you, as in the challenge), **write-through** (writes update the cache and the database together) and **write-behind** (writes go to the cache and are flushed later, fast but risky).

## TTL: the safety net

Every entry gets a time to live. Invalidation keeps data fresh; the TTL bounds how wrong the cache can be when an invalidation is missed (a bug, a write from another service, a failed `del`). Choose it from the business tolerance: a product description can be minutes old, a stock level for checkout cannot be cached at all. Add a little random jitter to TTLs so thousands of keys written together do not expire together.

## Stampedes and in-flight deduplication

A popular key expires and 500 concurrent requests miss at the same moment: 500 identical queries hit the database, which is exactly when it can least afford it. Fixes:

- **In-flight deduplication** (single flight): keep the pending promise per key, so later callers await the same load. This is what TanStack Query does on the frontend, and what you implement in the challenge. It works per process.
- **A short lock** in Redis (`SET key:lock 1 NX PX 5000`) so one instance refreshes while the others wait or serve stale data.
- **Stale-while-revalidate / early refresh**: refresh before expiry and serve the old value meanwhile.

## The invalidation race

```text
Request A: cache miss → reads price 120 from the DB (slow)
Request B: updates price to 99 → deletes the cache key
Request A: stores 120 in the cache   ← stale until the TTL expires
```

Delete-after-write is not enough when a slow read started before the write. Defenses: only store the result if the load is still the current one (an identity or version check, as in the challenge), version the keys (`product:1:v42`), or keep TTLs short for data that changes often. Also delete **after** the database write commits, not before: deleting first lets a concurrent read put the old value back immediately.

## What not to cache

- Data whose staleness causes harm (balances, permissions, stock at checkout) unless the invalidation is bulletproof.
- Per-user data under a shared key: always include the user or tenant in the key (`cart:user:42`), or one user sees another's data.
- Errors: a cached failure turns a one-second outage into a one-minute outage. Negative caching of "not found" is fine, with a short TTL.

## When to choose it

Cache when measurements show repeated expensive reads of data that tolerates some staleness. Start with HTTP caching for public data, then an in-process cache for small hot data on a single instance, then Redis when several instances must share it. Before adding a cache, check the query: a missing index is a cheaper fix than a cache with an invalidation story. Every cache adds a consistency problem, memory to manage and a new failure mode (what happens when Redis is down? The app should still work, just slower).

## Working with AI

Ask for the cache with its policy stated: "cache-aside in Redis, key `product:<id>`, TTL 60 s with jitter, invalidate after updates commit, deduplicate concurrent misses". Review checklist:

- Every key has a TTL; keys include tenant or user when the data is personal.
- Writes invalidate (or update) every key derived from the changed data, after the commit.
- Concurrent misses are deduplicated or locked for hot keys.
- Errors and partial results are never cached; Redis failures fall back to the database instead of failing the request.
- Cached values are serialized deliberately (dates, `BigInt`, class instances do not survive `JSON.stringify` intact).
