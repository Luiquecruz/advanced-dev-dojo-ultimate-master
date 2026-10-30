The **Dojo Store** works, but its features are only folders: `App.jsx` deep-imports `features/cart/components/CartBadge.jsx` and `features/cart/model/CartContext.jsx`, the catalog reaches into the cart's `model/`, and `formatPrice` is copied in both features. Turn the folders into feature modules **without changing what the user sees**.

**Public APIs**

- `features/catalog/index.js` exports exactly `ProductList`.
- `features/cart/index.js` exports exactly `CartProvider`, `useCart` and `CartBadge`.
- Use explicit named re-exports (`export { Name } from './...'`), not `export *`. Internals such as `fetchProducts`, `CartContext` and `cartReducer` stay private.

**Imports**

- `App.jsx` imports from `./features/catalog` and `./features/cart` (the folder resolves to its `index.js`), never from a file inside a feature.
- A file in one feature reaches another feature only through that feature's index: `ProductList.jsx` gets `useCart` from the cart's public API. Imports inside the same feature stay as they are.

**Shared helper**

- `shared/lib/formatPrice.js` exports `formatPrice(amount)`, returning `$` plus the amount with two decimals (`formatPrice(45)` → `$45.00`).
- Delete both local copies of `formatPrice` and import the shared one. Files in `shared/` never import from `features/`.

**Behavior to keep**: the `Products` list (`<ul aria-label="Products">`) shows each product as `{name} {price}` with an `Add {name}` button, and the badge (`data-testid="cart-badge"`) reads `Cart: {count} · {total}`, e.g. `Cart: 2 · $165.00`.

The tests read the import statements of every file, so they check the structure, not just the behavior.
