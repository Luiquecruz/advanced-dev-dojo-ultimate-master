Build the pricing core of a shop as pure functions. Prices are **integer cents**. No function may mutate its arguments (the tests freeze every input) and none may read the clock, randomness or globals.

Types (already in the starter):

```ts
interface CartItem { sku: string; unitPrice: number; quantity: number }
interface Cart { items: readonly CartItem[] }
interface PriceSummary { subtotal: number; discount: number; shipping: number; total: number }
type PricingRule = (summary: PriceSummary) => PriceSummary;
```

Export these functions:

| Function | Behavior |
| --- | --- |
| `addItem(cart, item)` | Returns a new cart. When an item with the same `sku` exists, its `quantity` grows by `item.quantity` (keeping its position); otherwise `item` is appended. |
| `removeItem(cart, sku)` | Returns a new cart without that `sku`. |
| `subtotal(cart)` | Sum of `unitPrice * quantity` (already implemented). |
| `pipe(...fns)` | Returns a function that applies `fns` left to right. `pipe()` returns its input unchanged. |
| `percentOff(percent)` | Returns a rule that adds `Math.round(subtotal * percent / 100)` to `discount`. |
| `freeShippingOver(threshold)` | Returns a rule that sets `shipping` to `0` when `subtotal >= threshold`; otherwise the summary is unchanged. |
| `priceCart(cart, rules = [], shipping = 500)` | Starts from `{ subtotal, discount: 0, shipping, total: 0 }`, applies the rules in order with `pipe`, and returns the result with `total = Math.max(0, subtotal - discount) + shipping`. |

Rules always return a **new** summary object.
