Build a shopping cart with a Pinia **option store**.

**`store.ts`** — `useCartStore` is defined with the id `"cart"` and a `state` holding `items: CartItem[]` (`{ name, price, quantity }`). Complete it:

1. Getter `count`: the sum of every item's `quantity`.
2. Getter `total`: the sum of `price * quantity`.
3. Action `addItem(name, price)`: if an item with that `name` exists, increment its `quantity`; otherwise push `{ name, price, quantity: 1 }`.
4. Action `removeItem(name)`: remove the item with that `name`.

**`App.vue`** — the add buttons are already there. Add:

1. A `<button>` with the text `Clear cart` that calls the store's built-in `$reset()`.
2. A paragraph `Items: N` showing `count`.
3. A paragraph `Total: $N` showing `total` (for example `Total: $165`).

`main.ts` already installs Pinia through `configureApp(app)`.
