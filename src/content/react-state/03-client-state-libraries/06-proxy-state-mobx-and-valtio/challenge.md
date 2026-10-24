**Fix the bugs.** A small shop keeps its cart in a **MobX** store and its wishlist in a **Valtio** proxy. It compiles, but four classic proxy-state mistakes break it. Find and fix them without changing the public API.

**`cartStore.js`** (MobX)

- `CartStore` keeps `items` (`{ id, name, price, quantity }`) and exposes `count` and `total` as **computed getters** (`isComputedProp(cart, 'total')` must be `true`). `total` must stay correct after `remove(id)`.
- `add(product)` adds `quantity: 1` or increments an existing line; `remove(id)` removes a line. `createCartStore()` returns a new store.

**`wishlist.js`** (Valtio, already correct)

- `createWishlist()` returns `proxy({ ids: [] })`; `toggleSaved(wishlist, id)` mutates the proxy.

**`App.jsx`**

- `CartSummary({ cart })` shows `Items: {count}` (`data-testid="cart-count"`), `Total: ${total}` (`data-testid="cart-total"`) and a `Remove {name}` button per line. It must update whenever the store changes, including changes made outside React.
- `SaveButton({ wishlist, product })` renders `Save {name}` with `aria-pressed` reflecting whether the product is saved, and toggles it on click.
- `WishlistCount({ wishlist })` renders `Saved: {n}` (`data-testid="saved-count"`) and re-renders when the wishlist changes.
- `Shop({ cart, wishlist })` (done) renders an `Add {name}` button and a `SaveButton` per product, plus the two summaries. Tests pass fresh stores created with the factories.
