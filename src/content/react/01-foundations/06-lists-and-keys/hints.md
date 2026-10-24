Compute the visible list before the `return`: `const visible = items.filter(...)`. Include every product when `maxPrice === undefined`.
---
`filter` already returns a new array, so you can safely chain `.sort((first, second) => first.price - second.price)` on it. Calling `sort` directly on `items` would mutate the prop.
---
Return early with the empty message when `visible.length === 0`. Then render `visible.map((product) => <li key={product.id}>{product.name}: ${product.price}</li>)`. The `$` before `{` is plain text.
