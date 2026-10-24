Complete the `Cart` component in `app.ts` (selector `app-cart`). The `items` and `taxRate` signals and the template already exist.

1. Add the computed signals:
   - `itemCount`: sum of all `quantity` values.
   - `subtotal`: sum of `price × quantity`.
   - `tax`: `subtotal() × taxRate()`.
   - `total`: `subtotal() + tax()`.
2. Implement `add(name, price)`: when an item with that `name` exists, increase its `quantity` by 1; otherwise append `{ name, price, quantity: 1 }`. Always produce a **new array** (immutable update with `update`).
3. Implement `remove(name)`: remove the item with that name (immutably).
4. In the constructor, create an `effect()` that:
   - sets `document.title` to `Cart (<itemCount>)`, e.g. `Cart (3)`;
   - saves `JSON.stringify(items())` in `localStorage` under the key `cart`.

Initial cart: Keyboard $120 × 1 and Mouse $45 × 2 → subtotal `210.00`, tax `21.00`, total `231.00`.
