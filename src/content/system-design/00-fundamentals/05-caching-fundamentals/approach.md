1. Treat `load` as the truth and the map as a disposable copy: every path that cannot prove the copy is fresh must go back to `load`.
2. Store the expiry with the value when it is stored, like the session records of Statelessness & Sessions, so freshness is a single comparison with `now()` on every read.
3. Write `get` as two paths: a hit (entry present and fresh) returns at once; everything else is a miss that counts, loads, stores and returns.
4. Count the miss before awaiting the loader, so a failing load is still measured; store only after the loader resolves, so an error is never cached.
5. Make `invalidate` a delete, which turns the next read into a miss through the same path.
6. Derive `hitRatio` in `stats()` from the two counters instead of storing it, and guard the division before any lookup.
