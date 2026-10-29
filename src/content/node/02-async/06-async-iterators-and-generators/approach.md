1. Separate producing from consuming: `paginate` hides pages and cursors, and every consumer sees a flat sequence of items.
2. Model the cursor walk as a loop that always runs once: request with `null`, yield the page, follow `nextCursor`, stop on `null`.
3. Rely on the generator's pause at `yield` for laziness and backpressure; never collect pages into an array inside the generator.
4. Let errors propagate: no `try/catch` inside `paginate`, so a failing page rejects the consumer's `next()` and surfaces in its `for await`.
5. In `take`, `break` out of `for await`: the loop calls the source's `return()`, which runs its `finally` blocks and prevents further fetching.
6. `chunk` is a buffer that flushes whenever it is full and once more at the end if anything is left, which is the shape of every batch-insert pipeline.
