Build a product typeahead. `ProductApi` and `appConfig` are already written.

**`searchProducts(queries$, search, debounceMs = 300)`** in `app.ts`

Return `queries$` piped through operators so that:

1. Values are debounced by `debounceMs` (`debounceTime`).
2. Queries are trimmed, and a query equal to the previous one is ignored (`distinctUntilChanged`).
3. Queries shorter than 2 characters emit `[]` **without** calling `search`.
4. Other queries call `search(query)`, and a newer query cancels the pending search (`switchMap`).

**`ProductSearch` component** (selector `app-product-search`)

1. Push every value of the `<input aria-label="Search products">` into the `queries` Subject.
2. The list already renders `results()`, built with `searchProducts` and `toSignal`.
