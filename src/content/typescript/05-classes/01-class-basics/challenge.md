Build a small shopping cart class. The `CartItem` type is already declared.

Implement `class ShoppingCart`:

1. `owner: string` — set from the constructor: `new ShoppingCart('Ada')`.
2. `items: CartItem[]` — starts as an empty array, **one array per cart**.
3. `add(name: string, price: number, quantity = 1): void`
   - adds `{ name, price, quantity }` to `items`
   - if an item with the same `name` already exists, increase its `quantity` instead of adding a new entry
4. `total(): number` — sum of `price * quantity` for every item.
5. `count(): number` — sum of every `quantity`.

```ts
const cart = new ShoppingCart('Ada');
cart.add('Keyboard', 120);
cart.add('Mouse', 45, 2);
cart.add('Mouse', 45);
cart.items.length; // 2
cart.count();      // 4
cart.total();      // 255
```
