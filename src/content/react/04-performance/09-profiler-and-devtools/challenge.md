Measure renders programmatically with `<Profiler>`.

**1. `createRenderLog()`** (named export) returns `{ entries, onRender, summary }`:

- `onRender(id, phase, actualDuration, ...)` pushes `{ id, phase, actualDuration }` into `entries` (exactly those three keys).
- `summary()` returns an object keyed by profiler id: `{ [id]: { mount, update } }`. A `"mount"` phase counts as `mount`; `"update"` and `"nested-update"` count as `update`.

**2. `App`** (default export) receives an `onRender` prop and must:

- Wrap `<Sidebar />` in `<Profiler id="Sidebar" onRender={onRender}>`.
- Wrap `<Feed />` in `<Profiler id="Feed" onRender={onRender}>`.

Expected: mounting reports a `mount` for both ids, and clicking **Like (0)** in the feed reports exactly one `update`, for `Feed` only.
