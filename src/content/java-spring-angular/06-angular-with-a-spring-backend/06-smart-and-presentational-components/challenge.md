Split a product screen into a presentational component and a container. The project has one file, `app.ts`, with the `Product` type, the container template and `appConfig` already written.

**`ProductCard`** (selector `app-product-card`, presentational)

1. Inputs: `product` (required `Product`) and `selected` (boolean, default `false`). Output: `add`, emitting the `Product`.
2. Template: an `<article>` that has the class `selected` while `selected()` is `true`, an `<h3>` with the product name, a `<p>` with the price formatted by the `currency` pipe (`120` renders as `$120.00`) and a `<button type="button">` labelled `Add <name>` that emits the product through `add`.
3. It receives data and reports events only: no `HttpClient`, no service, no constructor injection.

**`ProductsPage`** (selector `app-products-page`, container)

4. `products` is an `httpResource<Product[]>` for `GET /api/products` that starts with an empty array.
5. `cart` is a `Product[]` signal and `total` a computed sum of the prices in the cart. `addToCart(product)` appends the product once: adding one that is already in the cart does nothing. `isInCart(id)` tells whether the cart holds it.
