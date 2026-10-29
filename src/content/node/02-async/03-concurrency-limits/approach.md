1. Validate the input first: a limit of `0` would start no workers and the promise would resolve with holes or hang, so reject it with a `RangeError` (inside an `async` function a `throw` becomes a rejection).
2. Preallocate the results array and always write by index; completion order then stops mattering.
3. Model the pool as N worker loops sharing a cursor. A worker that finishes an item immediately claims the next one, which is what keeps every slot busy.
4. Spawn only as many workers as there are items, so a large limit on a short list does no extra work.
5. Wait for the workers with `Promise.all`: it resolves when every worker ran out of items and rejects as soon as one worker throws.
6. Add a shared `failed` flag so the remaining workers stop claiming new items after the first error, then return the results.
