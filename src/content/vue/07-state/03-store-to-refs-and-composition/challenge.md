Compose two stores and consume them from a component without losing reactivity.

`products.ts` exports `useProductsStore` with `products`, a `byId` getter (`byId(id)` returns a `Product` or `undefined`) and a `setPrice(id, price)` action.

**`cart.ts`** — `useCartStore` keeps the product `ids` in the cart. Complete it:

1. Call `useProductsStore()` **inside** the setup function.
2. `items`: a computed list of the `Product` objects for each id (in insertion order, duplicates allowed), resolved with `byId`.
3. `total`: a computed sum of the items' `price`. Because it reads from the products store, a price change there must update the total.

**`CartSummary.vue`** — the current destructuring breaks reactivity. Use `storeToRefs(cart)` to get `items` and `total` as refs, and destructure the `add` action directly from the store. The template must keep showing `Total: $N` and one `<li>` per item.
