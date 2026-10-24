Share a shopping cart between two components through a root service.

**`cart.service.ts`**

1. Export a class `CartService` provided in the root injector (`@Injectable({ providedIn: 'root' })` or `@Service()`).
2. `items`: a read-only signal of `string[]`, starting empty.
3. `count`: a computed signal with the number of items.
4. `add(item: string)`: appends the item (create a new array).
5. `clear()`: empties the cart.

**`app.ts`**

1. `ProductList` (selector `app-product-list`) injects `CartService` with `inject()` and renders two buttons: `Add Keyboard` and `Add Mouse`, which call `add('Keyboard')` and `add('Mouse')`.
2. `CartBadge` (selector `app-cart-badge`) injects the same service and renders `<p>Items: N</p>` plus a `Clear` button.
3. `App` (selector `app-root`) renders both components.

Do not list `CartService` in any component `providers`: both components must receive the same instance.
