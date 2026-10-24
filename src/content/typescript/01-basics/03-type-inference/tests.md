## runtime: cartTotal sums price × quantity

```js
assert.equal(cartTotal(cartItems), 210); assert.equal(cartTotal([]), 0); assert.equal(cartTotal([{ name: 'Monitor', price: 340, quantity: 3 }]), 1020);
```

## type: cartTotal's return type is inferred as number

```ts
type _ = Expect<Equal<ReturnType<typeof cartTotal>, number>>;
```

## forbid: cartTotal has no explicit return type annotation

```regex
function cartTotal\([^)]*\)\s*:
```

## forbid: The reduce callback parameters are not annotated

```regex
reduce\(\s*\([^)]*:
```

## type: discountCodes only accepts strings

```ts
discountCodes.push('FREESHIP');
// @ts-expect-error
discountCodes.push(10);
type _ = Expect<Equal<typeof discountCodes, string[]>>;
```
