Build the caching core of an ISR server. The "server" is a plain object; the page renderer and the clock are injected so the tests control time.

Export `createIsrServer({ render, revalidateSeconds, now })` (named export) from `App.jsx`:

- `render(path)` returns a promise of the HTML string for `path`.
- `revalidateSeconds` is the lifetime of a page, in **seconds**.
- `now()` returns the current time in **milliseconds** (defaults to `Date.now`).

It returns `{ get(path), revalidatePath(path) }`. `get` returns a promise of `{ html, cache }`, where `cache` is `'MISS'`, `'HIT'` or `'STALE'`:

1. **MISS**: the path was never generated. Await `render(path)`, store the HTML with the time it was generated and return it.
2. **HIT**: the stored page is younger than `revalidateSeconds` and was not invalidated. Return it **without** calling `render`.
3. **STALE**: the page is expired (age of `revalidateSeconds` or more) or invalidated. Return the stored HTML **immediately**, without awaiting, and start a regeneration in the background. When it succeeds, the new HTML replaces the old one and its age restarts, so the following requests are `HIT`s.
   - Only **one** regeneration per path may run at a time, even when many requests arrive together.
   - If a regeneration fails, keep serving the last good HTML (still `STALE`), never reject `get`, and let the next request start a new attempt.

`revalidatePath(path)` marks the stored page of that path as stale, so the next `get` for it answers `STALE` and regenerates. Other paths are not affected.
