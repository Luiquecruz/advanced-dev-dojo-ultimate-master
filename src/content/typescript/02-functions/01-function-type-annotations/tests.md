## type: calculateDiscount and formatPrice have precise signatures

```ts
type _discount = Expect<Equal<typeof calculateDiscount, (price: number, percent: number) => number>>;
type _format = Expect<Equal<typeof formatPrice, (amount: number, currency: string) => string>>;
```

## runtime: calculateDiscount removes the percentage and formatPrice prints two decimals

```js
assert.equal(calculateDiscount(200, 15), 170); assert.equal(calculateDiscount(19.99, 10), 17.99); assert.equal(calculateDiscount(50, 0), 50); assert.equal(formatPrice(5, 'USD'), 'USD 5.00'); assert.equal(formatPrice(17.991, 'EUR'), 'EUR 17.99');
```

## type: loadPrice returns Promise<number>

```ts
type _ = Expect<Equal<typeof loadPrice, (productId: number) => Promise<number>>>;
```

## runtime: loadPrice resolves known prices and rejects unknown ids

```js
assert.equal(await loadPrice(2), 45); await assert.rejects(loadPrice(99), 'Unknown product 99');
```

## forbid: Does not use any

```regex
\bany\b
```
