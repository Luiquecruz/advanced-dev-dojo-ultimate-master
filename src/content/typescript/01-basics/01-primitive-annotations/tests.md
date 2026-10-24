## type: productName accepts strings only

```ts
productName = "Mouse";
// @ts-expect-error
productName = 42;
```

## type: price accepts numbers only

```ts
price = 10;
// @ts-expect-error
price = "10";
```

## type: inStock accepts booleans only

```ts
inStock = false;
// @ts-expect-error
inStock = "yes";
```

## runtime: Values are correct

```js
assert.equal(productName, "Keyboard"); assert.equal(price, 199.9); assert.equal(inStock, true);
```

## pattern: Uses explicit annotations

```regex
:\s*string[\s\S]*:\s*number[\s\S]*:\s*boolean
```
