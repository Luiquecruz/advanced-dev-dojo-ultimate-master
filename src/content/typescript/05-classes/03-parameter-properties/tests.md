## pattern: Declares the fields as parameter properties

```regex
constructor\s*\(\s*(public\s+)?readonly\s+id\s*:\s*number\s*,\s*public\s+name\s*:\s*string\s*,\s*private\s+(readonly\s+)?priceInCents\s*:\s*number
```

## forbid: No manual this.x = x assignments

```regex
this\.(id|name)\s*=\s*(id|name)\b
```

## type: Visibility matches the specification

```ts
const product = new Product(1, 'Keyboard', 12000);
product.name = 'Mechanical keyboard';
// @ts-expect-error id is readonly
product.id = 2;
// @ts-expect-error priceInCents is private
product.priceInCents;
```

## runtime: Constructor stores every property

```js
const product = new Product(7, 'Monitor', 34000);
assert.equal(product.id, 7);
assert.equal(product.name, 'Monitor');
assert.equal(product.formattedPrice(), '$340.00');
```

## runtime: applyDiscount reduces the price and rounds to cents

```js
const product = new Product(1, 'Keyboard', 12000);
product.applyDiscount(15);
assert.equal(product.formattedPrice(), '$102.00');
const mouse = new Product(2, 'Mouse', 4599);
mouse.applyDiscount(10);
assert.equal(mouse.formattedPrice(), '$41.39');
```
