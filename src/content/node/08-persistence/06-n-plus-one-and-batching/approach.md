1. Recognize the N+1 shape: one query for a list, then one query per item inside a loop or `map`. The fix is to collect the ids and fetch them with one `WHERE id = ANY($1)` query.
2. Callers should not have to collect ids by hand, so let each caller ask for one key and let the loader gather the keys that arrive in the same tick.
3. A promise per key plus a shared queue is the whole mechanism: `load` parks the resolver in the queue, a single microtask later the queue is flushed into one batch call.
4. The batch contract (same length, same order) is what makes matching by index possible; the batch function is responsible for reordering rows and filling gaps with `null`, because databases return rows in any order and skip missing ids.
5. Errors have two levels: a per-key `Error` rejects one promise, a broken batch rejects all of them. Remove rejected keys from the cache so a transient failure is not remembered forever.
6. Create the loader per request in `getFeed`: its cache must not outlive the request, or users would see stale or other users' data.
