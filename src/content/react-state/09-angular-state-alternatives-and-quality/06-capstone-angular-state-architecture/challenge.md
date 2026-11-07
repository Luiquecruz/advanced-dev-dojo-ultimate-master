Build the mini shop store in **`shop.ts`**. It exports the `Product` interface `{ id: number; name: string; price: number; category: string }`, the tokens `FETCH_PRODUCTS` (`() => Promise<Product[]>`) and `CART_STORAGE` (`{ getItem(key: string): string | null; setItem(key: string, value: string): void }`), and `ShopStore`, created with `signalStore({ providedIn: 'root' }, ...)`.

State and derived values:

1. State: `status` (`'idle' | 'loading' | 'ready' | 'error'`, starts `'idle'`), `products` (`[]`), `category` (`'all'`) and `quantities` (`Record<number, number>`, `{}`).
2. `visible`: the products of the selected category, or all for `'all'`.
3. `lines`: for each product (in product order) with a quantity above 0, `{ product, quantity, subtotal }` where `subtotal = price * quantity`. Quantities of unknown products are ignored.
4. `total`: the sum of the subtotals. `itemCount`: the sum of the quantities of the lines.

Methods:

5. `load()` does nothing while `status` is `'loading'`; otherwise it sets `'loading'`, calls `FETCH_PRODUCTS`, stores the products and sets `'ready'`; on rejection it sets `'error'` and keeps the previous products.
6. `setCategory(category)`, `add(id)` (quantity + 1) and `remove(id)` (quantity - 1, deleting the entry at 0; nothing happens when the product is not in the cart).

Persistence (key `'cart'`):

7. After every `add` and `remove` write `{"version":1,"quantities":{...}}` to `CART_STORAGE`.
8. When the store is created, restore the quantities from the storage with `withHooks`. Corrupt JSON, another version, or quantities that are not positive integers give an empty cart and never throw. Only the quantities are persisted.
