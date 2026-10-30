The product catalog calls `fetch` inline with an ad-hoc key, ignores HTTP errors and cannot be refreshed as a whole. Give it a **data access layer**: one API client, one query factory per feature, and components that only consume queries.

Project layout (entry `App.jsx`):

```
App.jsx                              QueryClientProvider + <ProductCatalog />
shared/api/client.js                 API_BASE_URL, ApiError, apiGet
features/products/api.js             productQueries
features/products/ProductCatalog.jsx the screen
features/products/index.js           public API (already done)
```

**`shared/api/client.js`**

- `ApiError` extends `Error`: `new ApiError(status, message)` keeps `status` and sets `name` to `'ApiError'`.
- `apiGet(path)` requests `` `${API_BASE_URL}${path}` `` (`API_BASE_URL` is `'/api'`, so `apiGet('/products')` hits `/api/products`) with an `Accept: application/json` header, returns the parsed JSON, and throws an `ApiError` with the response status when the response is not ok (`apiGet('/error')` rejects with `status` `500`).
- This is the **only** file allowed to call `fetch`.

**`features/products/api.js`**: `productQueries`, built with `queryOptions` and `apiGet`:

- `all()` → `queryOptions` with the root key `['products']` (no `queryFn` needed: it is the root for invalidation).
- `list(searchTerm)` → key that starts with `all().queryKey` and contains the search term, loads `/products?q={searchTerm}`.
- `detail(id)` → key that starts with `all().queryKey` and contains the id, loads `/products/{id}`.

**`features/products/ProductCatalog.jsx`**

- Reads products with `useQuery(productQueries.list(searchTerm))`; no `fetch`, no inline keys.
- Keeps the existing markup: an input labelled `Search products`, `<ul aria-label="Products">` with one `<li>` per product (`Keyboard ($120)`).
- Adds a `Refresh` button that invalidates **every** product query through `productQueries.all().queryKey`.
- When the query fails, renders `<p role="alert">Could not load products (status {status})</p>` using the `ApiError` status.

Tests reach files with `modules['features/products/index.js']` and `modules['shared/api/client.js']`, and check `sources` so that no file except `shared/api/client.js` calls `fetch`.
