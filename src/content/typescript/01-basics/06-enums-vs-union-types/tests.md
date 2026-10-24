## forbid: Does not declare an enum

```regex
\benum\b
```

## type: OrderStatus is the union of the three values

```ts
type _ = Expect<Equal<OrderStatus, 'pending' | 'shipped' | 'delivered'>>;
```

## type: Plain string literals are accepted, unknown ones are not

```ts
canCancel('pending');
nextStatus(OrderStatus.Shipped);
// @ts-expect-error
canCancel('lost');
```

## runtime: The OrderStatus object keeps the same members

```js
assert.equal(OrderStatus.Pending, 'pending'); assert.equal(OrderStatus.Shipped, 'shipped'); assert.deepEqual(Object.values(OrderStatus), ['pending', 'shipped', 'delivered']); assert.equal(canCancel('pending'), true); assert.equal(canCancel('shipped'), false);
```

## runtime: nextStatus advances the order

```js
assert.equal(nextStatus('pending'), 'shipped'); assert.equal(nextStatus('shipped'), 'delivered'); assert.equal(nextStatus('delivered'), 'delivered');
```
