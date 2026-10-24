1. Turn `itemCount` and `subtotal` into `computed()` signals that reduce over `items()`.
2. Build `tax` from `subtotal()` and `taxRate()`, and `total` from `subtotal()` and `tax()`. Computed signals can depend on other computed signals.
3. Implement `add` with `items.update`, mapping to a new object for the matching item or appending a new one. Never `push` or mutate.
4. Implement `remove` with `filter` inside `update`.
5. In the constructor, register one `effect()` that reads `itemCount()` and `items()` and writes to `document.title` and `localStorage`: the outside world, which is what effects are for.
