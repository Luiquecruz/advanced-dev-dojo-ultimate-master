Replace the placeholder signals with computed ones: `readonly subtotal = computed(() => this.items().reduce((sum, item) => sum + item.price * item.quantity, 0));`. `tax` and `total` can read other computed signals.
---
For `add`, decide inside `update`: `items.some(i => i.name === name) ? items.map(...) : [...items, { name, price, quantity: 1 }]`. Inside `map`, return `{ ...item, quantity: item.quantity + 1 }` for the match.
---
In the constructor: `` effect(() => { document.title = `Cart (${this.itemCount()})`; localStorage.setItem('cart', JSON.stringify(this.items())); }); ``
