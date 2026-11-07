Load a product with `resource`. **`product.ts`** exports the token `FETCH_PRODUCT` (`(id: number, signal: AbortSignal) => Promise<Product>`), the `Product` interface `{ id: number; name: string }` and `ProductDetail` (`@Injectable({ providedIn: 'root' })`).

1. `id` is a writable `signal<number | null>(1)`.
2. `product` is a `resource` whose `params` follow `id` and whose loader calls the injected fetch function with the id and the `abortSignal`. When `id` is `null`, `params` returns `undefined` so nothing is loaded.
3. `title` is a `computed`: the product name when the resource has a value, otherwise `'Loading...'`.
4. `select(id: number | null)` sets the id. `reload()` reloads the resource.
