The shop works, but one `ShopContext` carries the user, the cart items and every function, in a new object on every render. Adding a product re-renders the user badge and every product card; signing out re-renders every cart reader. Fix the provider so each component re-renders **only for the data it uses**. The tests count renders of small consumer components.

Keep the public API (the tests use only these exports): `products`, `ShopProvider({ children, initialUser })`, `useUser()`, `useCart()`, `useCartActions()`, `UserBadge`, `CartSummary`, `ProductCard` and the default `App`.

| Hook | Returns |
| --- | --- |
| `useUser()` | `{ user, signIn(name), signOut() }` |
| `useCart()` | `{ items, count, total }` (count of units and sum of `price × quantity`) |
| `useCartActions()` | `{ addItem(product), removeItem(id), clear() }` |

Requirements:

1. Split the single context into three: user, cart state, cart actions. Each hook reads only its own context and still throws outside `ShopProvider`.
2. Memoize every value. Compute `count` and `total` once in the provider.
3. The cart actions object never changes identity.
4. Observable results:
   - A component using only `useUser()` does not re-render when the cart changes.
   - A component using only `useCartActions()` does not re-render when the cart changes.
   - A component using only `useCart()` does not re-render when the user signs out.
   - A `memo` component using all three hooks does not re-render when the provider's parent re-renders for unrelated reasons.
