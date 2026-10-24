Build a filterable `ProductList`.

`export default function ProductList({ products, maxPrice })` receives an array of `{ id, name, price, category }` objects and an optional `maxPrice` number.

1. Show only products with `price <= maxPrice`. When `maxPrice` is not passed, show every product.
2. Sort the visible products by **price, ascending**. Do not mutate the `products` prop.
3. Render them in a `<ul>`, one `<li>` per product with the text `Name: $price` (for example `Mouse: $45`).
4. Use the product **`id`** as the `key` of each `<li>`.
5. When no product matches, render `<p>No products found.</p>` instead of the list.

The exported `products` constant holds the sample data from the Dojo API; the preview uses it.
