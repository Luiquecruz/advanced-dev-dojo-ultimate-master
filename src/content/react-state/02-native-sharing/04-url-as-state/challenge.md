The product catalog keeps its filters in `useState`, so reloading loses them, links cannot be shared and the back button does nothing useful. Move the filters into the **URL search params** with `useSearchParams` from `react-router`. The tests render `ProductCatalog` inside a data router and inspect `router.state`.

**`parseFilters(searchParams)`** (named export): returns `{ q, category, sort }`.

- `q`: the `q` param or `''`.
- `category`: `'all' | 'hardware' | 'software'`; anything else falls back to `'all'`.
- `sort`: `'name' | 'price-asc' | 'price-desc'`; anything else falls back to `'name'`.

**`ProductCatalog`** (named export):

1. Derive the filters from the URL with `parseFilters`. No `useState` for filters.
2. Write `updateFilter(key, value, options)` using the **functional** form of `setSearchParams`, so other params are kept. When the value equals its default (`''`, `'all'`, `'name'`), **delete** the param instead of setting it.
3. `Category` and `Sort by` selects push a new history entry. The `Search` input uses `{ replace: true }`.
4. `Clear filters` removes every param.

Keep the controls (`Search`, `Category`, `Sort by`), the `<p data-testid="result-count">{n} products</p>` and one `<li>` per visible product (filtered by category and by name, case-insensitive, then sorted).
