## type: The factories return PriceTransform functions

```ts
type _discount = Expect<Equal<ReturnType<typeof applyDiscount>, PriceTransform>>;
type _tax = Expect<Equal<ReturnType<typeof addTax>, PriceTransform>>;
type _pipeline = Expect<Equal<typeof pipeline, (...steps: PriceTransform[]) => PriceTransform>>;
```

## runtime: applyDiscount and addTax build working transforms

```js
assert.equal(applyDiscount(10)(200), 180); assert.equal(applyDiscount(0)(99), 99); assert.equal(addTax(0.2)(100), 120); assert.equal(addTax(0)(50), 50);
```

## runtime: pipeline applies steps from left to right

```js
assert.equal(pipeline(applyDiscount(50), (price) => price + 10)(100), 60); assert.equal(pipeline((price) => price + 10, applyDiscount(50))(100), 55); assert.equal(pipeline()(42), 42);
```

## type: countWhere accepts callbacks that use fewer parameters

```ts
countWhere([1, 2], (price) => price > 1);
countWhere([1, 2], (price, index) => price > index);
countWhere([1, 2], () => true);
// @ts-expect-error
countWhere([1, 2], (price: string) => price.length > 0);
```

## runtime: countWhere counts matching prices

```js
assert.equal(countWhere([10, 50, 120], (price) => price > 20), 2); assert.equal(countWhere([10, 50, 120], (_, index) => index > 0), 2); assert.equal(countWhere([], () => true), 0);
```
