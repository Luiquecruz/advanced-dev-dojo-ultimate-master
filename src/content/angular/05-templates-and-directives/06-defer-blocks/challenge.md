`ProductPage` (selector `app-product-page`) currently loads `Reviews` and `Recommendations` eagerly. Defer them.

1. Keep the `<button #reviewsTrigger>Show reviews</button>`.
2. **First** `@defer` block renders `<app-reviews />`, triggered **on interaction** with `reviewsTrigger` and **prefetched on idle**:
   - `@placeholder`: `<p>Reviews will load when you click.</p>`
   - `@loading (minimum 200ms)`: `<p>Loading reviews...</p>`
   - `@error`: `<p>Could not load reviews.</p>`
3. **Second** `@defer` block renders `<app-recommendations />` **on idle**, with `@placeholder`: `<p>Recommendations coming soon</p>`.

The order of the blocks matters: tests drive them with `fixture.getDeferBlocks()`.
