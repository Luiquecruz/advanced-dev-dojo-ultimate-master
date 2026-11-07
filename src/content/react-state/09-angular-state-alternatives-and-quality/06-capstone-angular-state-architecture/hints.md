Start with `signalStore({ providedIn: 'root' }, withState<ShopState>({ status: 'idle', products: [], category: 'all', quantities: {} }), ...)` and add `withComputed` for `visible`, `lines`, `total`, `itemCount`.
---
Inside `withMethods((store, fetchProducts = inject(FETCH_PRODUCTS), storage = inject(CART_STORAGE)) => ({ ... }))` write one private-looking helper `persist()` and call it from `add` and `remove`. `patchState(store, (state) => ({ quantities: { ...state.quantities, [id]: (state.quantities[id] ?? 0) + 1 } }))` keeps updates immutable.
---
Restore in `withHooks((store, storage = inject(CART_STORAGE)) => ({ onInit() { patchState(store, { quantities: readQuantities(storage) }); } }))` where `readQuantities` wraps `JSON.parse` in `try/catch` and keeps only entries whose key and value are positive integers.
