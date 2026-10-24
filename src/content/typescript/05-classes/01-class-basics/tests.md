## type: ShoppingCart has typed fields and methods

```ts
type _ = [
  Expect<Equal<ShoppingCart['owner'], string>>,
  Expect<Equal<ShoppingCart['items'], CartItem[]>>,
  Expect<Equal<ShoppingCart['add'], (name: string, price: number, quantity?: number) => void>>,
  Expect<Equal<ShoppingCart['total'], () => number>>,
];
// @ts-expect-error the owner is required
new ShoppingCart();
```

## runtime: A new cart is empty

```js
const cart = new ShoppingCart('Ada');
assert.equal(cart.owner, 'Ada');
assert.deepEqual(cart.items, []);
assert.equal(cart.total(), 0);
assert.equal(cart.count(), 0);
```

## runtime: add stores items with a default quantity of 1

```js
const cart = new ShoppingCart('Ada');
cart.add('Keyboard', 120);
cart.add('Mouse', 45, 2);
assert.deepEqual(cart.items, [
  { name: 'Keyboard', price: 120, quantity: 1 },
  { name: 'Mouse', price: 45, quantity: 2 },
]);
```

## runtime: Adding the same item again increases its quantity

```js
const cart = new ShoppingCart('Ada');
cart.add('Mouse', 45, 2);
cart.add('Mouse', 45);
assert.equal(cart.items.length, 1);
assert.equal(cart.items[0].quantity, 3);
```

## runtime: total and count add up every item

```js
const cart = new ShoppingCart('Ada');
cart.add('Keyboard', 120);
cart.add('Mouse', 45, 2);
cart.add('Mouse', 45);
assert.equal(cart.count(), 4);
assert.equal(cart.total(), 255);
```

## runtime: Every cart has its own items array

```js
const first = new ShoppingCart('Ada');
const second = new ShoppingCart('Alan');
first.add('Monitor', 340);
assert.equal(second.items.length, 0);
assert.notEqual(first.items, second.items);
```
