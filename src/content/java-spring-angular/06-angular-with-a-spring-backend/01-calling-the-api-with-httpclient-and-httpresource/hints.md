`httpResource` takes a function that returns the request. Every signal read inside that function becomes a dependency, so changing `query` sends a new request: `httpResource<Product[]>(() => ({ url: '/api/products', params: { q: this.query() } }))`.
---
Pass `{ defaultValue: [] }` as the second argument so `value()` is a `Product[]` instead of `Product[] | undefined`.
---
The resource exposes `isLoading()`, `error()`, `value()` and `reload()`. Check `isLoading()` first, then `error()`, and only then read `value()`: `@else if (products.error()) { ... }`.
---
`getById` is one line with a typed generic and a template string: `this.http.get<Product>(`/api/products/${id}`)`.
