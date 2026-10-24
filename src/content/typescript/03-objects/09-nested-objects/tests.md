## type: Order has a customer with address and a list of lines

```ts
type _ = [
  Expect<Equal<Order['customer']['name'], string>>,
  Expect<Equal<Order['customer']['address'], ShippingAddress>>,
  Expect<Equal<Order['lines'], OrderLine[]>>,
];
```

## type: Functions have the expected signatures

```ts
type _ = [
  Expect<Equal<typeof orderTotalInCents, (order: Order) => number>>,
  Expect<Equal<typeof countriesWithOrders, (orders: Order[]) => string[]>>,
];
```

## runtime: orderTotalInCents sums every line

```js
const order = {
  id: 'o1',
  customer: { name: 'Ana', address: { city: 'Recife', country: 'Brazil' } },
  lines: [
    { productName: 'Mug', quantity: 2, unitPriceInCents: 1500 },
    { productName: 'Tea', quantity: 1, unitPriceInCents: 999 },
  ],
};
assert.equal(orderTotalInCents(order), 3999);
assert.equal(orderTotalInCents({ ...order, lines: [] }), 0);
```

## runtime: countriesWithOrders returns unique sorted countries

```js
const build = (id, country) => ({ id, customer: { name: id, address: { city: 'City', country } }, lines: [] });
assert.deepEqual(countriesWithOrders([build('a', 'Canada'), build('b', 'Brazil'), build('c', 'Canada')]), ['Brazil', 'Canada']);
assert.deepEqual(countriesWithOrders([]), []);
```

## forbid: Does not use any

```regex
\bany\b
```
