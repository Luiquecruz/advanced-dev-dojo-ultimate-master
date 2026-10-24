Build a shopping cart backed by a signal service. The project has two files.

**`cart.ts`** exports `CartService` (`@Injectable({ providedIn: 'root' })`) and the `CartItem` interface `{ id: number; name: string; price: number; quantity: number }`.

1. Keep the items in a **private** writable signal and expose them as `items`, a read-only signal created with `asReadonly()` (it must not have a `set` method).
2. `count`: a `computed` with the sum of all quantities.
3. `total`: a `computed` with the sum of `price * quantity`.
4. `add(product: { id: number; name: string; price: number })`: appends the product with `quantity: 1`, or increases the quantity when the id is already in the cart. Always produce a **new array**.
5. `remove(id: number)`: removes the item with that id.

**`app.ts`** exports the `CartSummary` component (selector `app-cart-summary`) that injects `CartService` and renders:

- `<p>Items: {{ count }}</p>` and `<p>Total: {{ total }}</p>` (for example `Total: 165`)
- a button `Add Keyboard` that adds `{ id: 1, name: 'Keyboard', price: 120 }`
- a button `Add Mouse` that adds `{ id: 2, name: 'Mouse', price: 45 }`
- one `<li>` per item with the text `Keyboard x 2` (name, ` x `, quantity)
