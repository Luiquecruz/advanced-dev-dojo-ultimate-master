Write `mapWithConcurrency(items, limit, fn)`, the core of libraries like `p-map`. It calls `fn(item, index)` for every item and resolves with the results, while never running more than `limit` calls at once.

Requirements:

1. **Order**: the result array matches the input order (`results[i]` is the value of `fn(items[i], i)`), whatever order the tasks finish in.
2. **Limit**: at most `limit` calls are in flight at any moment, and with enough items exactly `limit` run in parallel.
3. **Pool, not batches**: as soon as any task finishes, the next item starts. Do not wait for a whole group to finish.
4. **Fail fast**: when a call rejects, the returned promise rejects with that same error and no **new** items are started afterwards (calls already in flight may finish).
5. **Edge cases**: an empty list resolves with `[]`; a limit larger than the list just runs everything.
6. **Validation**: when `limit` is not an integer of at least `1` (`0`, `-1`, `1.5`), the returned promise rejects with `RangeError('limit must be a positive integer')`.

Press **Run** to watch five tasks share two slots.
