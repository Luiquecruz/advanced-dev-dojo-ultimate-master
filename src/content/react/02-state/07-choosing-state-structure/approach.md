1. Remove the `total` state and every `setTotal` call; compute `total` with `reduce` during render.
2. Replace `selectedItem` state with `selectedId` and select by id.
3. Derive `selectedItem` with `items.find`, so it always reflects the latest quantity and becomes `undefined` after a removal.
4. Optionally merge `increase` and `decrease` into one `changeQuantity(id, delta)` that maps and then filters out zero quantities.
