1. Start in `store.js`: every action returns only the keys that change, because `set` shallow-merges into the current state.
2. `addItem` needs the current items, so use `set((state) => ...)`. Branch on whether the product is already in the cart and build a new array in both branches.
3. `removeItem` filters by id; `clear` can use the object form `set({ items: [] })`.
4. Write `selectCount` and `selectTotal` as pure functions of the state so they work both in components and in tests with `getState()`.
5. In `ProductList`, select only the `addItem` action: the list never re-renders when the cart changes.
6. In `CartSummary`, subscribe with `useCartStore(selectCount)` and `useCartStore(selectTotal)`; each returns a number, so `Object.is` comparison is cheap and stable.
