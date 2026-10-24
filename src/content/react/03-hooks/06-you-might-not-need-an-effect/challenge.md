`ProductSearch` works, but it uses two Effects that it does not need. Refactor it so it renders once per interaction and has **no `useEffect` at all**.

Props: `products` (array of `{ id, name }`) and `onSearch(query)`.

Requirements:

- Remove the `visible` state: compute the filtered list during render. A product matches when its `name` includes the query, case-insensitive.
- Keep the `<p>{count} results</p>` and the `<li>` per visible product.
- Call `onSearch(newQuery)` from the input's change handler. It must **not** be called on mount.
- The first mount must produce a single commit, and typing one character a single commit (the tests count commits with `<Profiler>`).
- Keep the input labelled `Search`.
