1. Model the cache: a `Map` from path to `{ html, generatedAt, stale }`. Convert the window once: `revalidateSeconds * 1000`, because `now()` returns milliseconds.
2. Write a `storePage(path, html)` helper that saves the HTML with `generatedAt: now()` and `stale: false`. Both the first render and every regeneration use it, so the age restarts after each success.
3. In `get`, branch on the record: no record means `MISS` (await the render, store, return); a fresh record means `HIT`; anything else means `STALE`.
4. For `STALE`, start the regeneration and return the old HTML in the same tick. The caller never waits for the renderer, which is the whole point of stale-while-revalidate.
5. Keep a second `Map` of running regenerations. If the path is already there, do nothing; otherwise store the promise and remove it in `finally`, so concurrent requests share one render and a later request may retry.
6. Swallow regeneration errors with `catch`: the old record stays untouched and the page keeps being served. Only the very first render may reject, because there is nothing to fall back to.
7. `revalidatePath` only flips `stale` on the stored record. The next `get` takes the `STALE` branch, which reuses the same deduplicated regeneration.
