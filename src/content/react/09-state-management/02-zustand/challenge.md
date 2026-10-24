Build a shopping cart whose state lives in a **Zustand** store shared by two sibling components, without props or a provider.

**`store.js`**

- Export `useCartStore`, created with `create` from `zustand`, with this state:
  - `items`: starts as `[]`. Each item is `{ id, name, price, quantity }`.
  - `addItem(product)`: adds `{ ...product, quantity: 1 }`, or increments `quantity` when an item with the same `id` already exists.
  - `removeItem(id)`: removes the item with that `id`.
  - `clear()`: empties `items`.
- Export two selectors (plain functions of the state):
  - `selectCount(state)`: the sum of every item's `quantity`.
  - `selectTotal(state)`: the sum of `price * quantity`.

**`App.jsx`**

- `ProductList` renders one button per product with the text `Add {name}` (for example `Add Keyboard`) that calls `addItem(product)`.
- `CartSummary` renders:
  - `<p data-testid="cart-count">Items: {count}</p>` using `useCartStore(selectCount)`
  - `<p data-testid="cart-total">Total: ${total}</p>` using `useCartStore(selectTotal)`
  - a `Clear cart` button that calls `clear()`
- Read actions with an inline selector, for example `useCartStore((state) => state.addItem)`.

All state updates must be immutable: return new arrays and objects from `set`.
