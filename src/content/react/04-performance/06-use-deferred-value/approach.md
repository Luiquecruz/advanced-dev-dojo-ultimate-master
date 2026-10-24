1. Notice that `SearchResults` suspends on every new query, and because `query` changes urgently, React must show the fallback.
2. Create `deferredQuery = useDeferredValue(query)`. On a keystroke React first renders with the old `deferredQuery`, so the list is unchanged and the input updates immediately.
3. Pass `deferredQuery` to `SearchResults`. The background render with the new value suspends, and React keeps the old list on screen instead of the fallback.
4. Derive `isStale` by comparing `query` with `deferredQuery`; no extra state is needed.
5. Expose staleness to users and assistive technology with `aria-busy` and dim the list with `opacity`.
6. When the request resolves, the deferred render commits, `deferredQuery` equals `query` and `isStale` returns to `false`.
