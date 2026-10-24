The pricing helpers below were written in a hurry with `any` everywhere. Give them precise annotations and finish the missing pieces. `any` is not allowed anywhere in your code.

1. `calculateDiscount(price: number, percent: number): number` returns the price after removing `percent` percent, rounded to 2 decimals (the existing body already does the math).
2. `formatPrice` is an arrow function `(amount: number, currency: string) => string` that returns `"<currency> <amount with 2 decimals>"`, e.g. `formatPrice(5, 'USD')` → `"USD 5.00"`.
3. Write `async function loadPrice(productId: number): Promise<number>` that returns the price stored in `catalog` and throws `new Error('Unknown product <id>')` when the id is missing.

```ts
calculateDiscount(200, 15); // 170
await loadPrice(2);         // 45
await loadPrice(99);        // rejects with "Unknown product 99"
```
