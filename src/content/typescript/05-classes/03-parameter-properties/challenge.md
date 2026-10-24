The starter declares `Product` the long way. Refactor it to use **parameter properties**:

1. `constructor(readonly id: number, public name: string, private priceInCents: number)` —
   `id` is public and readonly, `name` is public and writable, `priceInCents` is private.
2. Remove the separate field declarations and the `this.x = x` assignments.
3. Keep the methods working:
   - `formattedPrice(): string` returns the price in dollars with two decimals, e.g. `"$12.50"`
   - `applyDiscount(percent: number): void` reduces `priceInCents` by the given percentage, rounded to the
     nearest cent (`Math.round`)

```ts
const product = new Product(1, 'Keyboard', 12000);
product.formattedPrice();  // "$120.00"
product.applyDiscount(15);
product.formattedPrice();  // "$102.00"
```
