Each action calls `set`. Use the functional form `set((state) => ({ items: ... }))` because the new items depend on the current ones.
---
In `addItem`, look for an existing item with `state.items.find`. If found, `map` over the items and return a copy with `quantity + 1`; otherwise return `[...state.items, { ...product, quantity: 1 }]`.
---
Selectors are reducers over the array: `state.items.reduce((sum, item) => sum + item.price * item.quantity, 0)`.
---
In the components: `const addItem = useCartStore((state) => state.addItem);` then `onClick={() => addItem(product)}`, and `const total = useCartStore(selectTotal);`.
