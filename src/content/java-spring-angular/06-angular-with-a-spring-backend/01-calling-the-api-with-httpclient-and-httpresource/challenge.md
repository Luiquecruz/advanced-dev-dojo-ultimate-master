Connect a product list to the REST API with a typed `HttpClient` call and an `httpResource`. The project has one file, `app.ts`.

**`ProductService`** (provided in root)

1. `getById(id: number): Observable<Product>` sends `GET /api/products/<id>` and types the response as `Product`.

**`ProductList`** (selector `app-product-list`)

2. `products` is an `httpResource<Product[]>` that sends `GET /api/products` with the query parameter `q` taken from the `query()` signal, so typing in the **Search** box refetches. It starts with an empty array.
3. While the request is pending the template shows `<p role="status">Loading products…</p>` (already written).
4. When the request fails, show `<p role="alert">Could not load products</p>` and a **Retry** button that calls `products.reload()`. Put this branch before the list: reading `value()` in the error state throws.

`appConfig` already calls `provideHttpClient()`. `HttpClient` is injectable without it; the call is where features such as interceptors are configured.
