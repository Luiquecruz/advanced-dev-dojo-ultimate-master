Build a small price-processing toolkit with higher-order functions. `PriceTransform` is already defined as `(price: number) => number`.

1. `applyDiscount(percent: number): PriceTransform` returns a function that removes `percent` percent from a price (`applyDiscount(10)(200)` → `180`).
2. `addTax(rate: number): PriceTransform` returns a function that adds tax at the given rate (`addTax(0.2)(100)` → `120`).
3. `pipeline(...steps: PriceTransform[]): PriceTransform` returns a function that applies every step **from left to right**. With no steps it returns the price unchanged.
4. `countWhere(prices, predicate)` returns how many prices match the predicate. Fix the predicate type: its parameters must not be optional, so callbacks such as `(price) => price > 20` compile.

```ts
pipeline(applyDiscount(50), (price) => price + 10)(100); // 60
countWhere([10, 50, 120], (price) => price > 20);        // 2
countWhere([10, 50, 120], (_, index) => index > 0);      // 2
```
