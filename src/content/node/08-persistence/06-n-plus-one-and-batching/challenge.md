`getFeed` currently runs one query for the posts and one more query **per post** for its author: the N+1 problem. Fix it with a DataLoader-style batcher. `createDatabase()` is given: it records every query it runs in `db.queries`, and `findUsersByIds(ids)` returns the users it finds **in storage order**, not in the order of `ids`, and silently omits ids that do not exist (like `WHERE id = ANY($1)`).

## `new DataLoader(batch)`

`batch(keys)` receives an array of keys and resolves with an array of the same length: the value for each key at the same index, or an `Error` instance for a key that failed. `loader.load(key)` returns a promise of that key's value.

1. Every `load` called in the same tick (synchronously, before the next microtask) is dispatched in **one** `batch` call, with keys in the order they were first requested. Schedule the dispatch with `queueMicrotask`.
2. Loading a key that was already requested returns the **same promise** (`loader.load('a') === loader.load('a')`); the key is sent to `batch` once and later loads use the cached promise without calling `batch`.
3. A result that is an `Error` rejects only that key's promise.
4. When `batch` resolves with an array of the wrong length, every promise of that batch rejects with `new Error('DataLoader batch returned <results> results for <keys> keys')`. When `batch` rejects, every promise of the batch rejects with that error.
5. A key whose promise rejected is removed from the cache, so a later `load` of that key calls `batch` again.

## `getFeed(db)`

Returns every post from `db.findPosts()` with an extra `author` property: the user whose `id` is `post.authorId`, or `null` when there is none. Create a `DataLoader` inside `getFeed` (one per request) whose batch function calls `db.findUsersByIds` once and maps the rows back to the order of the keys. The whole feed must take exactly two queries.
