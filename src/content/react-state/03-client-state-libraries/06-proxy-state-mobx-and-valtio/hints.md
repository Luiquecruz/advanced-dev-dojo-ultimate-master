There is one bug in `cartStore.js` and three in `App.jsx`, each marked with a `TODO`. Run the tests and match each failing sentence to one of them.
---
MobX: derived data should be a getter, which `makeAutoObservable` turns into a cached `computed`. Delete the `total` field and the manual `this.total += ...` line, then add `get total() { ... }`. A component only reacts to observables when it is wrapped: `export const CartSummary = observer(function CartSummary({ cart }) { ... });`.
---
Valtio: read from the snapshot, write to the proxy. `WishlistCount` should call `useSnapshot(wishlist)` and render `snap.ids.length`; `SaveButton` must call `toggleSaved(wishlist, product.id)`, not `toggleSaved(snap, ...)`, because snapshots are frozen.
