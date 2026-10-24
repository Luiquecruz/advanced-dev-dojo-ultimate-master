The product search in `App.vue` works, but has two bugs. Fix them without changing the template.

1. **Race conditions.** The `query` watcher fetches `/api/products?q=<query>` on every change. Create an `AbortController` per run, pass its `signal` to `fetch`, and abort it with **`onWatcherCleanup`**, so that:
   - typing `m` then `mo` quickly only completes the `mo` request;
   - unmounting the component aborts the pending request.
   Ignore `AbortError` rejections.
2. **Stale count.** `Showing N results` is computed by counting the `<li>` children of the `list` template ref. It always shows the previous count. Make that watcher run **after** the DOM updates (`flush: 'post'`).
