`UserSearch` filters users through `/api/search?q=` and reads the results with `use()` inside a `<Suspense>` boundary. Right now every keystroke replaces the list with the `Searching...` fallback.

Use `useDeferredValue` so the old results stay on screen while new ones load:

- Create `deferredQuery` with `useDeferredValue(query)` and pass it to `SearchResults`.
- Compute `isStale` as `query !== deferredQuery`.
- On the `<div>` that wraps `SearchResults`, set `aria-busy={isStale}` and `style={{ opacity: isStale ? 0.5 : 1 }}`.

Expected behavior:

- The first load shows all five users (the fallback may appear on this first load).
- After typing, the input shows the new text immediately, the previous list stays visible (no `Searching...`) and is marked with `aria-busy="true"` and `opacity: 0.5`.
- When the new results arrive, only matching users are listed and `aria-busy` is no longer `"true"`.

Keep the label text `Search users` and the fallback text unchanged.
