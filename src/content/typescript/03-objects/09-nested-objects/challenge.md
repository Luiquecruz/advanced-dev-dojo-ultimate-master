`OrderLine` and `ShippingAddress` are declared.

1. Complete `interface Order` with:
   - `customer: { name: string; address: ShippingAddress }`
   - `lines: OrderLine[]`
2. `orderTotalInCents(order: Order): number` — sum of `quantity * unitPriceInCents` over every line.
3. `countriesWithOrders(orders: Order[]): string[]` — the **unique** customer countries, sorted
   alphabetically.

```ts
orderTotalInCents(order); // 2 * 1500 + 1 * 999 = 3999
countriesWithOrders([brazilOrder, canadaOrder, anotherBrazilOrder]); // ['Brazil', 'Canada']
```
