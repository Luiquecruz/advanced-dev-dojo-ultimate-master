1. Declare a private `signal<CartItem[]>([])` as the single source of truth in `CartService`.
2. Expose it with `asReadonly()` so components cannot write to it directly.
3. Derive `count` and `total` with `computed()` from the read-only items.
4. Implement `add` and `remove` with `update()`, always returning new arrays and new item objects.
5. In `CartSummary`, `inject(CartService)` and bind the template to its signals and methods.
6. Render the list with `@for` tracked by `item.id`.
