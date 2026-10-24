## type: ShirtSize is the union of the three sizes and shirtPrices covers each one

```ts
type _1 = Expect<Equal<ShirtSize, 'small' | 'medium' | 'large'>>;
type _2 = Expect<Equal<keyof typeof shirtPrices, ShirtSize>>;
const smallPrice: number = shirtPrices.small;
```

## type: StockLevels accepts any SKU with numeric values only

```ts
const stock: StockLevels = { 'KB-01': 3, 'MS-02': 0 };
stock['NEW-SKU'] = 5;
// @ts-expect-error
stock['KB-01'] = 'many';
```

## runtime: shirtPrices has the expected values

```js
assert.deepEqual(shirtPrices, { small: 19.9, medium: 21.9, large: 23.9 });
```

## runtime: totalUnits sums every SKU

```js
assert.equal(totalUnits({ 'KB-01': 3, 'MS-02': 4 }), 7); assert.equal(totalUnits({}), 0);
```

## runtime: restock adds units without mutating the input

```js
const stock = { 'KB-01': 3 };
assert.deepEqual(restock(stock, 'KB-01', 2), { 'KB-01': 5 });
assert.deepEqual(restock(stock, 'HD-03', 1), { 'KB-01': 3, 'HD-03': 1 });
assert.deepEqual(stock, { 'KB-01': 3 });
```
