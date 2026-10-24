1. Declare `items` as a typed field with an empty array initializer so each cart gets its own array.
2. In `add`, search `this.items` for an entry with the same name.
3. When found, increase its `quantity` and stop; otherwise push `{ name, price, quantity }`.
4. Compute `total` with `reduce`, multiplying price by quantity, and `count` by summing quantities.
