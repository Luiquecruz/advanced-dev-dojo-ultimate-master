Declare the field with an initializer: `items: CartItem[] = [];`. The initializer runs once per instance.
---
In `add`, look for an existing entry with `this.items.find((item) => item.name === name)`. If it exists, change its `quantity`; otherwise `push` a new object.
---
`total` and `count` are both `reduce` calls starting at `0`: `this.items.reduce((sum, item) => sum + item.price * item.quantity, 0)`.
