1. Start from cache-aside: look in the cache, on a miss load from the source and store the result. Store the time of the load with the value so freshness is a subtraction against an injected clock.
2. A cache stampede happens when many requests miss at once and all hit the database. Store the pending promise per key, so later callers attach to the same load.
3. Decide what failures mean: an error is not a value, so it is never stored, and the in-flight slot is freed so the next caller retries.
4. Invalidation has a race: a slow load that started before a write can finish after the invalidation and put the old value back. Guard the store step with an identity check on the in-flight promise, and make `invalidate` remove that promise.
5. In the service, the cache key is part of the contract (`product:<id>`), reads go through `getOrLoad`, and writes go to the source first and invalidate second, so a failed write never drops a good entry and the next read sees the new data.
